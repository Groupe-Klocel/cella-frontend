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

export const PatternModel: ModelType = {
    tableName: Table.Pattern,
    resolverName: 'Pattern',

    endpoints: {
        list: 'patterns',
        detail: 'pattern',
        create: 'createPattern',
        update: 'updatePattern',
        delete: 'deletePattern'
    },
    detailFields: [
        'id',
        'stockOwner{name}',
        'extras',
        'name',
        'type',
        'typeText',
        'status',
        'stockOwnerId',
        'statusText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['stockOwnerId', 'status', 'extras', 'type'],
    listFields: [
        'id',
        'stockOwner{name}',
        'extras',
        'name',
        'type',
        'typeText',
        'status',
        'stockOwnerId',
        'statusText',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    hiddenListFields: ['extras', 'created', 'createdBy', 'modified', 'modifiedBy'],
    excludedListFields: ['id', 'stockOwnerId', 'status', 'type', 'extras'],
    sortableFields: ['stockOwner_name', 'name', 'typeText', 'statusText']
};
