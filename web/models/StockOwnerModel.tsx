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

export const StockOwnerModel: ModelType = {
    tableName: Table.StockOwner,
    resolverName: 'StockOwner',

    endpoints: {
        detail: 'stockOwner',
        list: 'stockOwners',
        create: 'createStockOwner',
        update: 'updateStockOwner',
        delete: 'deleteStockOwner'
    },

    displayedDetailsGroups: [
        {
            title: "general-title-group", field: ['id', 'code', 'name', 'status', 'logoUrl', 'exchangePrefix', 'awsAccessKeyId',
                'awsSecretAccessKey', 'created', 'createdBy', 'modified', 'modifiedBy']
        },
        { title: "address-headquarter-group", field: ['address1', 'postCode', 'city', 'country', 'contact', 'address2', 'address3', 'countryCode', 'phone', 'mobile', 'email'] },
        {
            title: "sender-address-title-group", field: ['senderName', 'senderContact', 'senderAddress1',
                'senderAddress2',
                'senderAddress3',
                'senderPostCode',
                'senderCity',
                'senderCountry',
                'senderCountryCode',
                'senderPhone',
                'senderMobile',
                'senderEmail',
            ]
        },

    ],
    listFields: [
        'id',
        'name',
        'code',
        'address1',
        'address2',
        'address3',
        'postCode',
        'city',
        'country',
        'countryCode',
        'status',
        'statusText',
        'contact',
        'phone',
        'mobile',
        'email',
        'senderName',
        'senderContact',
        'senderAddress1',
        'senderAddress2',
        'senderAddress3',
        'senderPostCode',
        'senderCity',
        'senderCountry',
        'senderCountryCode',
        'senderPhone',
        'senderMobile',
        'senderEmail',
        'exchangePrefix',
        'logoUrl',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],

    hiddenListFields: [
        'address2',
        'address3',
        'contact',
        'countryCode',
        'email',
        'phone',
        'mobile',
        'senderName',
        'senderContact',
        'senderAddress1',
        'senderAddress2',
        'senderAddress3',
        'senderPostCode',
        'senderCity',
        'senderCountry',
        'senderCountryCode',
        'senderPhone',
        'senderMobile',
        'logoUrl',
        'senderEmail',
        'exchangePrefix',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    displayedLabels: { name: 'label_stockOwner_name', code: 'label_stockOwner_code' },

    excludedListFields: ['id', 'status'],

    detailFields: [
        'id',
        'name',
        'code',
        'contact',
        'status',
        'statusText',
        'address1',
        'address2',
        'address3',
        'postCode',
        'exchangePrefix',
        'city',
        'country',
        'countryCode',
        'phone',
        'mobile',
        'email',
        'senderName',
        'senderContact',
        'senderAddress1',
        'senderAddress2',
        'senderAddress3',
        'senderPostCode',
        'senderCity',
        'senderCountry',
        'senderCountryCode',
        'senderPhone',
        'senderMobile',
        'senderEmail',
        'awsAccessKeyId',
        'awsSecretAccessKey',
        'logoUrl',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'status'],

    sortableFields: [
        'name',
        'code',
        'contact',
        'statusText',
        'address1',
        'address2',
        'address3',
        'postCode',
        'city',
        'country',
        'countryCode',
        'phone',
        'mobile',
        'email',
        'senderName',
        'senderContact',
        'senderAddress1',
        'senderAddress2',
        'senderAddress3',
        'senderPostCode',
        'senderCity',
        'senderCountry',
        'senderCountryCode',
        'senderPhone',
        'senderMobile',
        'senderEmail',
        'exchangePrefix',
        'logoUrl',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
