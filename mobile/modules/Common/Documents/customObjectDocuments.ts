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

// The resolver also reports `id` and `modified` for each custom object, and exposes
// the helpers that turn a resolved document into the immutable identity persisted in
// `appointment.extras.safetyChecklist.documents` at acceptance time. Without that snapshot the
// review screens re-run the rule and therefore show the CURRENT documents, so editing a safety
// document silently rewrites what every past signature appears to have accepted.

// Shared helpers used by the truck-driver / visitor document steps. The document rules
// (TRUCK_DRIVER_INFOS_DOCUMENTS / VISITOR_INFOS_DOCUMENTS) now output a flat list of custom-object
// NAMES instead of base64 blobs. We resolve those names to the actual documents by reading the
// `documentAttached` field of the matching custom objects in the "Truck and visitors documents"
// category.

import { gql } from 'graphql-request';
import { findCodeByScopeAndValue } from '@helpers';

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
    // Recursive flatten instead of Array.prototype.flat so nested legacy shapes are still handled
    // on runtimes where `.flat` may be missing (otherwise nested strings would be silently dropped).
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
    // Identity of the custom object behind the document. Optional so a caller building this
    // shape by hand (or an older cached payload) still type-checks.
    id?: string;
    // `modified` is the only version marker the custom object exposes, and it comes for free
    // with the query — it is what tells a past acceptance apart from the current document.
    modified?: string | null;
}

// The immutable identity of one document as actually presented to, and accepted by, the
// signer. Persisted in extras.safetyChecklist.documents; never recomputed from the rule afterwards.
export interface AcceptedDocument {
    id?: string;
    name: string;
    modified?: string | null;
    // length of the base64 payload as it was served
    size: number;
    // content fingerprint, ALWAYS prefixed by the algorithm that produced it
    fingerprint: string;
    // visitor flow only: the destination zone this document was resolved for
    zone?: string;
}

// FNV-1a 32-bit, offset basis 0x811c9dc5 / prime 0x01000193, computed with Math.imul so the
// multiply stays exact on 32 bits. Deliberately the textbook variant: the server side has to be
// able to recompute it. base64 is ASCII, so iterating code units is equivalent to iterating bytes.
const fnv1aHex = (input: string): string => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i) & 0xff;
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const toHex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

// Fingerprint of a document payload, prefixed by its algorithm.
// `crypto.subtle` only exists in a SECURE CONTEXT: a kiosk served over plain HTTP has no access to
// it, hence the mandatory FNV-1a fallback. No npm dependency is added for this on purpose.
export const fingerprintDocumentContent = async (base64: string): Promise<string> => {
    const subtle: any = (globalThis as any)?.crypto?.subtle;
    if (subtle?.digest && typeof TextEncoder !== 'undefined') {
        try {
            const digest: ArrayBuffer = await subtle.digest(
                'SHA-256',
                new TextEncoder().encode(base64)
            );
            return `sha256:${toHex(digest)}`;
        } catch {
            // insecure context / unsupported algorithm -> fall through to the fallback
        }
    }
    return `fnv1a:${fnv1aHex(base64)}`;
};

// Snapshot a list of resolved documents into their persisted identity.
export const toAcceptedDocuments = async (
    documents: CustomObjectDocument[],
    zone?: string
): Promise<AcceptedDocument[]> =>
    Promise.all(
        (documents ?? []).map(async (d) => ({
            ...(d.id !== undefined ? { id: d.id } : {}),
            name: d.name,
            modified: d.modified ?? null,
            size: d.documentAttached?.length ?? 0,
            fingerprint: await fingerprintDocumentContent(d.documentAttached ?? ''),
            ...(zone !== undefined ? { zone } : {})
        }))
    );

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
                    id
                    name
                    modified
                    documentAttached
                }
            }
        }
    `;

    const res: any = await graphqlRequestClient.request(query, { filters });
    const results: any[] = res?.customObjects?.results ?? [];
    // Keep the whole row, not just documentAttached, so id/modified survive the mapping.
    const byName = new Map<string, any>(results.map((r: any) => [r.name, r]));

    return names
        .map((name) => {
            const row: any = byName.get(name);
            return {
                id: row?.id,
                name,
                modified: row?.modified ?? null,
                documentAttached: row?.documentAttached as string
            };
        })
        .filter((d) => !!d.documentAttached);
};
