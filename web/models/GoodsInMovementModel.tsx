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

export const GoodsInMovementModel: ModelType = {
    tableName: Table.Movement,
    resolverName: 'Movement',

    endpoints: {
        list: 'movements',
        detail: 'movement',
        create: 'createMovement',
        update: 'updateMovement',
        delete: 'deleteMovement'
    },
    detailFields: [
        // 'id',
        // 'stockOwnerId',
        // 'stockOwner{name}',
        // 'status',
        // 'statusText',
        // 'model',
        // 'modelText',
        // 'type',
        // 'typeText',
        // 'code',
        // 'codeText',
        // 'articleId',
        // 'article{name}',
        // 'article{additionalDescription}',
        // 'quantity',
        // 'initialStatus',
        // 'initialStatusText',
        // 'finalStatus',
        // 'finalStatusText',
        // 'initialReservation',
        // 'finalReservation',
        // 'finalArticle',
        // 'finalQuantity',
        // 'originalLocationId',
        // 'originalLocation{name}',
        // 'finalLocationId',
        // 'finalLocation{name}',
        // 'handlingUnitId', //----------------- Handling Unit
        // 'handlingUnit{name}',
        // // 'handlingUnitContentId',
        // // 'handlingUnitContent{name}', // le champs "name" n'existe pas -----------------  Remplace Origine/Final Content Id
        // 'originalContentId',
        // 'finalContentId',
        // // 'handlingUnitInboundId', // ---------------  Correspond à GoodsIn
        // // 'handlingUnitInbound{name}',
        // 'purchaseOrderId',
        // 'purchaseOrder{name}',
        // // 'handlingUnitOutboundsId', //--------------  Correspond à Box
        // // 'handlingUnitOutbounds{name}',
        // // 'handlingUnitContentOutboundId',//--------  Correspond à Box Line
        // // 'handlingUnitContentOutbound{lineNumber}',
        // // ----------
        // // Il manque "CAB equipment" et "Equipment"
        // // ----------
        // 'originalMovementId',
        // //'originalMovement{name}', /------- je ne sais pas quel champs mettre
        // 'returnCode',
        // 'returnCodeText',
        // 'actionCode',
        // 'actionCodeText',
        // 'comment',
        // 'feedback',
        // 'created',
        // 'createdBy',
        // 'modified',
        // 'modifiedBy'
    ],
    listFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'articleId',
        'article{name}',
        'article{additionalDescription}',
        'quantity',
        'finalLocationId',
        'finalLocation{name}',
        'purchaseOrderId',
        'purchaseOrder{name}',
        'feedback',
        'handlingUnitInboundId',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'id',
        'stockOwner_name',
        'article_name',
        'article_additionalDescription',
        'quantity',
        'finalLocation_name',
        'purchaseOrder_name',
        'feedback',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'stockOwnerId',
        'status',
        'model',
        'type',
        'code',
        'articleId',
        'initialStatus',
        'finalStatus',
        'originalLocationId',
        'finalLocationId',
        'handlingUnitOutboundId',
        'handlingUnitContentOutboundId',
        'goodsInId',
        'purchaseOrderId',
        'boxId',
        'boxLineId',
        'equipmentId',
        'originalMouvementId',
        'returnCode',
        'actionCode'
    ],
    excludedListFields: [
        'id',
        'handlingUnitInboundId',
        'stockOwnerId',
        'status',
        'model',
        'type',
        'code',
        'articleId',
        'initialStatus',
        'originalLocationId',
        'finalLocationId',
        'goodsInId',
        'purchaseOrderId',
        'boxId',
        'boxLineId',
        'equipmentId',
        'originalMouvementId',
        'returnCode',
        'actionCode'
    ],
    hiddenListFields: [
        'stockOwnerId',
        'status',
        'model',
        'type',
        'code',
        'articleId',
        'originalLocationId',
        'finalLocationId',
        'originalContentId',
        'goodsInId',
        'purchaseOrderId',
        'boxId',
        'boxLineId',
        'equipmentId',
        'originalMouvementId',
        'returnCode',
        'actionCode',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
