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

import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/ModelsV2';
import {
    EMPTY_FIELD_RULES,
    FieldRuleContext,
    FieldRuleScreen,
    FieldRules,
    fetchFieldRules,
    fieldRuleNameFor
} from 'helpers/utils/fieldRules';

/**
 * Resolve the `<TABLE>_FIELD_RULES` rule for one entity and one screen.
 * See helpers/utils/fieldRules.ts for the semantics and the reasoning.
 *
 * Costs nothing for an entity with no rule: the boot-time registry in AppContext is consulted first
 * and the hook then returns synchronously, with `isLoading` already false, so the caller renders in
 * exactly the same way it did before this feature existed.
 */
export const useFieldRules = (
    dataModel: ModelType,
    screen: FieldRuleScreen,
    options?: { recordStatus?: string | number | null; extraContext?: Record<string, any> }
): { rules: FieldRules; isLoading: boolean; hasRule: boolean } => {
    const { graphqlRequestClient } = useAuth();
    const { user, fieldRuleNames } = useAppState();

    const ruleName = fieldRuleNameFor(dataModel);
    // An unreadable registry (`null`) means "unknown", not "none": try once, and fieldRules' cache
    // makes sure a missing rule is not asked for twice in the same session.
    const hasRule = Array.isArray(fieldRuleNames) ? fieldRuleNames.includes(ruleName) : true;

    const context: FieldRuleContext = {
        screen,
        model: dataModel.tableName,
        user: user?.username ?? null,
        recordStatus: options?.recordStatus ?? null,
        extra: options?.extraContext
    };
    // Depend on the serialised context, not the object: pages pass inline literals for
    // `extraContext` and a new identity on every render would refire the effect forever.
    const contextKey = JSON.stringify(context);

    const [rules, setRules] = useState<FieldRules>(EMPTY_FIELD_RULES);
    // Latches false on the first resolution and never goes back to true. A later context change
    // updates the rules in place; it must not unmount a form the user is filling in.
    const [isLoading, setIsLoading] = useState<boolean>(hasRule);

    useEffect(() => {
        if (!hasRule) {
            setIsLoading(false);
            return;
        }
        let active = true;
        fetchFieldRules(graphqlRequestClient, ruleName, context).then((resolved) => {
            if (!active) return;
            setRules(resolved);
            setIsLoading(false);
        });
        return () => {
            active = false;
        };
    }, [graphqlRequestClient, ruleName, hasRule, contextKey]);

    return { rules, isLoading, hasRule };
};
