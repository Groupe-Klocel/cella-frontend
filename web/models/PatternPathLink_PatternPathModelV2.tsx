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

export const PatternPathLink_PatternPathModelV2: ModelType = {
    tableName: Table.PatternPathLink,
    resolverName: 'PatternPathLink',
    isEditable: false,
    isDeletable: false,
    isSoftDeletable: false,

    endpoints: {
        detail: 'patternPathLink',
        list: 'patternPathLinks',
        create: 'createPatternPathLink',
        update: 'updatePatternPathLink',
        delete: 'deletePatternPathLink'
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
        patternPathId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        patternId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        'pattern{name}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: '{"label":"general", "position":0}',
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
