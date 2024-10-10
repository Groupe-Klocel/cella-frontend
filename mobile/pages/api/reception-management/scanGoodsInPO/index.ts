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
import { GraphQLResponseType } from '@helpers';

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
        filters: { name: scannedInfo },
        advancedFilters: {
            filter: {
                field: { type: 10104 },
                searchType: 'INFERIOR'
            }
        }
    };

    // configs.PURCHASE_ORDER_TYPE_L3_RETURN

    const purchaseOrderQuery = gql`
        query GetPurchaseOrders(
            $filters: PurchaseOrderSearchFilters
            $orderBy: [PurchaseOrderOrderByCriterion!]
            $advancedFilters: [PurchaseOrderAdvancedSearchFilters!]
        ) {
            purchaseOrders(
                filters: $filters
                orderBy: $orderBy
                advancedFilters: $advancedFilters
            ) {
                count
                results {
                    id
                    name
                    status
                    supplier
                    stockOwnerId
                    stockOwner {
                        id
                        name
                    }
                    purchaseOrderLines {
                        id
                        lineNumber
                        status
                        quantity
                        quantityMax
                        receivedQuantity
                        blockingStatus
                        blockingStatusText
                        stockOwnerId
                        stockOwner {
                            name
                        }
                        articleId
                        article {
                            id
                            name
                            description
                        }
                        roundLineDetails {
                            id
                            roundLineId
                            roundLine {
                                id
                                roundId
                                round {
                                    id
                                    name
                                    status
                                    status
                                    statusText
                                    priority
                                    priorityText
                                    nbPickArticle
                                    nbBox
                                    nbRoundLine
                                    pickingTime
                                    productivity
                                    expectedDeliveryDate
                                    roundLines {
                                        id
                                        lineNumber
                                        articleId
                                        status
                                        statusText
                                        roundLineDetails {
                                            id
                                            status
                                            statusText
                                            quantityToBeProcessed
                                            processedQuantity
                                        }
                                    }
                                }
                            }
                        }
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
        filters: { name: scannedInfo, category: configs['ROUND_CATEGORY_RECEPTION'] }
    };

    const goodsInQuery = gql`
        query GetRounds($filters: RoundSearchFilters, $orderBy: [RoundOrderByCriterion!]) {
            rounds(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    id
                    name
                    status
                    status
                    statusText
                    priority
                    priorityText
                    nbPickArticle
                    nbBox
                    nbRoundLine
                    pickingTime
                    productivity
                    expectedDeliveryDate
                    roundLines {
                        id
                        lineNumber
                        articleId
                        status
                        statusText
                        roundLineDetails {
                            id
                            status
                            statusText
                            quantityToBeProcessed
                            processedQuantity
                            roundLineId
                            purchaseOrderLineId
                            purchaseOrderLine {
                                id
                                stockOwnerId
                                purchaseOrderId
                                purchaseOrder {
                                    id
                                    name
                                    status
                                    supplier
                                    stockOwnerId
                                    stockOwner {
                                        id
                                        name
                                    }
                                    purchaseOrderLines {
                                        id
                                        lineNumber
                                        status
                                        quantity
                                        quantityMax
                                        receivedQuantity
                                        blockingStatus
                                        blockingStatusText
                                        stockOwnerId
                                        reservation
                                        stockOwner {
                                            name
                                        }
                                        articleId
                                        article {
                                            id
                                            name
                                            description
                                        }
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
                    }
                }
            }
        }
    `;

    const PoResponse: GraphQLResponseType = await graphqlRequestClient.request(
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
            const { purchaseOrderLines } = extractPoResponse;
            // extract Rounds as goodsIns
            let goodsIns: any[] = [];
            purchaseOrderLines.forEach((purchaseOrderLine: any) => {
                purchaseOrderLine.roundLineDetails.forEach((roundLineDetail: any) => {
                    let round = roundLineDetail.roundLine.round;
                    if (!goodsIns.some((r) => r.id === round.id)) {
                        goodsIns.push(round);
                    }
                });
            });

            const goodsInOnly = goodsIns && goodsIns.length !== 0 ? goodsIns : 'to-be-created';
            response = {
                goodsIns: goodsInOnly,
                purchaseOrder: extractPoResponse,
                responseType: 'purchaseOrder'
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
    } else {
        const GoodsInResponse: GraphQLResponseType = await graphqlRequestClient.request(
            goodsInQuery,
            goodsInFilter,
            requestHeader
        );

        if (GoodsInResponse && GoodsInResponse.rounds.count !== 0) {
            if (!GoodsInResponse) {
                res.status(500).json({
                    error: {
                        is_error: true,
                        code: 'FAPI_000001',
                        message: 'element not found'
                    }
                });
            }
            const extractGoodsInResponse = GoodsInResponse.rounds?.results[0];
            if (extractGoodsInResponse!.status <= configs.ROUND_STATUS_CLOSED) {
                const { roundLines, ...goodsInOnly } = extractGoodsInResponse;
                // extract Rounds as goodsIns
                let purchaseOrders: any[] = [];
                roundLines.forEach((roundLine: any) => {
                    roundLine.roundLineDetails.forEach((roundLineDetail: any) => {
                        let purchaseOrder = roundLineDetail.purchaseOrderLine.purchaseOrder;
                        if (!purchaseOrders.some((r) => r.id === purchaseOrder.id)) {
                            purchaseOrders.push(purchaseOrder);
                        }
                    });
                });
                response = {
                    goodsIns: [goodsInOnly],
                    purchaseOrder: purchaseOrders[0],
                    responseType: 'goodsIn'
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
