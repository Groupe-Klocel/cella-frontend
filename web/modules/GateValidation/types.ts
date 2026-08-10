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

import { AppointmentStatusCodes } from '@helpers';

// The subset of appointment statuses the gate screens act on. Resolved once through the shared
// `resolveAppointmentStatusCodes` helper rather than with per-screen regexes — see
// web/helpers/utils/appointmentStatuses.ts for why (the old `/on.?site/i` test also matched
// "On Site Waiting"). Every member is optional: a warehouse may not have created the newer
// status rows yet, and the screens degrade instead of throwing.
export type GateStatusCodes = Pick<
    AppointmentStatusCodes,
    'submitted' | 'confirmed' | 'documentsPending' | 'onSiteWaiting' | 'onSite' | 'cancelled'
>;

export interface GateEntry {
    id: string;
    name?: string | null;
    status: number;
    statusText?: string | null;
    appointmentType?: number | null;
    appointmentTypeText?: string | null;
    truckLicensePlate?: string | null;
    trailerLicensePlate?: string | null;
    driverName?: string | null;
    driverPhoneNumber?: string | null;
    entityName?: string | null;
    entityAccountingCode?: string | null;
    denyReason?: string | null;
    // Real Appointment column (not `extras`): the pager handed to a driver sent to the waiting area.
    pagerNumber?: string | null;
    // outbound only: hours already driven, declared by the driver at the kiosk
    driverDrivingTime?: number | null;
    appointmentDateBegin?: string | null;
    appointmentDateEnd?: string | null;
    extraText1?: string | null;
    locationName?: string | null;
    locationId?: string | null;
    extras?: any;
}

export type GateDecision =
    | 'pending'
    | 'waiting' // parked in the yard with a pager, not yet cleared for the dock
    | 'awaiting-documents' // denied for now; entry resumes once the papers are attached
    | 'approved'
    | 'refused';

// Selection set shared by the dashboard list and the detail screen.
export const GATE_ENTRY_FIELDS = `
    id name status statusText appointmentType appointmentTypeText
    truckLicensePlate trailerLicensePlate driverName driverPhoneNumber entityName
    entityAccountingCode denyReason pagerNumber driverDrivingTime
    appointmentDateBegin appointmentDateEnd extraText1 extras
    locationId location { name }
`;

/**
 * Bucket a gate entry by its decision, given the resolved status codes.
 *
 * The order of the tests is load-bearing:
 *  - `awaiting-documents` must come before `refused`, because denying for missing papers also
 *    writes `denyReason` — without this ordering every blocked truck would read as turned away.
 *  - `waiting` must come before `approved`, because a truck parked in the yard IS on site.
 *  - both new states are matched on the STATUS first and only fall back to
 *    `extras.gateCheckIn.decision` when the warehouse has no such status row. That inverts the
 *    convention used by `approved`/`refused` on purpose: `decision` is a historical stamp, so once
 *    the recovery flips the status back to Confirmed a stale `decision: 'awaiting-documents'`
 *    would otherwise pin the entry in the documents queue forever.
 */
export const classifyGateEntry = (entry: GateEntry, codes: GateStatusCodes): GateDecision => {
    const gate = entry.extras?.gateCheckIn ?? {};
    if (
        codes.documentsPending != null
            ? entry.status === codes.documentsPending
            : gate.decision === 'awaiting-documents'
    ) {
        return 'awaiting-documents';
    }
    if (
        codes.onSiteWaiting != null
            ? entry.status === codes.onSiteWaiting
            : gate.decision === 'waiting'
    ) {
        return 'waiting';
    }
    if (gate.decision === 'approved' || (codes.onSite && entry.status === codes.onSite)) {
        return 'approved';
    }
    if (gate.decision === 'refused' || entry.denyReason) {
        return 'refused';
    }
    return 'pending';
};
