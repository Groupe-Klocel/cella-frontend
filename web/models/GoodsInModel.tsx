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
import { ModelType } from './Models';
import { Table } from 'generated/graphql';

export const GoodsInModel: ModelType = {
    tableName: Table.HandlingUnitInbound,
    resolverName: 'HandlingUnitInbound',

    endpoints: {
        list: 'handlingUnitInbounds',
        detail: 'handlingUnitInbound',
        create: 'createHandlingUnitInbound',
        update: 'updateHandlingUnitInbound',
        delete: 'deleteHandlingUnitInbound'
    },
    detailFields: [
        'id',
        'name',
        'handlingUnitId',
        'handlingUnit{stockOwnerId}',
        'handlingUnit{stockOwner{name}}',
        'comment',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],

    listFields: [
        'id',
        'name',
        'handlingUnitId',
        'handlingUnit{stockOwnerId}',
        'handlingUnit{stockOwner{name}}',
        'comment',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: ['name', 'handlingUnit_stockOwner_name', 'comment'],
    excludedDetailFields: ['id', 'handlingUnitId', 'handlingUnit_stockOwnerId'],
    excludedListFields: ['id', 'handlingUnitId', 'handlingUnit_stockOwnerId'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
