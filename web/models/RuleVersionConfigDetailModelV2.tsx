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
import { Table } from 'generated/graphql';
import { ModelType } from './ModelsV2';

export const RuleVersionConfigDetailModelV2: ModelType = {
    tableName: Table.RuleVersionConfig,
    resolverName: 'RuleVersionConfig',
    isEditable: true,
    isDeletable: true,
    isSoftDeletable: true,

    endpoints: {
        detail: 'ruleVersionConfig',
        list: 'ruleVersionConfigs',
        create: 'createRuleVersionConfig',
        update: 'updateRuleVersionConfig',
        delete: 'deleteRuleVersionConfig',
        softDelete: 'softDeleteRuleVersionConfig'
    },

    fieldsInfo: {
        order: {
            displayName: null,
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            defaultSort: 'ascending',
            isDetailRequested: false,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        ruleLineConfigurationIn: {
            displayName: null,
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: false,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        ruleLineConfigurationOut: {
            displayName: null,
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: false,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        id: {
            displayName: null,
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: false,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        }
    }
};