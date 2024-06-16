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

export const RuleVersionConfigModelV2: ModelType = {
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
        id: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        ruleVersionId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: 'version',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "RuleVersion", "fieldToDisplay": "version"}'
        },
        'ruleVersion{version}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'version',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        'ruleVersion{ruleId}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: 'rules/ruleId',
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: 'rule_name',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable:
                '{"table": "Rule", "fieldToDisplay": "name", "filtersToApply":{"id" = "ruleVersion{ruleId}"}}'
        },
        'ruleVersion{rule{name}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'rule_name',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        order: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'Number',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: 'Number',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        extras: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: false,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: 'String',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        created: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        createdBy: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        modified: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        modifiedBy: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        }
    }
};
