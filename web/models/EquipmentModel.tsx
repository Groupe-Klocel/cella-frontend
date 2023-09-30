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
import { ModelType, FormDataType } from './Models';

export const EquipmentModel: ModelType = {
    tableName: Table.Equipment,
    resolverName: 'Equipment',

    endpoints: {
        list: 'equipments',
        export: 'exportEquipments',
        detail: 'equipment',
        create: 'createEquipment',
        update: 'updateEquipment',
        delete: 'deleteEquipment'
    },
    detailFields: [
        'id',
        'name',
        'type',
        'priority',
        'typeText',
        'statusText',
        'status',
        'available',
        'distributed',
        'monoCompany',
        'monoCarrier',
        'boxLineGrouped',
        'boxMonoArticle',
        'qtyMaxArticle',
        'nbMaxBox',
        'checkPosition',
        'comment',
        'virtual',
        'limitType',
        'limitTypeText',
        'allowPickingOrderFree',
        'created',
        'createdBy',
        'modified',
        'modifiedBy',
        'stockOwnerId',
        'stockOwner{name}'
    ],
    listFields: [
        'id',
        'priority',
        'stockOwner{name}',
        'typeText',
        'name',
        'statusText',
        'available',
        'distributed',
        'monoCompany',
        'monoCarrier',
        'nbMaxBox',
        'checkPosition',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy'],
    excludedDetailFields: ['status', 'id', 'stockOwnerId', 'type', 'limitType'],
    excludedListFields: ['status', 'id', 'stockOwnerId', 'type', 'limitType']
};
