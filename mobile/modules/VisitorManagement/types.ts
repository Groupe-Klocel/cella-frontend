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

// A visit is an Appointment whose type is the "visit" appointment_type config.
// Lightweight view of a visit as returned by the visitor search query.
export interface Visit {
    id: string;
    name?: string | null;
    status: number;
    statusText?: string | null;
    appointmentType?: number | null;
    driverName?: string | null;
    driverEmail?: string | null;
    driverPhoneNumber?: string | null;
    entityName?: string | null;
    contactName?: string | null;
    comment?: string | null;
    allowedZones?: string[] | string | null;
    escortRequired?: boolean | null;
    otherRequirements?: string | null;
    truckLicensePlate?: string | null;
    appointmentDateBegin?: string | null;
    appointmentDateEnd?: string | null;
    denyReason?: string | null;
    extras?: Record<string, any> | null;
}

// Data captured by the visitor registration form (step 30).
export interface VisitorRegistrationData {
    visitorName: string;
    companyName?: string;
    email?: string;
    phoneNumber?: string;
    licensePlate?: string;
    // Walk-in only: reason for the visit (-> comment), internal referent
    // (-> contactName) and desired destination zones (-> allowedZones).
    reason?: string;
    contactName?: string;
    zones?: string[];
}

// Visit status codes resolved at runtime from the tenant configuration.
export interface VisitStatusCodes {
    toBeChecked?: number;
    preRegistered?: number;
    checkedIn?: number;
    checkedOut?: number;
    cancelled?: number;
}

// A destination zone as declared in the `visit_zone` parameters scope.
export interface VisitZone {
    code: string;
    value: string;
    translation?: Record<string, string> | string | null;
}

// Find a numeric code in the configs reducer by scope + value pattern.
const findCode = (configs: any[], scope: string, re: RegExp): number | undefined => {
    const raw = (configs ?? []).find((c: any) => c.scope === scope && re.test(c.value ?? ''))?.code;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? undefined : parsed;
};

// The "visit" appointment type code (scope appointment_type, value ~ /visit/i).
export const resolveVisitTypeCode = (configs: any[]): number | undefined =>
    findCode(configs, 'appointment_type', /visit/i);

// Statuses come from the dedicated `visit_status` scope when it exists,
// otherwise fall back to the generic `appointment_status` scope (whose values
// are named differently, hence the fallback pattern).
const resolveStatus = (configs: any[], primary: RegExp, fallback: RegExp): number | undefined =>
    findCode(configs, 'visit_status', primary) ??
    findCode(configs, 'appointment_status', primary) ??
    findCode(configs, 'appointment_status', fallback);

export const resolveVisitStatusCodes = (configs: any[]): VisitStatusCodes => ({
    toBeChecked: resolveStatus(configs, /to.?be.?checked/i, /submit/i),
    preRegistered: resolveStatus(configs, /pre.?register/i, /confirm/i),
    checkedIn: resolveStatus(configs, /checked.?in/i, /on.?site|sur.?site|vor.?ort/i),
    checkedOut: resolveStatus(configs, /checked.?out/i, /complet/i),
    cancelled: resolveStatus(configs, /cancel|annul|stornier/i, /cancel|annul|stornier/i)
});

// Destination zones from the parameters reducer (scope `visit_zone`).
export const getVisitZones = (parameters: any[]): VisitZone[] =>
    (parameters ?? []).filter((p: any) => p.scope === 'visit_zone');

// Display label of a zone: translation for the kiosk language, else its value.
// (`translation` may come back as a JSON string depending on the transport.)
export const getZoneLabel = (zone: string, parameters: any[], language: string): string => {
    const param = getVisitZones(parameters).find((p) => p.value === zone);
    if (!param) return zone;
    let translation: any = param.translation;
    if (typeof translation === 'string') {
        try {
            translation = JSON.parse(translation);
        } catch (e) {
            translation = null;
        }
    }
    return translation?.[language] ?? param.value ?? zone;
};

// `allowedZones` may be a JSON array, a JSON-encoded string or a single value.
export const parseAllowedZones = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.filter((z: any) => typeof z === 'string' && z);
    if (typeof raw === 'string' && raw) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.filter((z: any) => typeof z === 'string' && z)
                : [raw];
        } catch (e) {
            return [raw];
        }
    }
    return [];
};
