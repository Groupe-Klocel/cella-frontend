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
import { ModelType, FormDataType } from './Models';
import { Table } from 'generated/graphql';

export const BoxModel: ModelType = {
    tableName: Table.HandlingUnitOutbound,
    resolverName: 'HandlingUnitOutbound',

    endpoints: {
        list: 'handlingUnitOutbounds',
        detail: 'handlingUnitOutbound',
        create: 'createHandlingUnitOutbound',
        update: 'updateHandlingUnitOutbound',
        delete: 'softDeleteHandlingUnitOutbound'
    },
    detailFields: [
        'id',
        'name',
        'status',
        'statusText',
        'handlingUnit{id,warehouseCode}',
        'deliveryId',
        'delivery{name}',
        'handlingUnitModelId',
        'handlingUnitModel{name}',
        'stockOwnerId',
        'stockOwner{name}',
        'preparationMode',
        'preparationModeText',
        'roundId',
        'round {name}',
        'carrierId',
        'carrier {name}',
        'carrierService',
        'carrierBox',
        'loadId',
        'load {name}',
        'theoriticalWeight',
        'intermediateWeight1',
        'intermediateWeight2',
        'finalWeight',
        'toBeChecked',
        'comment',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'stockOwnerId',
        'stockOwner{name}',
        'id',
        'name',
        'status',
        'statusText',
        'delivery {name}',
        'handlingUnitModel {name}',
        'preparationModeText',
        'round {name}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwner_name',
        'name',
        'statusText',
        'handlingUnit_warehouseCode',
        'delivery_name',
        'handlingUnitModel_name',
        'preparationModeText',
        'round_name',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'handlingUnit_id',
        'stockOwnerId',
        'deliveryId',
        'handlingUnitModelId',
        'preparationMode',
        'roundId',
        'carrierId',
        'loadId',
        'status'
    ],
    excludedListFields: ['id', 'status', 'stockOwnerId'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
