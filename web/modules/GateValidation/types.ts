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

export interface GateStatusCodes {
    confirmed: number;
    onSite: number;
    cancelled: number;
}

export interface GateEntry {
    id: string;
    name?: string | null;
    status: number;
    statusText?: string | null;
    appointmentTypeText?: string | null;
    truckLicensePlate?: string | null;
    trailerLicensePlate?: string | null;
    driverName?: string | null;
    driverPhoneNumber?: string | null;
    entityName?: string | null;
    denyReason?: string | null;
    appointmentDateBegin?: string | null;
    appointmentDateEnd?: string | null;
    extraText1?: string | null;
    extraNumber1?: number | null;
    locationName?: string | null;
    locationId?: string | null;
    extras?: any;
}

export type GateDecision = 'pending' | 'approved' | 'refused';

// Selection set shared by the dashboard list and the detail screen.
export const GATE_ENTRY_FIELDS = `
    id name status statusText appointmentTypeText
    truckLicensePlate trailerLicensePlate driverName driverPhoneNumber entityName denyReason
    appointmentDateBegin appointmentDateEnd extraText1 extraNumber1 extras
    locationId location { name }
`;

/** Bucket a gate entry by its decision, given the resolved status codes. */
export const classifyGateEntry = (entry: GateEntry, codes: GateStatusCodes): GateDecision => {
    const gate = entry.extras?.gateCheckIn ?? {};
    if (gate.decision === 'approved' || (codes.onSite && entry.status === codes.onSite)) {
        return 'approved';
    }
    if (gate.decision === 'refused' || entry.denyReason) {
        return 'refused';
    }
    return 'pending';
};
