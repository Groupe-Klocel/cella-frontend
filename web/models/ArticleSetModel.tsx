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
import { ModelType, FormDataType } from './Models';

export const ArticleSetModel: ModelType = {
    tableName: Table.ArticleSet,
    resolverName: 'ArticleSet',

    endpoints: {
        list: 'articleSets',
        export: 'exportArticleSets',
        detail: 'articleSet',
        create: 'createArticleSet',
        update: 'updateArticleSet',
        delete: 'deleteArticleSet'
    },
    detailFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'name',
        'article{name}',
        'articleId',
        'article{additionalDescription}',
        'comment',
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
        'article{name}',
        'articleId',
        'article{additionalDescription}',
        'comment',
        'created',
        'createdBy',
        'modified',
        'modifiedBy'
    ],
    sortableFields: [
        'id',
        'stockOwnerId',
        'stockOwner{name}',
        'name',
        'article{name}',
        'articleId'
    ],
    excludedDetailFields: ['id', 'stockOwnerId', 'articleId'],
    excludedListFields: ['id', 'stockOwnerId', 'articleId'],
    hiddenListFields: ['comment', 'created', 'createdBy', 'modified', 'modifiedBy']
};
