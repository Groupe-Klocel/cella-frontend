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

export const DeliveryModel: ModelType = {
    tableName: Table.Delivery,
    resolverName: 'Delivery',

    endpoints: {
        list: 'deliveries',
        detail: 'delivery',
        create: 'createDelivery',
        update: 'updateDelivery',
        delete: 'deleteDelivery'
    },
    detailFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'name',
        'status',
        'statusText',
        'type',
        'typeText',
        'priority',
        'priorityText',
        'toBePalletized',
        'cubingResult',
        'carrierId',
        'carrier{name}',
        'carrierService',
        'carrierImposed',
        'carrierSpecificInfo1',
        'carrierSpecificInfo2',
        'equipmentId',
        'equipment{name}',
        'orderDate',
        'expectedDeliveryDate',
        'comment',
        'extendDeliveryInformations',
        'companyOrigin',
        'invoiceReference',
        'invoiceDevise',
        'invoiceDiscount',
        'invoiceTotalIncludingTaxes',
        'invoiceTotalExcludingTaxes',
        'invoiceShipping',
        'printLanguage',
        'codPaymentMode',
        'codAmount',
        'codCurrency',
        'transportationAmount',
        'printDeliveryNote',
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
        'status',
        'statusText',
        'type',
        'typeText',
        'priority',
        'priorityText',
        'expectedDeliveryDate',
        'carrierId',
        'carrier{name}',
        'carrierService',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwner{name}',
        'name',
        'statusText',
        'typeText',
        'priorityText',
        'toBePalletized',
        'expectedDeliveryDate',
        'carrierText',
        'carrierService',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: [
        'id',
        'status',
        'type',
        'priority',
        'type',
        'stockOwnerId',
        'equipmentId',
        'carrierId'
    ],
    excludedListFields: [
        'id',
        'status',
        'type',
        'priority',
        'type',
        'stockOwnerId',
        'equipmentId',
        'carrierId'
    ],
    hiddenListFields: ['created', 'createdBy', 'modified', 'modifiedBy']
};
