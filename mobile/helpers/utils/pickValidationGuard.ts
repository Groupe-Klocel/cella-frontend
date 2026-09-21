/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/

// Redmine #36084 — anti-replay for the RF picking validation calls.
//
// WHAT WENT WRONG IN PRODUCTION. The picking flows freeze a snapshot of the advised quantities
// when the round is taken (`step10.data.proposedRoundAdvisedAddresses`) and send that snapshot to
// `RF_pick_validate` / `RF_pickAndPack_validate` from a `useEffect(..., [])`, i.e. on mount. The
// server function decrements `roundAdvisedAddress.quantity` by the *received* value with no
// re-read and no lower bound, so replaying the very same payload writes `0 - 2 = -2` and
// re-increments `roundLine.processedQuantity`. Measured on 5 rounds on 2026-08-20: the two calls
// are 23 to 90 s apart, the snapshot is byte-identical, and the auth token is renewed in between
// in 5 cases out of 5 — a client re-send after re-authentication, not a double tap.
//
// HOW THE REPLAY REACHES THE COMPONENT AGAIN. `mobile/components/layouts/AppLayout.tsx` mirrors
// every RF process slice into secure-ls with a 1 s debounce and restores it into `AppContext` on
// mount. When the session expires mid-validation the operator is bounced to /login; after
// re-authenticating, the *pre-call* slice is restored, the step machine lands back on the
// auto-validate step and the mount effect fires the frozen payload a second time. A `useRef`
// cannot see that: it is a brand-new component instance. So the guard has to live where the
// replayed state itself lives — the `AppContext` process slice, which is exactly what gets
// persisted and restored.
//
// TWO COMPLEMENTARY LOCKS, and both are needed:
//   1. `buildPickValidationKey` — the identity of one validation request. The key includes the
//      advised-address ids, *their snapshot quantities* and the picked quantity. The snapshot
//      quantity is what makes split picking keep working: picking 2 units in two passes of 1
//      refreshes step10 between the passes (advised quantity 2 then 1), so the two passes carry
//      different keys, while a replay of the first pass carries the exact same key. That is the
//      discriminant the production analysis validated with 5/5 sensitivity and specificity.
//   2. `refreshAdvisedAddressQuantities` — a re-read of the advised addresses right before the
//      call, bounding the client snapshot by what the database still holds. This is what catches
//      a replay whose key was lost (a slice restored from before the guard was written) and, more
//      generally, any stale snapshot: nothing can be sent above the remaining quantity, and
//      nothing at all is sent when the remaining quantity is zero.
//
// The key is stored *before* the request is issued, so the debounced secure-ls write carries it;
// it is dropped for free on success, because `handlePick*ProcessResult` replaces the whole process
// slice with a freshly-read round.

import { gql } from 'graphql-request';

export interface AdvisedAddressQuantity {
    id: string;
    quantity: number;
}

// Custom field added to the RF process slice (state[processName]) — persisted and restored with it
export const PICK_VALIDATION_GUARD_FIELD = 'sentPickValidations';

// Keeps the persisted slice small; a round never chains more than a handful of validations before
// the slice is replaced by the post-validation round read
const GUARD_HISTORY_SIZE = 10;

export const buildPickValidationKey = (
    roundId: string | undefined,
    advisedAddresses: AdvisedAddressQuantity[] | undefined,
    movingQuantity: number | undefined
): string =>
    [
        roundId ?? '-',
        (advisedAddresses ?? [])
            .map((advised: any) => `${advised?.id}:${Number(advised?.quantity ?? 0)}`)
            .sort()
            .join(','),
        String(movingQuantity ?? '-')
    ].join('|');

export const isPickValidationAlreadySent = (storedObject: any, key: string): boolean => {
    const sent = storedObject?.[PICK_VALIDATION_GUARD_FIELD];
    return Array.isArray(sent) && sent.includes(key);
};

export const withPickValidationSent = (storedObject: any, key: string): string[] => {
    const sent = storedObject?.[PICK_VALIDATION_GUARD_FIELD];
    const current: string[] = Array.isArray(sent) ? sent : [];
    if (current.includes(key)) return current;
    return [...current, key].slice(-GUARD_HISTORY_SIZE);
};

