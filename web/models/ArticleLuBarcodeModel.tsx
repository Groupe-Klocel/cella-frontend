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

export const ArticleLuBarcodeModel: ModelType = {
    tableName: Table.ArticleLuBarcode,
    resolverName: 'ArticleLuBarcode',
    endpoints: {
        list: 'articleLuBarcodes',
        export: 'exportArticleLuBarcodes',
        detail: 'articleLuBarcode',
        create: 'createArticleLuBarcode',
        update: 'updateArticleLuBarcode',
        delete: 'deleteArticleLuBarcode'
    },
    detailFields: [
        'id',
        'stockOwner{name}',
        'barcode{name}',
        'barcodeId',
        'article{name}',
        'articleId',
        'articleLu{name}',
        'barcode{blacklisted}',
        'barcode{preparationModeText}',
        'barcode{supplierName}',
        'barcode{supplierArticleCode}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'stockOwner{name}',
        'barcode{name}',
        'barcodeId',
        'article{name}',
        'articleLu{name}',
        'barcode{blacklisted}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwner{name}',
        'barcode{name}',
        'article{name}',
        'articleLu{name}',
        'barcode{blacklisted}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'stockOwnerId',
        'articleId',
        'luId',
        'rotation',
        'barcodeId',
        'articleId'
    ],
    excludedListFields: [
        'id',
        'stockOwnerId',
        'articleId',
        'luId',
        'rotation',
        'barcodeId',
        'articleId'
    ],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
