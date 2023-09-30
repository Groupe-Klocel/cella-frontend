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

export const PurchaseOrderLineModel: ModelType = {
    tableName: Table.PurchaseOrderLine,
    resolverName: 'PurchaseOrderLine',

    endpoints: {
        list: 'purchaseOrderLines',
        export: 'exportPurchaseOrderLine',
        detail: 'purchaseOrderLine',
        create: 'createPurchaseOrderLine',
        update: 'updatePurchaseOrderLine',
        delete: 'deletePurchaseOrder'
    },
    detailFields: [
        'id',
        'stockOwnerId',
        'purchaseOrderId',
        'purchaseOrder{name}',
        'purchaseOrder{status}',
        'purchaseOrder{type}',
        'articleId',
        'article{name}',
        'lineNumber',
        'quantity',
        'quantityMax',
        'receivedQuantity',
        'reservedQuantity',
        'status',
        'statusText',
        'reservation',
        'originalPurchaseOrder',
        'originalPurchaseOrderLine',
        'blockingStatusText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],

    listFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'statusText',
        'purchaseOrderId',
        'purchaseOrder{name}',
        'articleId',
        'article{name, additionalDescription}',
        'lineNumber',
        'quantity',
        'quantityMax',
        'receivedQuantity',
        'reservedQuantity',
        'reservation',
        'originalPurchaseOrder',
        'originalPurchaseOrderLine',
        'blockingStatusText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'lineNumber',
        'quantity',
        'quantityMax',
        'receivedQuantity',
        'reservedQuantity',
        'status',
        'statusText',
        'originalPurchaseOrder',
        'originalPurchaseOrderLine',
        'blockingStatus',
        'reservation',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'status',
        'stockOwnerId',
        'articleId',
        'purchaseOrderId',
        'purchaseOrder_status',
        'purchaseOrder_type'
    ],
    excludedListFields: ['id', 'status', 'stockOwnerId', 'articleId', 'purchaseOrderId'],
    hiddenListFields: [
        'originalPurchaseOrder',
        'originalPurchaseOrderLine',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