const roundAdvisedAddressQuantitiesQuery = gql`
    query roundAdvisedAddressQuantities($filters: RoundAdvisedAddressSearchFilters!) {
        roundAdvisedAddresses(filters: $filters) {
            count
            results {
                id
                quantity
            }
        }
    }
`;

// Reads the advised addresses back from the database. Returns id -> quantity; an id absent from
// the answer is absent from the map (and reported as missing by the caller below).
export const fetchAdvisedAddressQuantities = async (
    graphqlRequestClient: any,
    ids: string[]
): Promise<Map<string, number>> => {
    const result = await graphqlRequestClient.request(roundAdvisedAddressQuantitiesQuery, {
        filters: { id: ids }
    });
    const rows = result?.roundAdvisedAddresses?.results ?? [];
    return new Map<string, number>(
        rows.map((row: any) => [row.id, Number(row.quantity ?? 0)] as [string, number])
    );
};

export interface RefreshedAdvisedAddresses<T> {
    // same objects as the snapshot, with `quantity` bounded by the database value
    advisedAddresses: T[];
    // total quantity that may still legitimately be picked
    availableQuantity: number;
    // snapshot ids the database no longer knows about
    missingIds: string[];
}

// Bounds each snapshot quantity by what the database still holds: min(snapshot, max(db, 0)).
// A never-negative result is what keeps `quantity - N` on the server side from going below zero,
// and it is a no-op in the normal case where the snapshot matches the database.
export const refreshAdvisedAddressQuantities = <T extends AdvisedAddressQuantity>(
    snapshot: T[] | undefined,
    dbQuantities: Map<string, number>
): RefreshedAdvisedAddresses<T> => {
    const missingIds: string[] = [];
    const advisedAddresses = (snapshot ?? []).map((advised: T) => {
        if (!dbQuantities.has(advised.id)) {
            missingIds.push(advised.id);
        }
        const dbQuantity = Math.max(Number(dbQuantities.get(advised.id) ?? 0), 0);
        return { ...advised, quantity: Math.min(Number(advised.quantity ?? 0), dbQuantity) };
    });

    return {
        advisedAddresses,
        availableQuantity: advisedAddresses.reduce(
            (total: number, advised: T) => total + Number(advised.quantity ?? 0),
            0
        ),
        missingIds
    };
};

// A `messages:` key renders as its own raw key until a translation row exists in the database
// (see helpers/utils/TranslationFromDB.ts — the static catalogs are not consulted). Until the
// three rows below are created, fall back to the platform's own fallback language (en-US) rather
// than showing `messages:pick-...` on the terminal.
export const pickValidationMessages = {
    alreadySent: {
        key: 'messages:pick-validation-already-sent',
        fallback: 'This pick has already been validated, it will not be sent again'
    },
    nothingLeftToPick: {
        key: 'messages:pick-nothing-left-to-pick',
        fallback: 'Nothing left to pick at this advised address, please take the round again'
    },
    quantityAdjusted: {
        key: 'messages:pick-quantity-adjusted',
        fallback: 'Quantity reduced to what is still to be picked at this advised address'
    }
};

export const translatePickValidationMessage = (
    t: (key: string, options?: any) => string,
    message: { key: string; fallback: string }
): string => {
    const translated = t(message.key);
    return !translated || translated === message.key ? message.fallback : translated;
};

// The server-side counterpart of this fix (RF_pick_validate v3, RF_pickAndPack_validate v8,
// declare_missing_quantity v4) refuses a replayed payload with output.status = 'KO' and this code.
// `errors:500` has no translation row, and `handlePick*ProcessResult` shows `t('errors:<code>')`
// straight to the operator, so without this the terminal would display the raw key.
const SERVER_REFUSED_REPLAY_CODE = '500';

export const serverErrorMessages = {
    refusedReplay:
        'Pick refused by the server (code 500) — nothing was written. Take the round again to get the up-to-date quantities.',
    unknown: 'Pick refused by the server'
};

// Wraps the translation function so an `errors:<code>` key with no row in the database renders as
// a sentence instead of as itself. Transparent for every other key and for codes that do have a row.
export const withReadableErrorCodes =
    (t: (key: string, options?: any) => string) =>
    (key: string, options?: any): string => {
        const translated = t(key, options);
        if (translated !== key || !key.startsWith('errors:')) {
            return translated;
        }
        const code = key.slice('errors:'.length);
        return code === SERVER_REFUSED_REPLAY_CODE
            ? serverErrorMessages.refusedReplay
            : `${serverErrorMessages.unknown} (${code})`;
    };

