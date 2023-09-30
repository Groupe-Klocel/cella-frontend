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

export const FeatureCodeModel: ModelType = {
    tableName: Table.FeatureCode,
    resolverName: 'FeatureCode',

    endpoints: {
        list: 'featureCodes',
        export: 'exportFeatureCodes',
        detail: 'featureCode',
        create: 'createFeatureCode',
        update: 'updateFeatureCode',
        delete: 'deleteFeatureCode'
    },
    detailFields: [
        'id',
        'name',
        'stockOwnerId',
        'stockOwner{name}',
        'unique',
        'dateType',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'name',
        'unique',
        'dateType',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwnerId',
        'stockOwner{name}',
        'name',
        'unique',
        'dateType',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'stockOwnerId'],
    excludedListFields: ['id', 'stockOwnerId'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
