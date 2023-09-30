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

export const GoodsInLineModel: ModelType = {
    tableName: Table.HandlingUnitContentInbound,
    resolverName: 'HandlingUnitContentInbound',

    endpoints: {
        list: 'handlingUnitContentInbounds',
        detail: 'handlingUnitContentInbound',
        create: 'createHandlingUnitContentInbound',
        update: 'updateHandlingUnitContentInbound',
        delete: 'deleteHandlingUnitContentInbound'
    },
    detailFields: [
        // 'id',
        // 'handlingUnitInboundId',
        // 'handlingUnitInbound{name}',
        // 'purchaseOrderId',
        // 'purchaseOrder{name}',
        // 'purchaseOrderLineId',
        // 'purchaseOrderLine{lineNumber}',
        'handlingUnitContent{handlingUnitId,handlingUnit\
        {stockOwnerId,stockOwner{name}}articleId, article{name}, article{additionalDescription}, quantity, reservation}'
        // 'created',
        // 'createdBy',
        // 'modified',
        // 'modifiedBy'
    ],
    listFields: [
        'id',
        'lineNumber',
        'purchaseOrderId',
        'purchaseOrder{name}',
        'purchaseOrderLineId',
        'purchaseOrderLine{lineNumber}',
        'handlingUnitContentId',
        'handlingUnitContent{articleId, article{name}, article{additionalDescription}, quantity, reservation}',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'lineNumber',
        'purchaseOrder_name',
        'purchaseOrderLine_lineNumber',
        'handlingUnitContent_article_name',
        'handlingUnitContent_article_additionalDescription',
        'handlingUnitContent_quantity',
        'handlingUnitContent_reservation',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'handlingUnitInboundId',
        'handlingUnitContentId',
        'handlingUnitContent_handlingUnitId',
        'handlingUnitContent_handlingUnit_stockOwnerId',
        'purchaseOrderId',
        'purchaseOrderLineId',
        'handlingUnitContentId',
        'handlingUnitContent_articleId'
    ],
    excludedListFields: [
        'id',
        'handlingUnitInboundId',
        'handlingUnitContentId',
        'handlingUnitContent_handlingUnitId',
        'handlingUnitContent_handlingUnit_stockOwnerId',
        'handlingUnit{stockOwnerId}',
        'purchaseOrderId',
        'purchaseOrderLineId',
        'handlingUnitContentId',
        'handlingUnitContent_articleId'
    ],
    hiddenListFields: [
        'purchaseOrderId',
        'handlingUnitContentId',
        'handlingUnitContent_articleId',
        'articleId',
        'created',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
