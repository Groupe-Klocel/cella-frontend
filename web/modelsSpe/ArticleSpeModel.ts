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
import { ArticleModelV2 } from 'models/ArticleModelV2';

/**
 * Generates an array of tuples representing specialized article model fields.
 *
 * Each tuple contains:
 * - A string indicating the field after which the new field should be inserted (or null to append at the end
 * or stay at the old position if already exists)
 * - The field name to insert or update as a string
 * - The field configuration object defining its properties and behavior
 *
 * @returns An array of tuples, each describing a specialized article field and its configuration.
 */
export function ArticleSpeModel(): [string | null, string, any][] {
    const genericArticleComment = {
        isListRequested: true,
        isDefaultHiddenList: false,
        isExcludedFromList: false,
        isSortable: true,
        searchingFormat: 'String',
        isDetailRequested: true,
        isExcludedFromDetail: false,
        detailGroup: null,
        link: 'articles/id',
        addEditFormat: 'String',
        addEditStep: null,
        maxLength: 70,
        displayName: 'supplier-article-code',
        isMandatory: false,
        minRule: null,
        maxRule: null,
        config: null,
        param: null,
        defaultSort: null,
        isEditDisabled: false
    };

    // const description = {
    //     ...ArticleModelV2.fieldsInfo['description'],
    //     displayName: 'articleDescName'
    // };

    return [
        ['name', 'genericArticleComment', genericArticleComment]
        // [null, 'description', description]
    ];
}
