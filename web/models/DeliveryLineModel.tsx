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

export const DeliveryLineModel: ModelType = {
    tableName: Table.DeliveryLine,
    resolverName: 'DeliveryLine',

    endpoints: {
        list: 'deliveryLines',
        detail: 'deliveryLine',
        create: 'createDeliveryLine',
        update: 'updateDeliveryLine',
        delete: 'deleteDeliveryLine'
    },
    detailFields: [
        'id',
        'lineNumber',
        'stockOwnerId',
        'stockOwner{name}',
        'status',
        'statusText',
        'articleId',
        'article{name}',
        'masterLine',
        'childLine',
        'masterLineNumber',
        'quantityToBePicked',
        'pickedQuantity',
        'missingQuantity',
        'backOrderQuantity',
        'toBeCubed',
        'reservation',
        'unitPriceIncludingTaxes',
        'unitPriceExcludingTaxes',
        'vatRate',
        'comment',
        'deliveryId',
        'delivery{name}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'lineNumber',
        'stockOwnerId',
        'stockOwner{name}',
        'status',
        'statusText',
        'articleId',
        'article{name}',
        'masterLine',
        'childLine',
        'masterLineNumber',
        'quantityToBePicked',
        'pickedQuantity',
        'missingQuantity',
        'backOrderQuantity',
        'toBeCubed',
        'reservation',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'lineNumber',
        'stockOwner{name}',
        'statusText',
        'article{code}',
        'article{name}',
        'masterLine',
        'childLine',
        'masterLineNumber',
        'quantityToBePicked',
        'pickedQuantity',
        'missingQuantity',
        'backOrderQuantity',
        'toBeCubed',
        'reservation',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'stockOwnerId', 'status', 'articleId', 'deliveryId'],
    excludedListFields: ['id', 'stockOwnerId', 'status', 'articleId', 'deliveryId'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
