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

export const ConversionModel: ModelType = {
    tableName: Table.Conversion,
    resolverName: 'Conversion',

    endpoints: {
        list: 'conversions',
        export: 'exportConversions',
        detail: 'conversion',
        create: 'createConversion',
        update: 'updateConversion',
        delete: 'deleteConversion'
    },
    detailFields: [
        'id',
        'statusText',
        'status',
        'stockOwnerId',
        'stockOwner{name}',
        'type',
        'typeText',
        'entry1',
        'exit1',
        'entry2',
        'exit2',
        'entry3',
        'exit3',
        'entry4',
        'exit4',
        'entry5',
        'exit5',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'stockOwner{name}',
        'typeText',
        'statusText',
        'entry1',
        'exit1',
        'entry2',
        'exit2',
        'entry3',
        'exit3',
        'entry4',
        'exit4',
        'entry5',
        'exit5',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'stockOwner{name}',
        'typeText',
        'statusText',
        'entry1',
        'exit1',
        'entry2',
        'exit2',
        'entry3',
        'exit3',
        'entry4',
        'exit4',
        'entry5',
        'exit5',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['status', 'id', 'stockOwnerId', 'type'],
    excludedListFields: ['status', 'id', 'stockOwnerId', 'type'],
    hiddenListFields: [
        'entry2',
        'exit2',
        'entry3',
        'exit3',
        'entry4',
        'exit4',
        'entry5',
        'exit5',
        'extras',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
