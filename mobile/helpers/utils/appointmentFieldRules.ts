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

// Which appointment fields are shown, and which are mandatory, as CONFIGURATION rather than code.
//
// Driven by the APPOINTMENT_FIELD_RULES business rule, so a warehouse can require a container
// number on inbound but not outbound (or hide the trailer plate entirely) from the existing /rules
// screens, without a release. The rules engine is used rather than a parameter scope because it is
// already an ordered decision table with operators: today the discriminants are the screen and the
// direction, but `appointment_type`, `carrier` and `user_role` are declared up-front so narrowing
// later costs a config row, not a code change.
//
// OVERRIDE SEMANTICS, NOT AN ALLOW-LIST:
//     visible(f)  = hidden.has(f)   ? false : shown.has(f)     ? true : <code default>
//     required(f) = optional.has(f) ? false : mandatory.has(f) ? true : <code default>
// An allow-list would make every field added in a future release invisible at every customer until
// an admin edited the rule. With overrides, an unconfigured warehouse gets byte-for-byte today's
// form and newly added fields keep their coded behaviour.
//
// FAIL-OPEN. `executeRule` throws when the rule does not exist or has no rows and returns `{}` when
// no row matches; both mean "not configured" and fall through to the code defaults. This is
// presentation config, not an authorisation boundary — the boundary is the backend plus the
// `wm_appointments-carrier` permission. Failing closed would mean a blank form (or an
// everything-is-required form) during an API blip.
//
// Mirror of web/helpers/utils/appointmentFieldRules.ts — keep both in sync.

import { gql } from 'graphql-request';

export const APPOINTMENT_FIELD_RULES = 'APPOINTMENT_FIELD_RULES';

export type AppointmentFieldScreen = 'appointment_form' | 'gate_entry';

export interface AppointmentFieldRuleContext {
    screen: AppointmentFieldScreen;
    direction?: string;
    appointmentType?: string | number | null;
    carrierName?: string | null;
    userRole?: 'carrier' | 'internal';
}

export interface AppointmentFieldRules {
    /** false when the rule is absent/errored/unmatched — callers then use their code defaults */
    configured: boolean;
    hidden: Set<string>;
    shown: Set<string>;
    mandatory: Set<string>;
    optional: Set<string>;
}

export const EMPTY_APPOINTMENT_FIELD_RULES: AppointmentFieldRules = {
    configured: false,
    hidden: new Set(),
    shown: new Set(),
    mandatory: new Set(),
    optional: new Set()
};

/**
 * Fields that may be made mandatory but never hidden and never forced optional. Hiding any of them breaks the form's own
 * machinery: the appointment type resolves the direction (and therefore the rule context itself),
 * and the date/duration feed the dock opening-hours and overlap checks.
 */
export const PROTECTED_APPOINTMENT_FIELDS: ReadonlySet<string> = new Set([
    // an unidentifiable gate entry is worthless, and the ad-hoc path needs a carrier and a slot
    'driverName',
    'carrierId',
    'durationMinutes'
]);

/**
 * Read one out-param into a list of field names. Tolerant in the same spirit as
 * `parseDocumentNames`: the admin screen JSON.parses an out value with a raw-string fallback, so a
 * value typed without brackets arrives as a plain string.
 */
export const parseFieldNameList = (out: any, key: string): string[] => {
    let raw: any = out?.[key]?.value ?? out?.[key];
    if (raw == null) return [];
    if (typeof raw === 'string') {
        // "driverName, truckLicensePlate" or a JSON array typed as text
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
            try {
                raw = JSON.parse(trimmed);
            } catch {
                raw = trimmed.split(/[,;\s]+/);
            }
        } else {
            raw = trimmed.split(/[,;\s]+/);
        }
    }
    if (!Array.isArray(raw)) return [];
    const flatten = (arr: any[]): any[] =>
        arr.reduce((acc: any[], v: any) => acc.concat(Array.isArray(v) ? flatten(v) : v), []);
    return flatten(raw).filter((x: any) => typeof x === 'string' && x.length > 0);
};

