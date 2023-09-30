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

export const HandlingUnitWithContentModel: ModelType = {
    tableName: Table.HandlingUnitContent,
    resolverName: 'HandlingUnitWithContent',

    endpoints: {
        list: 'handlingUnitContents',
        detail: 'handlingUnitContent',
        create: 'createHandlingUnitWithContent',
        update: 'updateHandlingUnitWithContent',
        delete: 'deleteHandlingUnitContent'
    },
    detailFields: [
        'id',
        'created',
        'createdBy',
        'modified',
        'modifiedBy',
        'handlingUnit {locationId, name, comment,code, stockOwner { id, name } }',
        'article {id, name}',
        'stockStatus',
        'reservation',
        'quantity',
        'stockStatusText'
    ],
    excludedDetailFields: ['handlingUnit_locationId', 'handlingUnit_stockOwner_id', 'article_id'],
    listFields: [
        'id',
        'handlingUnit {name, stockOwner { name } }',
        'article {name}',
        'quantity',
        'stockStatusText'
    ],
    sortableFields: ['name'],
    filterFields: [
        { name: 'name', type: FormDataType.String },
        { name: 'stockOwnerId', type: FormDataType.String },
        { name: 'statusText', type: FormDataType.String },
        { name: 'patternTypeText', type: FormDataType.String }
    ]
};
