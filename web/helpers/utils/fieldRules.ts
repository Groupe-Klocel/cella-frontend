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

// Which fields of ANY entity are shown, mandatory or read-only, as CONFIGURATION rather than code.
//
// This generalises what APPOINTMENT_FIELD_RULES does for the two hand-written appointment screens
// (see appointmentFieldRules.ts, which is now an adapter over this module) to every model rendered
// by the generic CRUD components. One rule per entity, named after its table:
//
//     APPOINTMENT -> APPOINTMENT_FIELD_RULES        (the rule that already exists)
//     CARRIER     -> CARRIER_FIELD_RULES
//
// so the appointment rule is simply the first instance of the convention, with no renaming and no
// data migration. The rules engine is used rather than a parameter scope because it is already an
// ordered decision table with operators, and it is administered from the existing /rules screens.
//
// OVERRIDE SEMANTICS, NOT AN ALLOW-LIST:
//     visible(f)  = hidden.has(f)   ? false : shown.has(f)    ? true : <model default>
//     required(f) = optional.has(f) ? false : mandatory.has(f) ? true : <model default>
//     readOnly(f) = editable.has(f) ? false : readOnly.has(f)  ? true : <model default>
// An allow-list would make every field added in a future release invisible at every customer until
// an admin edited the rule. With overrides, an unconfigured warehouse gets byte-for-byte today's
// screens and newly added fields keep their coded behaviour.
//
// FAIL-OPEN. `executeRule` throws when the rule does not exist or has no rows and returns `{}` when
// no row matches; both mean "not configured" and fall through to the model defaults. This is
// presentation config, not an authorisation boundary — the boundary is the backend plus the table
// permissions. Failing closed would mean a blank form (or an everything-is-required form) during an
// API blip.
//
// COST. Wiring `executeRule` blindly into components used by ~200 pages would mean one failing
// round-trip per screen for the ~115 entities that have no rule. AppLayout therefore lists the
// existing `*_FIELD_RULES` rule names once at boot into `useAppState().fieldRuleNames`, and
// `useFieldRules` skips the call entirely when the entity has no rule. When that registry is
// unavailable (a user without read access to RULE), we fall back to trying once per entity and
// caching the outcome below, so the waste is bounded to one call per entity per session.
//
// LIMITS, all deliberate (they follow from how the generic components work):
//   * `shown_fields` cannot reveal a field on the add/edit form. The form's only visibility switch
//     is `addEditFormat: null`, and a null format does not say HOW to render the field. To make a
//     normally-absent field configurable, give it an `addEditFormat` in the model (or in
//     `modelsSpe/`) and hide it by default through `hidden_fields`. A warning is logged otherwise.
//     On the detail view `shown_fields` works normally.
//   * `readonly_fields` only bites in edit mode: the add path never sets `disabled`.
//   * A hidden field is absent from the submitted payload, it is NOT nulled. The generic form never
//     registers it with AntD, so an update leaves the stored value untouched. That is the safe
//     semantic (hiding a field must not erase data), and it differs from the appointment form,
//     which nulls hidden fields on purpose.
//   * Lists are out of scope. If they are added later, patch `isExcludedFromList` and NOT
//     `isDefaultHiddenList`, which is overridden by each user's persisted `allColumnsInfos`.

import { gql } from 'graphql-request';
import { FieldsInfo, ModelType } from '../../models/ModelsV2';

export type FieldRuleScreen = 'add' | 'edit' | 'detail';

export interface FieldRuleContext {
    screen: FieldRuleScreen;
    /** the entity's `tableName`, echoed so a row can be read without decoding the rule name */
    model: string;
    user?: string | null;
    /** the record's `status`; only known on edit, where the page has already fetched the record */
    recordStatus?: string | number | null;
    /** page-supplied discriminants (direction, carrier, …) — merged as-is into the rule context */
    extra?: Record<string, any>;
}

export interface FieldRules {
    /** false when the rule is absent/errored/unmatched — callers then use their model defaults */
    configured: boolean;
    hidden: Set<string>;
    shown: Set<string>;
    mandatory: Set<string>;
    optional: Set<string>;
    readOnly: Set<string>;
    editable: Set<string>;
}

export const EMPTY_FIELD_RULES: FieldRules = {
    configured: false,
    hidden: new Set(),
    shown: new Set(),
    mandatory: new Set(),
    optional: new Set(),
    readOnly: new Set(),
    editable: new Set()
};

/** Suffix every per-entity field-rule shares. Exported so AppLayout can filter the rule list. */
export const FIELD_RULES_SUFFIX = '_FIELD_RULES';

/**
 * PascalCase -> UPPER_SNAKE, passing through a name that is already UPPER_SNAKE.
 *
 * Local rather than the shared `pascalToSnakeUpper`, for two reasons. This module is reached from
 * the boot path of every CRUD screen, and having no local imports at all means it can never take
 * part in an import cycle through the `@helpers` barrel (`utils.ts` imports the barrel back — only
 * for a type today, so it is erased at compile time and there is no cycle at runtime, but that is
 * a property of one import statement, not a guarantee). And the shared helper inserts an underscore
 * before EVERY capital, so an already-upper name comes back as H_A_N_D_L_I_N_G… and would need this
 * same guard bolted on at the call site anyway.
 */
