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

// Single place that maps the DB `appointment_status` config rows to named codes.
//
// WHY THIS EXISTS. Screens used to resolve a status with an ad-hoc loose regex plus
// `configs.find(...)`. That is unsafe as soon as two rows can match the same regex, because
// `getConfigs()` in AppLayout issues `configs(filters: {}, itemsPerPage: 999999999)` with **no
// `orderBy`** — rows come back ordered by `id`, which is a random 12-char nanoid. So `find`
// does not return "the first status" in any meaningful sense, it returns whichever matching row
// drew the lexically smallest random id. Two rows matching one regex is therefore a coin flip
// that resolves differently per environment and can flip between page loads.
//
// HOW IT IS MADE SAFE. Three tiers, evaluated breadth-first across all keys, and each matched
// row is *claimed* so a loose pattern can never steal a row belonging to a more specific key:
//
//   1. `extras.statusRole` — an exact opt-in marker. Only the newer rows carry it, so this is
//      additive: the eleven pre-existing rows are untouched and no data migration is needed.
//   2. exact normalised `value` — order-independent by construction.
//   3. the legacy loose regexes, restricted to rows still unclaimed — so every pre-existing
//      status keeps resolving exactly as it does today.
//
// The newer status rows are additionally given `value` strings that match NONE of the legacy
// regexes ("Waiting Area", not "On Site Waiting"). That matters beyond this file: it is what
// protects the call sites we deliberately do not refactor, and the SPE-totem'd copies of those
// files in customer repos which will never receive this fix.
//
// Mirror of mobile/helpers/utils/appointmentStatuses.ts — keep both in sync.

import { ConfigOrParamItem } from './visitorManagement';

export const APPOINTMENT_STATUS_SCOPE = 'appointment_status';

export type AppointmentStatusKey =
    | 'inCreation'
    | 'submitted'
    | 'confirmed'
    | 'documentsPending'
    | 'onSiteWaiting'
    | 'onSite'
    | 'arrivedAtDock'
    | 'loadingStarted'
    | 'loadingFinished'
    | 'completed'
    | 'refused'
    | 'noShow'
    | 'cancelled';

export type AppointmentStatusCodes = Partial<Record<AppointmentStatusKey, number>>;

// `extras.statusRole` values, carried only by the rows added for the gate-waiting /
// awaiting-documents flows. Kept as constants so the seed data and the code cannot drift.
export const STATUS_ROLE_ON_SITE_WAITING = 'on_site_waiting';
export const STATUS_ROLE_DOCUMENTS_PENDING = 'documents_pending';

const ROLE_BY_KEY: Partial<Record<AppointmentStatusKey, string>> = {
    onSiteWaiting: STATUS_ROLE_ON_SITE_WAITING,
    documentsPending: STATUS_ROLE_DOCUMENTS_PENDING
};

// Tier 2 — exact normalised `value`. Several spellings per key because `value` is
// customer-authored and some warehouses translate it.
const EXACT_VALUES: Partial<Record<AppointmentStatusKey, string[]>> = {
    inCreation: ['in creation', 'en creation', 'en création'],
    submitted: ['submitted', 'soumis'],
    confirmed: ['confirmed', 'confirmé', 'confirme'],
    documentsPending: ['documents pending', 'documents missing', 'documents attendus'],
    onSiteWaiting: ['waiting area', 'on site waiting', 'awaiting dock', 'zone d attente'],
    onSite: ['on site', 'sur site', 'vor ort'],
    arrivedAtDock: ['arrived at dock', 'arrivé au quai', 'arrive au quai'],
    loadingStarted: ['loading started', 'début de chargement', 'debut de chargement'],
    loadingFinished: ['loading finished', 'fin de chargement'],
    completed: ['completed', 'terminé', 'termine'],
    refused: ['refused', 'refusé', 'refuse'],
    noShow: ['no show', 'non présenté', 'non presente'],
    cancelled: ['cancelled', 'annulé', 'annule']
};

// Tier 3 — the legacy loose patterns, unchanged from the call sites they replace, so existing
// rows resolve byte-for-byte as before.
const LEGACY_MATCHERS: Partial<Record<AppointmentStatusKey, RegExp>> = {
    inCreation: /in.?creation|en.?cr[eé]ation|erfassung|creaci/i,
    submitted: /submit|soumis|eingereicht|enviado/i,
    confirmed: /confirm|best[aä]tigt/i,
    onSite: /on.?site|sur.?site|vor.?ort/i,
    arrivedAtDock: /arriv|angekommen|llegad/i,
    loadingStarted: /(load|charg|lad|carga).*(start|d[eé]but|begin|inicio)/i,
    loadingFinished: /(load|charg|lad|carga).*(finish|fin|ende|beendet)/i,
    completed: /complet|termin|finaliz|abgeschlossen/i,
    refused: /refus|deni|abgelehnt|rechaz/i,
    noShow: /no.?show|non.?pr[eé]sent|nicht.?erschienen|no.?presentad/i,
    cancelled: /cancel|annul|stornier|anulad/i
};

