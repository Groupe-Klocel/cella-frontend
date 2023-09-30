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

export const BoxLineFeatureModel: ModelType = {
    tableName: Table.HandlingUnitContentFeature,
    resolverName: 'HandlingUnitContentFeature',

    endpoints: {
        list: 'handlingUnitContentFeatures',
        detail: 'handlingUnitContentFeature',
        create: 'createHandlingUnitContentFeature',
        update: 'updateHandlingUnitContentFeature',
        delete: 'deleteHandlingUnitContentFeature'
    },
    detailFields: [
        'id',
        'handlingUnitContentOutboundId',
        'featureCodeId',
        'featureCode{name}',
        'value',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'handlingUnitContentId',
        'handlingUnitContent{handlingUnitContentOutbounds{id}}',
        'featureCodeId',
        'featureCode{name}',
        'value',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'featureCode{name}',
        'value',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'featureCodeId'],
    excludedListFields: ['id', 'handlingUnitContentOutboundId', 'featureCodeId'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