export const fetchAppointmentFieldRules = async (
    graphqlRequestClient: any,
    context: AppointmentFieldRuleContext
): Promise<AppointmentFieldRules> => {
    // Every declared in-param must be sent: a key declared in a row's `in` but absent from the
    // context fails that row unless its operator is `*`.
    const ruleContext = {
        screen: context.screen,
        direction: context.direction ?? null,
        appointment_type: context.appointmentType != null ? String(context.appointmentType) : null,
        carrier: context.carrierName ?? null,
        // No default: claiming 'internal' when the caller did not say would be a lie, and a row
        // discriminating on user_role would then match the wrong context. The kiosk deliberately
        // leaves it unset - `screen: gate_entry` already tells kiosk and back office apart.
        user_role: context.userRole ?? null
    };
    try {
        const res: any = await graphqlRequestClient.request(
            gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "${APPOINTMENT_FIELD_RULES}", context: $context)
                }
            `,
            { context: ruleContext }
        );
        const out = res?.executeRule;
        if (!out || typeof out !== 'object' || Object.keys(out).length === 0) {
            // rows exist but none matched -> log the context, since the usual cause is a declared
            // in-param left without a `*` operator on the row the admin expected to fire
            console.info('[APPOINTMENT_FIELD_RULES] no matching row for', ruleContext);
            return EMPTY_APPOINTMENT_FIELD_RULES;
        }
        // A protected field is protected in BOTH directions. Dropping it from `hidden_fields`
        // alone would still let `optional_fields` strip its required rule, which is the same
        // breakage by another route: an appointment with no date has nothing to check against the
        // dock opening hours, and a gate entry with no driver name identifies nobody.
        const reject = (list: 'hidden_fields' | 'optional_fields', verb: string) =>
            parseFieldNameList(out, list).filter((f) => {
                if (PROTECTED_APPOINTMENT_FIELDS.has(f)) {
                    console.warn(`[APPOINTMENT_FIELD_RULES] "${f}" cannot be ${verb}; ignoring`);
                    return false;
                }
                return true;
            });
        return {
            configured: true,
            hidden: new Set(reject('hidden_fields', 'hidden')),
            shown: new Set(parseFieldNameList(out, 'shown_fields')),
            mandatory: new Set(parseFieldNameList(out, 'mandatory_fields')),
            optional: new Set(reject('optional_fields', 'made optional'))
        };
    } catch (e) {
        // rule missing / no rows / network: keep the coded behaviour, silently for the user
        return EMPTY_APPOINTMENT_FIELD_RULES;
    }
};

/** Is the field rendered? `codeDefault` is what the hard-coded form would do. */
export const isAppointmentFieldVisible = (
    rules: AppointmentFieldRules,
    field: string,
    codeDefault = true
): boolean => {
    if (rules.hidden.has(field)) return false;
    if (rules.shown.has(field)) return true;
    return codeDefault;
};

/** Is the field mandatory? `codeDefault` is what the hard-coded form would do. */
export const isAppointmentFieldRequired = (
    rules: AppointmentFieldRules,
    field: string,
    codeDefault = false
): boolean => {
    if (rules.optional.has(field)) return false;
    if (rules.mandatory.has(field)) return true;
    return codeDefault;
};

/**
 * AntD rule array for a field, or `undefined` when it is not required — which preserves the exact
 * current behaviour of the many inputs that pass no rules at all.
 */
export const appointmentFieldRulesFor = (
    rules: AppointmentFieldRules,
    field: string,
    options: { codeRequired?: boolean; requiredMessage: string; extra?: any[] }
): any[] | undefined => {
    const required = isAppointmentFieldRequired(rules, field, options.codeRequired ?? false);
    const built = [
        ...(required ? [{ required: true, message: options.requiredMessage }] : []),
        ...(options.extra ?? [])
    ];
    return built.length > 0 ? built : undefined;
};
