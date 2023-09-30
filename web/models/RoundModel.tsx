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
import { ModelType } from './Models';

export const RoundModel: ModelType = {
    tableName: Table.Round,
    resolverName: 'Round',

    endpoints: {
        list: 'rounds',
        export: 'exportRounds',
        detail: 'round',
        create: 'createRound',
        update: 'updateRound',
        delete: 'deleteRound'
    },
    detailFields: [
        'id',
        'name',
        'status',
        'statusText',
        'equipmentId',
        'equipment{name}',
        'equipmentBarcode',
        'carrierId',
        'carrier{name}',
        'expectedDeliveryDate',
        'blockId',
        'block{name}',
        'warehouseCode',
        'associatedRound',
        'blocLevel',
        'nbRoundLine',
        'nbPickArticle',
        'priority',
        'priorityText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'name',
        'status',
        'statusText',
        'equipmentId',
        'equipment{name}',
        'equipmentBarcode',
        'carrierId',
        'carrier{name}',
        'expectedDeliveryDate',
        'monoBloc',
        'warehouseCode',
        'associatedRound',
        'blockId',
        'block{name}',
        'blocLevel',
        'nbRoundLine',
        'nbPickArticle',
        'priority',
        'priorityText',
        'nbBox',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'name',
        'statusText',
        'equipment_name',
        'equipmentBarcode',
        'carrier_name',
        'expectedDeliveryDate',
        'monoBloc',
        'warehouseCode',
        'associatedRound',
        'block_name',
        'blocLevel',
        'nbRoundLine',
        'nbPickArticle',
        'priorityText',
        'nbBox',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'status', 'equipmentId', 'carrierId', 'blockId', 'priority'],
    excludedListFields: ['id', 'status', 'equipmentId', 'carrierId', 'blockId', 'priority'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
