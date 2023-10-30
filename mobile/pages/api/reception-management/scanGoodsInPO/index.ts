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
import { gql, GraphQLClient } from 'graphql-request';
import type { NextApiRequest, NextApiResponse } from 'next';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';

const parseCookie = (str: string) =>
    str
        .split(';')
        .map((v) => v.split('='))
        .reduce((acc: any, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            return acc;
        }, {});

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const cookie = parseCookie(req.headers.cookie ?? '');
    const token = cookie['token'];

    const requestHeader = {
        authorization: `Bearer ${token}`
    };

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    const { scannedInfo } = req.body;

    const purchaseOrderFilter = {
        filters: { name: scannedInfo }
    };

    const purchaseOrderQuery = gql`
        query GetPurchaseOrders(
            $filters: PurchaseOrderSearchFilters
            $orderBy: [PurchaseOrderOrderByCriterion!]
        ) {
            purchaseOrders(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    id
                    name
                    status
                    supplier
                    purchaseOrderLines {
                        id
                        lineNumber
                        status
                        quantityMax
                        receivedQuantity
                        articleId
                    }
                    handlingUnitInbounds {
                        id
                        name
                        status
                        carrierBox
                        comment
                        handlingUnitId
                        handlingUnit {
                            name
                            barcode
                        }
                        handlingUnitContentInbounds {
                            id
                            receivedQuantity
                            missingQuantity
                            handlingUnitContent {
                                id
                                articleId
                                article {
                                    id
                                    name
                                    description
                                    baseUnitWeight
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const goodsInFilter = {
        filters: { name: scannedInfo }
    };

    const goodsInQuery = gql`
        query GetHandlingUnitInbounds(
            $filters: HandlingUnitInboundSearchFilters
            $orderBy: [HandlingUnitInboundOrderByCriterion!]
        ) {
            handlingUnitInbounds(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    id
                    name
                    status
                    carrierBox
                    comment
                    handlingUnitId
                    handlingUnit {
                        name
                        barcode
                    }
                    handlingUnitContentInbounds {
                        id
                        receivedQuantity
                        missingQuantity
                        handlingUnitContent {
                            id
                            articleId
                            article {
                                id
                                name
                                description
                                baseUnitWeight
                            }
                        }
                    }
                    purchaseOrderId
                    purchaseOrder {
                        id
                        name
                        status
                        supplier
                        purchaseOrderLines {
                            id
                            lineNumber
                            status
                            quantityMax
                            receivedQuantity
                            articleId
                        }
                    }
                }
            }
        }
    `;

    const PoResponse = await graphqlRequestClient.request(
        purchaseOrderQuery,
        purchaseOrderFilter,
        requestHeader
    );

    let response;
    if (PoResponse && PoResponse.purchaseOrders.count === 1) {
        const extractPoResponse = PoResponse.purchaseOrders?.results[0];
        if (
            extractPoResponse?.status <= configs.PURCHASE_ORDER_STATUS_IN_PROGRESS &&
            extractPoResponse?.status >= configs.PURCHASE_ORDER_STATUS_RECEIVED
        ) {
            const { handlingUnitInbounds, ...poOnly } = extractPoResponse;
            const handlingUnitInboundOnly =
                handlingUnitInbounds.length !== 0
                    ? { ...handlingUnitInbounds[0] }
                    : 'to-be-created';
            response = { handlingUnitInbound: handlingUnitInboundOnly, purchaseOrder: poOnly };
        } else {
            res.status(500).json({
                error: {
                    is_error: true,
                    code: 'FAPI_000002',
                    message: 'wrong element status'
                }
            });
        }
    } else {
        const HUIResponse = await graphqlRequestClient.request(
            goodsInQuery,
            goodsInFilter,
            requestHeader
        );

        if (HUIResponse && HUIResponse.handlingUnitInbounds.count !== 0) {
            if (!HUIResponse) {
                res.status(500).json({
                    error: {
                        is_error: true,
                        code: 'FAPI_000001',
                        message: 'element not found'
                    }
                });
            }
            if (HUIResponse.handlingUnitInbounds.count === 1) {
                const extractHUIResponse = HUIResponse.handlingUnitInbounds?.results[0];
                if (extractHUIResponse!.status <= configs.HANDLING_UNIT_INBOUND_STATUS_CLOSED) {
                    const { purchaseOrder, ...handlingUnitInboundOnly } = extractHUIResponse;
                    response = {
                        handlingUnitInbound: handlingUnitInboundOnly,
                        purchaseOrder: { ...purchaseOrder }
                    };
                } else {
                    res.status(500).json({
                        error: {
                            is_error: true,
                            code: 'FAPI_000002',
                            message: 'wrong element status'
                        }
                    });
                }
            }
        } else {
            res.status(500).json({
                error: {
                    is_error: true,
                    code: 'FAPI_000001',
                    message: 'element not found'
                }
            });
        }
    }

    if (response) {
        res.status(200).json({ response: response });
    }
};