const toUpperSnake = (name: string): string =>
    /^[A-Z0-9_]+$/.test(name) ? name : name.replace(/(?!^)([A-Z])/g, '_$1').toUpperCase();

/**
 * `tableName` is already UPPER_SNAKE (the `Table` enum), so APPOINTMENT yields the
 * APPOINTMENT_FIELD_RULES rule that already exists. Models sharing a table through `modelName`
 * (RuleVersionDetailIn, RuleVersionConfigDetail, …) get their own rule so their very different
 * field sets do not collide.
 */
export const fieldRuleNameFor = (model: { tableName: string; modelName?: string | null }): string =>
    `${toUpperSnake(model.modelName ?? model.tableName)}${FIELD_RULES_SUFFIX}`;

/**
 * `fieldsInfo` keys may be nested (`carrier{name}`); the rest of the app flattens those to
 * `carrier_name`. Accept either spelling from the admin so nobody has to guess.
 */
const normalizeFieldKey = (key: string): string => key.replaceAll('{', '_').replaceAll('}', '');

const listed = (set: Set<string>, key: string): boolean =>
    set.has(key) || set.has(normalizeFieldKey(key));

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

/**
 * Turn an `executeRule` payload into a FieldRules. Exported for the appointment adapter, which
 * reads the same four field lists out of its own rule.
 */
export const fieldRulesFromRuleOutput = (out: any): FieldRules => ({
    configured: true,
    hidden: new Set(parseFieldNameList(out, 'hidden_fields')),
    shown: new Set(parseFieldNameList(out, 'shown_fields')),
    mandatory: new Set(parseFieldNameList(out, 'mandatory_fields')),
    optional: new Set(parseFieldNameList(out, 'optional_fields')),
    readOnly: new Set(parseFieldNameList(out, 'readonly_fields')),
    editable: new Set(parseFieldNameList(out, 'editable_fields'))
});

// One entry per (rule, context) for the lifetime of the session. Doubles as the in-flight
// deduplication (the promise is cached, not the value) and as the negative cache that keeps an
// entity without a rule from re-asking on every navigation.
const resultCache = new Map<string, Promise<FieldRules>>();

/** Only for tests / a manual refresh after editing a rule; nothing calls this in the app. */
export const clearFieldRulesCache = (): void => {
    resultCache.clear();
};

const buildRuleContext = (context: FieldRuleContext): Record<string, any> => ({
    // Every declared in-param must be sent: a key declared in a row's `in` but absent from the
    // context fails that row unless its operator is `*`.
    screen: context.screen,
    model: context.model,
    user: context.user ?? null,
    record_status: context.recordStatus != null ? String(context.recordStatus) : null,
    ...(context.extra ?? {})
});

const runRule = async (
    graphqlRequestClient: any,
    ruleName: string,
    ruleContext: Record<string, any>
): Promise<{ rules: FieldRules; cacheable: boolean }> => {
    try {
        // `ruleName` as a variable rather than interpolated into the document, unlike the older
        // executeRule call sites: one query document is reused for every entity instead of minting
        // a distinct one per rule name, and a rule name that ever came from data could not alter
        // the query. Same reason the context has always been a variable.
        const res: any = await graphqlRequestClient.request(
            gql`
                query executeRule($ruleName: String!, $context: JSON!) {
                    executeRule(ruleName: $ruleName, context: $context)
                }
            `,
            { ruleName, context: ruleContext }
        );
        const out = res?.executeRule;
        if (!out || typeof out !== 'object' || Object.keys(out).length === 0) {
            // rows exist but none matched -> log the context, since the usual cause is a declared
            // in-param left without a `*` operator on the row the admin expected to fire
            console.info(`[${ruleName}] no matching row for`, ruleContext);
            return { rules: EMPTY_FIELD_RULES, cacheable: true };
        }
        return { rules: fieldRulesFromRuleOutput(out), cacheable: true };
    } catch (e: any) {
        // A GraphQL-level error (`response` is set) means the rule is missing or has no rows: a
        // stable answer worth remembering. A transport failure is not — caching it would freeze the
        // whole session on the model defaults because of one blip.
        return { rules: EMPTY_FIELD_RULES, cacheable: e?.response != null };
    }
};

/**
 * Run a field-rule against an already-built rule context, with caching and fail-open.
 * Callers whose rule declares its own in-params (the appointment screens) use this directly;
 * everything on the generic CRUD path goes through `fetchFieldRules`.
 */
