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
// This is the APPOINTMENT-SPECIFIC part of the mechanism: the two appointment screens are written by
// hand (the appointment model sets `addEditFormat: null` on these fields), so they cannot go through
// the generic CRUD path and need their own rule context — `screen`, `direction`, `appointment_type`,
// `carrier` and `user_role` rather than the generic screen/model/user. The semantics, the parsing
// and the fail-open behaviour live in ./fieldRules.ts, which drives every other entity through the
// same APPOINTMENT_FIELD_RULES naming convention (`<TABLE>_FIELD_RULES`).
//
// A warehouse can therefore require a container number on inbound but not outbound (or hide the
// trailer plate entirely) from the existing /rules screens, without a release. Today the
// discriminants are the screen and the direction; `appointment_type`, `carrier` and `user_role` are
// declared up-front so narrowing later costs a config row, not a code change.
//
// RELATIONSHIP TO mobile/helpers/utils/appointmentFieldRules.ts. Mobile has no generic CRUD to share
// a core with, so it keeps a self-contained copy. "Keep in sync" applies to the contract, not to the
// file: the rule name, the out-param keys, the override semantics and the fail-open behaviour must
// match, or one rule cannot drive both apps. Two things legitimately differ, and do differ today:
//
//   * PROTECTED_APPOINTMENT_FIELDS — each side protects what its own screen is built on
//     (`appointmentDuration` here, `durationMinutes` there).
//   * The FIELD-NAME NAMESPACE, which is the trap worth knowing about: this file's callers name DB
//     columns (`entityAccountingCode`), the kiosk's name its own form fields (`supplier`,
//     `companyName`, `containerNumber`). So `hidden_fields: ["entityAccountingCode"]` hides the field
//     in the back office and does NOTHING on the kiosk. A row meant for both has to list both names.

import {
    EMPTY_FIELD_RULES,
    executeFieldRule,
    FieldRules,
    fieldRulesFor,
    isFieldRequired,
    isFieldVisible
} from './fieldRules';

export { parseFieldNameList } from './fieldRules';

export const APPOINTMENT_FIELD_RULES = 'APPOINTMENT_FIELD_RULES';

export type AppointmentFieldScreen = 'appointment_form' | 'gate_entry';

export interface AppointmentFieldRuleContext {
    screen: AppointmentFieldScreen;
    direction?: string;
    appointmentType?: string | number | null;
    carrierName?: string | null;
    userRole?: 'carrier' | 'internal';
}

export type AppointmentFieldRules = FieldRules;

export const EMPTY_APPOINTMENT_FIELD_RULES: AppointmentFieldRules = EMPTY_FIELD_RULES;

/**
 * Fields that may be made mandatory but never hidden and never forced optional. Hiding any of them breaks the form's own
 * machinery: the appointment type resolves the direction (and therefore the rule context itself),
 * and the date/duration feed the dock opening-hours and overlap checks.
 *
 * The generic path needs no such list — it derives the same protection from the model's own
 * `isMandatory` (see applyFieldRulesToModel) — but these screens have no model to derive it from.
 */
export const PROTECTED_APPOINTMENT_FIELDS: ReadonlySet<string> = new Set([
    'appointmentType',
    'appointmentDateBegin',
    'appointmentDuration',
    'carrierId',
    'driverName'
]);

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
    const rules = await executeFieldRule(
        graphqlRequestClient,
        APPOINTMENT_FIELD_RULES,
        ruleContext
    );
    if (!rules.configured) return rules;

    // A protected field is protected in BOTH directions. Dropping it from `hidden_fields`
    // alone would still let `optional_fields` strip its required rule, which is the same
    // breakage by another route: an appointment with no date has nothing to check against the
    // dock opening hours, and a gate entry with no driver name identifies nobody.
    const reject = (fields: Set<string>, verb: string): Set<string> => {
        const kept = new Set<string>();
        fields.forEach((field) => {
            if (PROTECTED_APPOINTMENT_FIELDS.has(field)) {
                console.warn(`[${APPOINTMENT_FIELD_RULES}] "${field}" cannot be ${verb}; ignoring`);
                return;
            }
            kept.add(field);
        });
        return kept;
    };

    return {
        ...rules,
        hidden: reject(rules.hidden, 'hidden'),
        optional: reject(rules.optional, 'made optional')
    };
};

/** Is the field rendered? `codeDefault` is what the hard-coded form would do. */
export const isAppointmentFieldVisible = (
    rules: AppointmentFieldRules,
    field: string,
    codeDefault = true
): boolean => isFieldVisible(rules, field, codeDefault);

/** Is the field mandatory? `codeDefault` is what the hard-coded form would do. */
export const isAppointmentFieldRequired = (
    rules: AppointmentFieldRules,
    field: string,
    codeDefault = false
): boolean => isFieldRequired(rules, field, codeDefault);

/**
 * AntD rule array for a field, or `undefined` when it is not required — which preserves the exact
 * current behaviour of the many inputs that pass no rules at all.
 */
export const appointmentFieldRulesFor = (
    rules: AppointmentFieldRules,
    field: string,
    options: { codeRequired?: boolean; requiredMessage: string; extra?: any[] }
): any[] | undefined => fieldRulesFor(rules, field, options);
