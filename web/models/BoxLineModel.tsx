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

export const BoxLineModel: ModelType = {
    tableName: Table.HandlingUnitContentOutbound,
    resolverName: 'HandlingUnitContentOutbound',

    endpoints: {
        list: 'handlingUnitContentOutbounds',
        detail: 'handlingUnitContentOutbound',
        create: 'createHandlingUnitContentOutbound',
        update: 'updateHandlingUnitContentOutbound',
        delete: 'deleteHandlingUnitContentOutbound'
    },
    detailFields: [
        'statusText',
        'id',
        'lineNumber',
        'handlingUnitContentId',
        'handlingUnitContent{handlingUnitId,handlingUnit\
        {stockOwnerId,stockOwner{name},handlingUnitOutbound{id, name}},\
        articleId,article{name},articleLuBarcodeId,\
        articleLuBarcode{articleLu{lu{id, name}}},reservation}',
        'deliveryId',
        'delivery{name}',
        'deliveryLineId',
        'deliveryLine{lineNumber, quantityToBePicked}',
        'pickedQuantity',
        'missingQuantity',
        'preparationMode',
        'preparationModeText',
        'status',
        'comment',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'deliveryId',
        'deliveryLineId',
        'handlingUnitContentId',
        'handlingUnitContent_handlingUnitId',
        'handlingUnitContent_handlingUnit_stockOwnerId',
        'handlingUnitContent_articleId',
        'handlingUnitContent_articleLuBarcodeId',
        'handlingUnitContent_articleLuBarcode_articleLu_lu_id',
        'handlingUnitContent_handlingUnit_handlingUnitOutbound_id',
        'status',
        'lineNumber'
    ],
    // This model is not used for the List
    listFields: [
        'id',
        'lineNumber',
        'handlingUnitContentId',
        'handlingUnitContent{id,handlingUnitId,handlingUnit\
        {name,stockOwnerId,stockOwner{name},handlingUnitOutbound{id}},\
        articleId,article{name},reservation}',
        'deliveryId',
        'delivery{name}',
        'deliveryLineId',
        'deliveryLine{lineNumber, quantityToBePicked}',
        'quantityToBePicked',
        'pickedQuantity',
        'missingQuantity',
        'preparationMode',
        'preparationModeText',
        'status',
        'statusText',
        'comment'
    ],
    excludedListFields: ['id', 'status', 'deliveryLine_quantityToBePicked'],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
