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
import { gql } from 'graphql-request';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// `allowedZones` is a JSON column, and it does not always reach the UI as a clean array of codes:
// the generic list FLATTENS its records (helpers/utils/utils.ts) so an array collapses to a single
// value, and a column written by hand or by an import can hold a JSON string ('["Z1","Z2"]'), a
// JSON-encoded single value ('"Z1"') or a plain/comma-joined value ('Z1', 'Z1,Z2'). The API also
// wraps a scalar written into the column in a one-element list, so those encoded strings can sit
// INSIDE the array ('["[\"Z1\",\"Z2\"]"]', '["\"Z1\""]'): every element is normalised the same way
// as a top-level value. Every screen showing zones normalises through this, so a zone label never
// carries JSON quotes and an empty entry never reaches `getVisitZoneLabel`.
const toZoneList = (values: any[]): string[] =>
    values
        .map((zone) => (zone === null || zone === undefined ? '' : String(zone).trim()))
        .filter((zone) => zone !== '');

export const normalizeZones = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.flatMap(normalizeZones);
    // A bare number is one zone code, exactly like the JSON-encoded scalar below: the flattening
    // collapses an array of numeric codes to its last element, which then arrives as a number.
    if (typeof raw === 'number') return toZoneList([raw]);
    if (typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (trimmed === '') return [];
    try {
        // JSON.parse unwraps a JSON-encoded single value too: '"Z1"' -> 'Z1', never '"Z1"'.
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.flatMap(normalizeZones);
        // an object is not a zone list: nothing usable rather than its raw JSON as a label
        if (parsed !== null && typeof parsed === 'object') return [];
        return toZoneList([parsed]);
    } catch {
        // not JSON: a plain value, possibly several zones joined by commas
    }
    return toZoneList(trimmed.split(','));
};

const updateVisitMutation = gql`
    mutation updateVisitAppointment($id: String!, $input: UpdateAppointmentInput!) {
        updateAppointment(id: $id, input: $input) {
            id
            status
        }
    }
`;

const visitExtrasQuery = gql`
    query visitExtras($id: String!) {
        appointment(id: $id) {
            id
            extras
            extraText1
        }
    }
`;

// The generic list/detail components hand their records over FLATTENED (see helpers/utils/utils.ts):
// `extras` arrives as extras_visitorSignature / extras_safetyChecklist_* keys, never as the JSON
// object. Spreading `record.extras` from those screens therefore spreads `undefined` and the update
// wipes the signature and the accepted safety documents. Every write that has to preserve extras
// reads them back from the API first, and gives up on writing extras at all if that read fails.
const readVisitExtras = async (
    graphqlRequestClient: any,
    id: string
): Promise<{ extras: any; extraText1: string | null } | null> => {
    try {
        const res = await graphqlRequestClient.request(visitExtrasQuery, { id });
        const appointment = res?.appointment;
        if (!appointment) return null;
        return { extras: appointment.extras ?? {}, extraText1: appointment.extraText1 ?? null };
    } catch (e) {
        console.error('Error reading visit extras:', e);
        return null;
    }
};

// Check-out: the real exit time is the click time; it is mirrored in
// extraText2 so generic lists can display/sort it.
export const checkOutVisit = async (
    graphqlRequestClient: any,
    visit: { id: string; extras?: any },
    checkedOutStatus: number
) => {
    const now = new Date().toISOString();
    const current = await readVisitExtras(graphqlRequestClient, visit.id);
    const input: any = { status: checkedOutStatus, extraText2: now };
    if (current) {
        const extras = current.extras ?? {};
        // A visit can be entered and left several times (multi-day visit, or several passages in
        // the same day): extraText1/extraText2 only carry the LAST entry/exit, so each completed
        // passage is archived here before the next check-in overwrites them.
        const passages = Array.isArray(extras.visitPassages) ? extras.visitPassages : [];
        input.extras = {
            ...extras,
            visitorCheckOut: { at: now },
            visitPassages: [...passages, { in: current.extraText1 ?? null, out: now }]
        };
    }
    return graphqlRequestClient.request(updateVisitMutation, { id: visit.id, input });
};

export const cancelVisit = async (
    graphqlRequestClient: any,
    visit: { id: string; extras?: any },
    cancelledStatus: number,
    denyReason?: string
) => {
    return graphqlRequestClient.request(updateVisitMutation, {
        id: visit.id,
        input: {
            status: cancelledStatus,
            ...(denyReason ? { denyReason } : {})
        }
    });
};

// API dates are naive UTC strings ("2026-07-13T06:00:00"): read them as UTC, compare in local time.
const toLocal = (value?: string | null) => (value ? dayjs.utc(value).local() : null);

// True while `now` falls inside the visit's booked days. Day granularity on purpose: a visit booked
// 08:00 -> 12:00 that is re-entered at 14:00 is still the same visit (several entries and exits
// in the same day), and a multi-day visit stays open until the end of its last day.
// A visit with no end date (walk-in) is limited to the day it began.
export const isVisitWithinDateRange = (
    visit: { appointmentDateBegin?: string | null; appointmentDateEnd?: string | null } | null,
    now: dayjs.Dayjs = dayjs()
): boolean => {
    const begin = toLocal(visit?.appointmentDateBegin);
    if (!begin || !begin.isValid()) return false;
    const end = toLocal(visit?.appointmentDateEnd) ?? begin;
    const last = end.isValid() && end.isAfter(begin) ? end : begin;
    return !now.isBefore(begin.startOf('day')) && !now.isAfter(last.endOf('day'));
};
