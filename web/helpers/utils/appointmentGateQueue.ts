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

// Sending an appointment BACK into the gate queue after it was denied pending documents.
//
// Two screens offer this move — the appointment detail page and the planning agenda — and both must
// do more than set `status`. `classifyGateEntry` (and the kiosk poll) read a non-null `denyReason`
// as "refused", so a status-only write leaves the truck looking refused to the guard and the driver
// even though it is Confirmed again. Keeping that logic here is what stops the two screens from
// drifting apart.

import { gql } from 'graphql-request';

/**
 * Reads the appointment's CURRENT `extras` (and `denyReason`) straight from the API.
 *
 * Every write to `extras` must go through this rather than a page-state snapshot, because:
 *   - `extras` is a whole-object replace, so writing a partial object silently destroys the
 *     driver's `gateSignature` and `safetyChecklist`;
 *   - the kiosk rewrites `extras` while these screens sit open, so page state goes stale even
 *     once it has loaded;
 *   - on the detail page `extras` arrives from a separate side-query that may not have resolved
 *     yet when a button is clicked, which would spread `{}` over the real value.
 *
 * Returns `null` when the read fails, so callers can omit `extras` from their mutation rather than
 * overwrite it with a guess.
 */
export const readAppointmentExtras = async (
    graphqlRequestClient: any,
    id: string
): Promise<{ extras: Record<string, any>; denyReason: string | null } | null> => {
    try {
        const res: any = await graphqlRequestClient.request(
            gql`
                query appointment($id: String!) {
                    appointment(id: $id) {
                        id
                        denyReason
                        extras
                    }
                }
            `,
            { id }
        );
        return {
            extras: res?.appointment?.extras ?? {},
            denyReason: res?.appointment?.denyReason ?? null
        };
    } catch (e) {
        console.warn('[appointment] could not re-read extras before writing', e);
        return null;
    }
};

/**
 * Merges `patch` into the appointment's current `extras` and returns it as mutation input.
 *
 * Returns `null` — NOT an empty object — when the current `extras` could not be read. The
 * distinction matters: an empty patch is indistinguishable from "nothing to write", so a caller
 * whose patch IS the point of the operation (the reschedule reason, say) would otherwise report
 * success while silently discarding it. `null` forces the caller to choose between aborting and
 * carrying on without the patch.
 */
export const buildExtrasPatchInput = async (
    graphqlRequestClient: any,
    id: string,
    patch: Record<string, any>
): Promise<Record<string, any> | null> => {
    const current = await readAppointmentExtras(graphqlRequestClient, id);
    if (!current) return null;
    return { extras: { ...current.extras, ...patch } };
};

/**
 * Builds the extra mutation input that returns an appointment to the gate queue: clears
 * `denyReason` and resets the gate decision inside `extras`, preserving everything else in there.
 *
 * If the re-read fails, `extras` is omitted from the result — the status still moves and the deny
 * reason still clears, but nothing is overwritten with a guess.
 */
export const buildGateQueueReturnInput = async (
    graphqlRequestClient: any,
    id: string
): Promise<Record<string, any>> => {
    const base: Record<string, any> = { denyReason: null };
    const current = await readAppointmentExtras(graphqlRequestClient, id);
    if (!current) return base;
    return {
        ...base,
        extras: {
            ...current.extras,
            gateCheckIn: {
                ...(current.extras?.gateCheckIn ?? {}),
                pending: true,
                decision: null,
                // keep the original refusal text as history now that denyReason is cleared
                previousDenyReason: current.denyReason,
                documentsProvidedAt: new Date().toISOString()
            }
        }
    };
};
