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

// A visit is an appointment of type Visit: it reuses the appointment status
// codes but displays visitor-specific labels (scope visit_status) everywhere,
// without changing how truck appointments are displayed. All codes are
// resolved at runtime from the DB configs/parameters held in AppContext.

export type ConfigOrParamItem = {
    id?: string;
    scope: string;
    code: string;
    value: string;
    translation?: any;
    extras?: any;
};

export const VISIT_STATUS_SCOPE = 'visit_status';
export const VISIT_ZONE_SCOPE = 'visit_zone';
export const VISITOR_DOCUMENT_RULE = 'VISITOR_INFOS_DOCUMENTS';

export type VisitStatusCodes = {
    toBeChecked?: number;
    preRegistered?: number;
    checkedIn?: number;
    checkedOut?: number;
    cancelled?: number;
};

// visit_status is the visitor referential (same codes as appointment_status,
// visitor wording); appointment_status regexes are the fallback when the
// visit_status scope has not been parameterized yet on the warehouse.
const visitStatusMatchers: Array<{
    key: keyof VisitStatusCodes;
    visit: RegExp;
    appointment: RegExp;
}> = [
    { key: 'toBeChecked', visit: /to.?be.?checked/i, appointment: /submit/i },
    { key: 'preRegistered', visit: /pre.?register/i, appointment: /confirm/i },
    { key: 'checkedIn', visit: /checked.?in/i, appointment: /on.?site|sur.?site|vor.?ort/i },
    { key: 'checkedOut', visit: /checked.?out/i, appointment: /complet/i },
    { key: 'cancelled', visit: /cancel|annul|stornier/i, appointment: /cancel|annul|stornier/i }
];

const findCode = (
    items: ConfigOrParamItem[] | undefined,
    scope: string,
    matcher: RegExp
): number | undefined => {
    const item = items?.find((entry) => entry.scope === scope && matcher.test(entry.value));
    return item ? parseInt(item.code, 10) : undefined;
};

export const getVisitTypeCode = (configs: ConfigOrParamItem[] | undefined): number | undefined => {
    return findCode(configs, 'appointment_type', /visit/i);
};

export const getTruckTypeCodes = (configs: ConfigOrParamItem[] | undefined): number[] => {
    return (configs ?? [])
        .filter((entry) => entry.scope === 'appointment_type' && !/visit/i.test(entry.value))
        .map((entry) => parseInt(entry.code, 10))
        .filter((code) => !isNaN(code));
};

export const getVisitStatusCodes = (configs: ConfigOrParamItem[] | undefined): VisitStatusCodes => {
    const codes: VisitStatusCodes = {};
    visitStatusMatchers.forEach(({ key, visit, appointment }) => {
        codes[key] =
            findCode(configs, VISIT_STATUS_SCOPE, visit) ??
            findCode(configs, 'appointment_status', appointment);
    });
    return codes;
};

export const getVisitStatusConfig = (
    configs: ConfigOrParamItem[] | undefined,
    status: number | string | null | undefined
): ConfigOrParamItem | undefined => {
    if (status === null || status === undefined) return undefined;
    return configs?.find(
        (entry) => entry.scope === VISIT_STATUS_SCOPE && parseInt(entry.code, 10) === Number(status)
    );
};

export const getVisitStatusLabel = (
    configs: ConfigOrParamItem[] | undefined,
    status: number | string | null | undefined,
    language: string
): string | undefined => {
    const statusConfig = getVisitStatusConfig(configs, status);
    return statusConfig ? (statusConfig.translation?.[language] ?? statusConfig.value) : undefined;
};

export const getVisitZones = (parameters: ConfigOrParamItem[] | undefined): ConfigOrParamItem[] => {
    return (parameters ?? []).filter((entry) => entry.scope === VISIT_ZONE_SCOPE);
};

export const getVisitZoneLabel = (
    parameters: ConfigOrParamItem[] | undefined,
    zone: string,
    language: string
): string => {
    const zoneParam = getVisitZones(parameters).find(
        (entry) => entry.value === zone || entry.code === zone
    );
    return zoneParam ? (zoneParam.translation?.[language] ?? zoneParam.value) : zone;
};

export const isVisitAppointment = (
    appointmentType: number | string | null | undefined,
    configs: ConfigOrParamItem[] | undefined
): boolean => {
    const visitCode = getVisitTypeCode(configs);
    return visitCode !== undefined && Number(appointmentType) === visitCode;
};