// Releases the key when the validation did NOT go through. A failed call wrote nothing, so the
// operator must be able to send the very same pick again: keeping the key would answer the retry
// with "already validated" and strand the round (worse than the replay we are fixing). Dropping it
// is safe because the guard is only the second lock: the real protection is
// `refreshAdvisedAddressQuantities` above — if the first call did commit server-side, the re-read
// finds nothing left and refuses the retry on its own, key or no key. The key only ever protects
// against a pure remount replay, and a remount after a failure is a legitimate retry.
export const withoutPickValidationSent = (storedObject: any, key: string): string[] => {
    const sent = storedObject?.[PICK_VALIDATION_GUARD_FIELD];
    const current: string[] = Array.isArray(sent) ? sent : [];
    return current.filter((sentKey: string) => sentKey !== key);
};

// The two failure shapes `handlePick*ProcessResult` turns into an error toast without writing
// anything: a function-level ERROR and a business-level KO. Checked by the callers *before* handing
// the result over, so the guard can be released for those two paths and only for those two.
export const isFailedPickValidationResult = (result: any): boolean =>
    result?.executeFunction?.status === 'ERROR' || result?.executeFunction?.output?.status === 'KO';

// Redmine #36084 — getting the operator out of the refused line instead of leaving him on it.
//
// WHAT WAS WRONG WITH `onBack()` ON A REFUSAL. Every refusal path above ended on the step
// machine's plain back action, which pops one step and leaves `step10` — the frozen snapshot —
// untouched. Measured on the Eminza staging warehouse with a multi-line round:
//   * on `pick` the operator landed back on the quantity step of the SAME already-picked advised
//     address; re-validating was refused again, three times out of three, and it took three
//     presses of Back to reach the round selection;
//   * on `pick-and-pack` it was worse: he landed on the destination-HU step and Back cycled
//     between the location and article steps for ever (eight presses, same screen), because the
//     round-selection step is never reachable again from there once the location resolves itself.
// In both cases the flow NEVER moved on to the next line of the round on its own: the operator was
// looping on the one line the refusal exists to protect.
//
// WHY GOING BACK TO THE ROUND SELECTION IS THE FIX. These refusals all mean one single thing: the
// snapshot frozen at step 10 no longer matches the database. Anything rebuilt from that snapshot is
// wrong, the next advised address included, so the only sound recovery is to read the round again —
// which is exactly what selecting the round does, and exactly what the message already asks for
// ("please take the round again"). Replacing the whole process slice also drops the anti-replay
// keys and `ignoreHUContentIds` for free, so the retake starts clean.
//
// The shape below is the one `handlePickRoundClosure` / `handleRoundClosure` already use for their
// "round is done, pick another one" branch: keep the scanned equipment (step 5) and land on the
// round selection (step 10). The operator is one tap away from the correct next line instead of
// stuck in a loop.
export const buildRoundSelectionSlice = (storedObject: any): any => {
    const slice: any = { currentStep: 10 };
    if (storedObject?.step5?.data) {
        slice.step5 = { previousStep: 0, data: storedObject.step5.data };
        slice.step10 = { previousStep: 5 };
    } else {
        slice.step10 = { previousStep: 0 };
    }
    return slice;
};

// True when the server refused the validation with the code its anti-replay guard uses
// (`RF_pick_validate` v3 / `RF_pickAndPack_validate` v8: "pick already validated, or quantity
// greater than what is left"). That refusal proves the client snapshot is stale, so it gets the
// same recovery as the two front-side refusals. Any OTHER business KO — a closed handling unit, a
// missing location — keeps the plain back action: those are not staleness, and forcing the operator
// to take the round again would cost him the equipment scan for nothing.
export const isStaleSnapshotServerRefusal = (result: any): boolean =>
    result?.executeFunction?.status === 'OK' &&
    result?.executeFunction?.output?.status === 'KO' &&
    String(result?.executeFunction?.output?.output?.code ?? '') === SERVER_REFUSED_REPLAY_CODE;
