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

export const HandlingUnitContentModel: ModelType = {
    tableName: Table.HandlingUnitContent,
    resolverName: 'HandlingUnitContent',

    endpoints: {
        list: 'handlingUnitContents',
        detail: 'handlingUnitContent',
        create: 'createHandlingUnitContent',
        update: 'updateHandlingUnitContent',
        delete: 'deleteHandlingUnitContent'
    },
    detailFields: [
        'id',
        'created',
        'createdBy',
        'modified',
        'modifiedBy',
        'handlingUnit {locationId, name, comment,code, stockOwner { id, name } }',
        'article {id, name, description}',
        'stockStatus',
        'reservation',
        'quantity',
        'stockStatusText'
    ],
    excludedDetailFields: ['handlingUnit_locationId', 'handlingUnit_stockOwner_id', 'article_id'],
    listFields: [
        'id',
        'handlingUnit {stockOwner {name}}',
        'article {name, description}',
        'handlingUnit {name}',
        'handlingUnit {locationId}',
        'handlingUnit{location{name}}',
        'quantity',
        'stockStatusText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy',
        'handlingUnitContentFeatures {featureCode {id, name}, value}'
    ],
    sortableFields: ['name'],
    excludedListFields: [
        'id',
        'handlingUnit_locationId',
        'handlingUnitContentFeatures',
        'handlingUnitContentFeatures_featureCode_id',
        'handlingUnitContentFeatures_featureCode_name',
        'handlingUnitContentFeatures_value'
    ],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