const ALL_KEYS: AppointmentStatusKey[] = [
    'inCreation',
    'submitted',
    'confirmed',
    'documentsPending',
    'onSiteWaiting',
    'onSite',
    'arrivedAtDock',
    'loadingStarted',
    'loadingFinished',
    'completed',
    'refused',
    'noShow',
    'cancelled'
];

const normalise = (value: string): string =>
    (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const toCode = (row: ConfigOrParamItem): number | undefined => {
    const code = parseInt(row.code, 10);
    return Number.isFinite(code) ? code : undefined;
};

/**
 * Resolve every known appointment status code from the DB configs.
 *
 * Missing statuses are simply absent from the result. Callers must treat `undefined` as "this
 * warehouse has not parameterized that status" and degrade — never build a GraphQL variable out
 * of it, since `JSON.stringify(NaN)` is `null` and the mutation would silently clear the status.
 */
export const resolveAppointmentStatusCodes = (
    configs: ConfigOrParamItem[] | undefined
): AppointmentStatusCodes => {
    const codes: AppointmentStatusCodes = {};
    // rows still up for grabs; claiming prevents a loose tier-3 pattern from stealing a row
    // that a precise tier-1/tier-2 rule already assigned to another key
    let pool = (configs ?? []).filter((c) => c.scope === APPOINTMENT_STATUS_SCOPE);

    const claim = (key: AppointmentStatusKey, row: ConfigOrParamItem) => {
        const code = toCode(row);
        if (code === undefined || codes[key] !== undefined) return;
        codes[key] = code;
        pool = pool.filter((candidate) => candidate !== row);
    };

    // tier 1 — explicit `extras.statusRole`
    ALL_KEYS.forEach((key) => {
        const role = ROLE_BY_KEY[key];
        if (!role) return;
        const row = pool.find((c) => c.extras?.statusRole === role);
        if (row) claim(key, row);
    });

    // tier 2 — exact normalised value
    ALL_KEYS.forEach((key) => {
        if (codes[key] !== undefined) return;
        const candidates = EXACT_VALUES[key];
        if (!candidates) return;
        const row = pool.find((c) => candidates.includes(normalise(c.value)));
        if (row) claim(key, row);
    });

    // tier 3 — legacy loose regexes over whatever is left
    ALL_KEYS.forEach((key) => {
        if (codes[key] !== undefined) return;
        const matcher = LEGACY_MATCHERS[key];
        if (!matcher) return;
        const row = pool.find((c) => matcher.test(c.value ?? ''));
        if (row) claim(key, row);
    });

    return codes;
};

/**
 * True for statuses that sit outside the linear progression: the truck is parked in the yard, or
 * blocked on paperwork. The planning screen sorts statuses by numeric code and treats "the next
 * code" as "the next step", so these must be skipped when proposing an advance — otherwise the
 * primary button on a Confirmed appointment would offer to deny it.
 *
 * Derived from the resolved role as well as `extras.offFlow`, so a customer who creates the row
 * without the `offFlow` flag still gets correct behaviour.
 */
export const isOffFlowAppointmentStatus = (config: ConfigOrParamItem | undefined): boolean => {
    if (!config) return false;
    if (config.extras?.offFlow === true) return true;
    const role = config.extras?.statusRole;
    return role === STATUS_ROLE_ON_SITE_WAITING || role === STATUS_ROLE_DOCUMENTS_PENDING;
};

/** The status codes a truck can no longer move on from. */
export const isFinalAppointmentStatus = (
    status: number | null | undefined,
    codes: AppointmentStatusCodes
): boolean =>
    status != null &&
    [codes.completed, codes.cancelled, codes.noShow, codes.refused].some(
        (c) => c != null && c === status
    );

/** The config row behind a status code, for its label / `extras.color` / `extras.icon`. */
export const getAppointmentStatusConfig = (
    configs: ConfigOrParamItem[] | undefined,
    status: number | string | null | undefined
): ConfigOrParamItem | undefined => {
    if (status === null || status === undefined) return undefined;
    return configs?.find(
        (c) => c.scope === APPOINTMENT_STATUS_SCOPE && parseInt(c.code, 10) === Number(status)
    );
};