export const executeFieldRule = async (
    graphqlRequestClient: any,
    ruleName: string,
    ruleContext: Record<string, any>
): Promise<FieldRules> => {
    const cacheKey = `${ruleName}|${JSON.stringify(
        Object.keys(ruleContext)
            .sort()
            .map((k) => [k, ruleContext[k]])
    )}`;
    const cached = resultCache.get(cacheKey);
    if (cached) return cached;

    const pending = runRule(graphqlRequestClient, ruleName, ruleContext).then((outcome) => {
        if (!outcome.cacheable) resultCache.delete(cacheKey);
        return outcome.rules;
    });
    resultCache.set(cacheKey, pending);
    return pending;
};

export const fetchFieldRules = async (
    graphqlRequestClient: any,
    ruleName: string,
    context: FieldRuleContext
): Promise<FieldRules> =>
    executeFieldRule(graphqlRequestClient, ruleName, buildRuleContext(context));

/** Is the field rendered? `codeDefault` is what the hard-coded screen would do. */
export const isFieldVisible = (rules: FieldRules, field: string, codeDefault = true): boolean => {
    if (listed(rules.hidden, field)) return false;
    if (listed(rules.shown, field)) return true;
    return codeDefault;
};

/** Is the field mandatory? `codeDefault` is what the hard-coded screen would do. */
export const isFieldRequired = (rules: FieldRules, field: string, codeDefault = false): boolean => {
    if (listed(rules.optional, field)) return false;
    if (listed(rules.mandatory, field)) return true;
    return codeDefault;
};

/**
 * AntD rule array for a field, or `undefined` when it is not required — which preserves the exact
 * current behaviour of the many inputs that pass no rules at all.
 */
export const fieldRulesFor = (
    rules: FieldRules,
    field: string,
    options: { codeRequired?: boolean; requiredMessage: string; extra?: any[] }
): any[] | undefined => {
    const required = isFieldRequired(rules, field, options.codeRequired ?? false);
    const built = [
        ...(required ? [{ required: true, message: options.requiredMessage }] : []),
        ...(options.extra ?? [])
    ];
    return built.length > 0 ? built : undefined;
};

/**
 * Derive a NEW model with the rules applied to `fieldsInfo`, so the generic components need no
 * knowledge of the rules engine — they keep reading the flags they already read.
 *
 * Never mutates its argument: the models exported by `newModelsInjected` are singletons shared by
 * every page AND by the SSR Node process. Returns the very same object when nothing changed, so an
 * unconfigured entity cannot trigger a re-render or a refetch downstream.
 *
 * `isListRequested` / `isDetailRequested` are deliberately untouched: they compose the GraphQL
 * query bodies and the return-field lists of createX/updateX. Hiding a field must not change what
 * is fetched or written.
 */
export const applyFieldRulesToModel = (
    model: ModelType,
    rules: FieldRules,
    screen: FieldRuleScreen
): ModelType => {
    if (!rules.configured) return model;

    const isForm = screen === 'add' || screen === 'edit';
    const patchedFields: FieldsInfo = {};
    let changed = false;

    Object.keys(model.fieldsInfo).forEach((key) => {
        const info = model.fieldsInfo[key];
        const patched: any = { ...info };
        let fieldChanged = false;

        const hide = listed(rules.hidden, key);
        const show = listed(rules.shown, key);

        if (isForm) {
            const required = isFieldRequired(rules, key, info.isMandatory);

            if (hide && required) {
                // The one breakage the user cannot work around: a mandatory field nobody can fill
                // makes the record impossible to save. Putting the field in `optional_fields` too
                // is the explicit way to say "relax it, then hide it".
                console.warn(
                    `[${fieldRuleNameFor(model)}] "${key}" is mandatory and cannot be hidden on the ${screen} form; add it to optional_fields as well. Ignoring.`
                );
            } else if (hide && info.addEditFormat !== null) {
                patched.addEditFormat = null;
                fieldChanged = true;
            } else if (show && info.addEditFormat === null) {
                console.warn(
                    `[${fieldRuleNameFor(model)}] "${key}" has no addEditFormat, so shown_fields cannot render it on the ${screen} form. Declare a format in the model to make it configurable.`
                );
            }

            if (required !== info.isMandatory) {
                patched.isMandatory = required;
                fieldChanged = true;
            }

            if (listed(rules.editable, key)) {
                // Delete rather than set false: AddEditItemComponentV2 reads
                // `isEditDisabled ?? isDisabled`, so an explicit false would also silence the
                // dynamic `toBeEditDisabled` check.
                if ('isEditDisabled' in patched) {
                    delete patched.isEditDisabled;
                    fieldChanged = true;
                }
            } else if (listed(rules.readOnly, key) && info.isEditDisabled !== true) {
                patched.isEditDisabled = true;
                fieldChanged = true;
            }
        } else {
            // detail: purely a post-fetch display filter, so hiding anything is safe here
            if (hide && !info.isExcludedFromDetail) {
                patched.isExcludedFromDetail = true;
                fieldChanged = true;
            } else if (show && info.isExcludedFromDetail) {
                patched.isExcludedFromDetail = false;
                fieldChanged = true;
            }
        }

        patchedFields[key] = fieldChanged ? patched : info;
        changed = changed || fieldChanged;
    });

    return changed ? { ...model, fieldsInfo: patchedFields } : model;
};
