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

export const BuildingModel: ModelType = {
    tableName: Table.Building,
    resolverName: 'Building',

    endpoints: {
        list: 'buildings',
        export: 'exportBuildings',
        detail: 'building',
        create: 'createBuilding',
        update: 'updateBuilding',
        delete: 'deleteBuilding'
    },
    detailFields: [
        'id',
        'name',
        'statusText',
        'status',
        'entityAddress1',
        'entityAddress2',
        'entityAddress3',
        'entityPostCode',
        'entityCity',
        'entityCountry',
        'contactName',
        'contactName',
        'contactPhone',
        'contactMobile',
        'contactEmail',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    listFields: [
        'id',
        'name',
        'entityAddress1',
        'entityAddress2',
        'entityAddress3',
        'entityPostCode',
        'entityCity',
        'entityCountry',
        'statusText',
        'contactName',
        'contactName',
        'contactPhone',
        'contactMobile',
        'contactEmail',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'name',
        'entityAddress1',
        'entityAddress2',
        'entityAddress3',
        'entityPostCode',
        'entityCity',
        'entityCountry',
        'statusText',
        'contactName',
        'contactPhone',
        'contactMobile',
        'contactEmail',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    excludedDetailFields: ['id', 'status', 'contactName'],
    excludedListFields: ['id', 'status', 'contactName'],
    hiddenListFields: [
        'entityAddress2',
        'entityAddress3',
        'contactName',
        'contactPhone',
        'contactMobile',
        'contactEmail',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ]
};
