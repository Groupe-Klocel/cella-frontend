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
import { gql } from 'graphql-request';

// Shared between SelectInput and AutoCompleteInput (and any future form input that
// fetches its options from a list resolver and reports them up to a parent form).

/**
 * Report a field's options to the parent form's `setAllSubOptions` state.
 * The parent holds an array of `{ [itemName]: options }` objects; this upserts the
 * entry for `itemName`. No-op when `setAllSubOptions` is undefined.
 */
export function reportSubOptions(
    setAllSubOptions: any,
    itemName: string,
    options: any[]
): void {
    if (!setAllSubOptions) return;
    setAllSubOptions((prev: any) => {
        const existingIndex = prev.findIndex((obj: any) => obj.hasOwnProperty(itemName));
        if (existingIndex !== -1) {
            const newArray = [...prev];
            newArray[existingIndex] = { [itemName]: options };
            return newArray;
        }
        return [...prev, { [itemName]: options }];
    });
}

/**
 * Build the runtime `CustomListQuery` used to fetch a field's options from a list
 * resolver. `fields` is the raw selection set for `results` (e.g. `'id, name'`).
 * Set `withAdvancedFilters` to also accept/pass the `advancedFilters` argument.
 */
export function buildListQuery({
    tableName,
    queryName,
    fields,
    withAdvancedFilters = false
}: {
    tableName: string | undefined;
    queryName: string;
    fields: string;
    withAdvancedFilters?: boolean;
}): string {
    return gql`
        query CustomListQuery(
            $filters: ${tableName}SearchFilters
            ${withAdvancedFilters ? `$advancedFilters: [${tableName}AdvancedSearchFilters!]` : ''}
            $orderBy: [${tableName}OrderByCriterion!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            ${queryName}(
                filters: $filters
                ${withAdvancedFilters ? 'advancedFilters: $advancedFilters' : ''}
                orderBy: $orderBy
                page: $page
                itemsPerPage: $itemsPerPage
                language: $language
            ) {
                count
                results {
                    ${fields}
                }
            }
        }
    `;
}
