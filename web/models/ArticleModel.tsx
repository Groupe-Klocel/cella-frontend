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

export const ArticleModel: ModelType = {
    tableName: 'Article',
    resolverName: 'Article',

    endpoints: {
        list: 'articles',
        export: 'exportArticles',
        detail: 'article',
        create: 'createArticle',
        update: 'updateArticle',
        delete: 'deleteArticle'
    },
    detailFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'description',
        'name',
        'status',
        'statusText',
        'baseUnitRotation',
        'baseUnitRotationText',
        'additionalDescription',
        'supplierName',
        'translation',
        'length',
        'width',
        'height',
        'baseUnitPrice',
        'baseUnitWeight',
        'baseUnitPicking',
        'cubingType',
        'featureType',
        'permanentProduct',
        'tariffClassification',
        'family',
        'subfamily',
        'groupingId',
        'countryOfOrigin',
        'newProduct',
        'endOfLife',
        'supportQuantity',
        'cubingTypeText',
        'featureTypeText',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],

    listFields: [
        'id',
        'stockOwner{name}',
        'description',
        'name',
        'statusText',
        'status',
        'baseUnitRotationText',
        'length',
        'width',
        'height',
        'baseUnitWeight',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwner_name',
        'description',
        'name',
        'statusText',
        'baseUnitRotationText',
        'length',
        'width',
        'height',
        'baseUnitWeight',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'status',
        'stockOwnerId',
        'cubingType',
        'featureType',
        'baseUnitRotation'
    ],
    excludedListFields: [
        'id',
        'status',
        'stockOwnerId',
        'cubingType',
        'featureType',
        'baseUnitRotation'
    ],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
