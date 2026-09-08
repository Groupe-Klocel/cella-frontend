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

import { findCodeByScopeAndValue, showError, showSuccess } from '@helpers';
import { Modal } from 'antd';
import { gql } from 'graphql-request';

/**
 * Offers to re-pack ("recoliser") the estimated deliveries that carry the given articles.
 *
 * Changing a packaging changes what the cubing computes: dimensions, weight, preparation mode and
 * picking type all feed it. Deliveries already estimated with the previous packaging keep a result
 * that no longer matches. Sending them back to "to be estimated" is what makes the estimation run
 * again, so this asks the question right after a packaging was saved rather than leaving it to a
 * manual sweep of the delivery list.
 *
 * Only deliveries in "estimated" or "estimation error" are candidates: anything further along has
 * been packed or shipped, and anything earlier has not been estimated yet.
 *
 * @param articleIds articles of the packagings that were just modified. An empty list is a no-op -
 *        see the safety note on the mutation below, this is what keeps it bounded.
 */
export async function askToReestimateDeliveries({
    graphqlRequestClient,
    configs,
    t,
    articleIds
}: {
    graphqlRequestClient: any;
    configs: any[];
    t: (key: string, options?: any) => string;
    articleIds: (string | null | undefined)[];
}): Promise<void> {
    const targetArticles = Array.from(new Set((articleIds ?? []).filter(Boolean))) as string[];
    if (targetArticles.length === 0) return;

    // Never hard-code the numeric codes: the scope lives in the DB and a warehouse can renumber it.
    const code = (value: string) => {
        const raw = findCodeByScopeAndValue(configs ?? [], 'delivery_status', value);
        return raw != null ? parseInt(String(raw), 10) : undefined;
    };
    const toBeEstimated = code('to be estimated');
    const estimated = code('estimated');
    const estimationError = code('estimation error');

    // A warehouse whose delivery_status scope lacks these rows simply does not get the offer. The
    // packaging was saved either way, and that is the operation the user actually asked for.
    if (toBeEstimated == null || estimated == null || estimationError == null) return;

    // Built once and reused by the count and the update, so the number shown to the user and the
    // rows the mutation touches can never be described by two different filters.
    const filters = {
        status: [estimationError, estimated],
        // Singular relation name: `deliveryLines` is the GraphQL selection, `deliveryLine_ArticleId`
        // the filter key. The plural form answers "linked model deliveryLines not found".
        deliveryLine_ArticleId: targetArticles
    };

    const countQuery = gql`
        query reestimateCandidates($filters: DeliverySearchFilters) {
            deliveries(filters: $filters, itemsPerPage: 1) {
                count
            }
        }
    `;

    let count = 0;
    try {
        const result: any = await graphqlRequestClient.request(countQuery, { filters });
        count = result?.deliveries?.count ?? 0;
    } catch (error) {
        showError(t('messages:error-getting-data'));
        return;
    }

    // Nothing to re-pack: asking a question whose only answer changes nothing is just noise.
    if (count === 0) return;

    Modal.confirm({
        title: t('messages:reestimate-deliveries-confirm'),
        content: t('messages:reestimate-deliveries-count', { number: count }),
        okText: t('messages:confirm'),
        cancelText: t('messages:cancel'),
        onOk: async () => {
            // `ids` is required by the schema but an empty list is legal: the mutation then applies
            // to whatever `filters` selects (verified against the API). That is what keeps this to
            // one call whatever the volume - a warehouse can hold tens of thousands of estimated
            // deliveries - instead of paging every id back into the browser.
            //
            // SAFETY: the reach of this mutation is exactly `filters`. It must always carry both
            // the status restriction AND a non-empty article list; the early return above is what
            // guarantees the second. Widening or dropping either turns this into a warehouse-wide
            // status rewrite.
            const mutation = gql`
                mutation reestimateDeliveries(
                    $filters: DeliverySearchFilters
                    $input: UpdateDeliveryInput!
                ) {
                    updateDeliveries(ids: [], filters: $filters, input: $input)
                }
            `;
            try {
                const result: any = await graphqlRequestClient.request(mutation, {
                    filters,
                    input: { status: toBeEstimated }
                });
                if (result?.updateDeliveries !== true) {
                    showError(t('messages:error-update-data'));
                    return;
                }
                showSuccess(t('messages:reestimate-deliveries-done', { number: count }));
            } catch (error) {
                showError(t('messages:error-update-data'));
            }
        }
    });
}
