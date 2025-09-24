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

export const WarehouseWorkerModelV2: ModelType = {
    tableName: Table.WarehouseWorker,
    resolverName: 'WarehouseWorker',
    isEditable: true,
    isDeletable: true,
    isSoftDeletable: false,

    endpoints: {
        detail: 'warehouseWorker',
        list: 'warehouseWorkers',
        create: 'createWarehouseWorker',
        update: 'updateWarehouseWorker',
        delete: 'deleteWarehouseWorker',
        export: true
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
            param: null,
            optionTable: null
        },
        username: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: 'String',
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
        email: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
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
            param: null,
            optionTable: null
        },
        password: {
            isListRequested: false,
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
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        tokenLifetime: {
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
            minRule: -1,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
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
            param: null,
            optionTable: null
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
            param: null,
            optionTable: null
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
            param: null,
            optionTable: null
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
            param: null,
            optionTable: null
        }
    }
};
