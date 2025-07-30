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

export const HandlingUnitContentsCumulatedModelV2: ModelType = {
    tableName: Table.HandlingUnitContent,
    resolverName: 'HandlingUnitContent',
    isEditable: false,
    isDeletable: false,
    isSoftDeletable: false,

    endpoints: {
        detail: 'handlingUnitContent',
        list: 'handlingUnitContents',
        create: 'createHandlingUnitContent',
        update: 'updateHandlingUnitContent',
        delete: 'deleteHandlingUnitContent',
        export: false
    },

    fieldsInfo: {
        stockOwnerId: {
            isListRequested: false,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'stockOwner',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "StockOwner", "fieldToDisplay": "name"}',
            isEditDisabled: true
        },
        'stockOwner{name}': {
            isListRequested: false,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'stock-owners/stockOwnerId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        articleId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
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
            param: null,
            optionTable: '{"table": "Article", "fieldToDisplay": "name"}'
        },
        'article{name}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'articles/articleId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'article{description}': {
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
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        id: {
            isListRequested: false,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: false,
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
            param: null,
            optionTable: null
        },
        functionSum: {
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
            displayName: 'quantity',
            isMandatory: true,
            minRule: 0,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        stockStatus: {
            isListRequested: false,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: 'stock_statuses',
            optionTable: null
        },
        stockStatusText: {
            isListRequested: false,
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
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        }
    }
};
