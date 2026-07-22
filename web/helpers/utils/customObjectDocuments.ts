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

// Shared helpers for the truck-driver / visitor safety document rules. The document rules
// (TRUCK_DRIVER_INFOS_DOCUMENTS / VISITOR_INFOS_DOCUMENTS) output a flat list of custom-object
// NAMES; we resolve those names to the actual documents by reading the `documentAttached` field
// of the matching custom objects in the "Truck and visitors documents" category.
// Mirror of mobile/modules/Common/Documents/customObjectDocuments.ts — keep both in sync.

import { gql } from 'graphql-request';
import { findCodeByScopeAndValue } from './utils';

// The category (custom_object_category scope) that stores the truck/visitor security documents.
export const TRUCK_AND_VISITORS_DOCUMENTS_CATEGORY = 'Truck and visitors documents';

// Normalise an executeRule result into a flat list of custom-object names. Tolerant of the rule
// output being the array directly, wrapped under `documents.value` / `.value`, or (legacy) grouped
// as an array-of-arrays — anything nested is flattened and only non-empty strings are kept.
export const parseDocumentNames = (exec: any): string[] => {
    let raw: any = Array.isArray(exec)
        ? exec
        : (exec?.documents?.value ?? exec?.document_list?.value ?? exec?.value);
    if (raw == null && exec && typeof exec === 'object') {
        const first: any = Object.values(exec)[0];
        raw = first && typeof first === 'object' && 'value' in first ? first.value : first;
    }
    if (!Array.isArray(raw)) return [];
    const flatten = (arr: any[]): any[] =>
        arr.reduce(
            (acc: any[], v: any) => acc.concat(Array.isArray(v) ? flatten(v) : v),
            [] as any[]
        );
    return flatten(raw).filter((x: any) => typeof x === 'string' && x.length > 0);
};

export interface CustomObjectDocument {
    name: string;
    documentAttached: string;
}

// Fetch the documentAttached of each named custom object in the truck/visitor documents category,
// preserving the order given by the rule. Names without a match (or without a document) are dropped.
export const fetchCustomObjectDocuments = async (
    graphqlRequestClient: any,
    parameters: any[],
    names: string[]
): Promise<CustomObjectDocument[]> => {
    if (!names || names.length === 0) return [];

    const categoryCode = findCodeByScopeAndValue(
        parameters,
        'custom_object_category',
        TRUCK_AND_VISITORS_DOCUMENTS_CATEGORY
    );
    // Without the category we cannot disambiguate names across categories: return nothing rather
    // than risk matching an unrelated custom object that happens to share a name.
    if (categoryCode === undefined || categoryCode === null) return [];

    const categoryNumber = Number(categoryCode);
    const filters: any = {
        name: names,
        category: [Number.isNaN(categoryNumber) ? categoryCode : categoryNumber]
    };

    const query = gql`
        query customObjectsDocuments($filters: CustomObjectSearchFilters) {
            customObjects(filters: $filters, itemsPerPage: 1000) {
                results {
                    name
                    documentAttached
                }
            }
        }
    `;

    const res: any = await graphqlRequestClient.request(query, { filters });
    const results: any[] = res?.customObjects?.results ?? [];
    const byName = new Map<string, string>(results.map((r: any) => [r.name, r.documentAttached]));

    return names
        .map((name) => ({ name, documentAttached: byName.get(name) as string }))
        .filter((d) => !!d.documentAttached);
};

// URLs/data-URIs pass through; a bare base64 payload -> data-URI, MIME sniffed from the magic
// prefix (PNG/GIF/PDF, JPEG otherwise). Kept in sync with the mobile DocumentViewer.
export const toDocumentSrc = (src: string): string => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const mime = src.startsWith('iVBOR')
        ? 'image/png'
        : src.startsWith('R0lGOD')
          ? 'image/gif'
          : src.startsWith('JVBER')
            ? 'application/pdf'
            : 'image/jpeg';
    return `data:${mime};base64,${src}`;
};

export const isPdfDocument = (src: string): boolean =>
    /^data:application\/pdf/i.test(src) || /\.pdf(\?|#|$)/i.test(src);
