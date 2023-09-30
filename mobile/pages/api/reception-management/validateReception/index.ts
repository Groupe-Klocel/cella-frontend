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
import { generateStandardNumber } from '@helpers';
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

    // retrieve information from front
    const {
        handlingUnitInbound,
        purchaseOrder,
        handlingUnit,
        articleInfo,
        articleLuBarcodeId,
        poLine,
        remainQtyToReceive,
        stockStatus,
        movingQuantity,
        receptionLocation
    } = req.body;

    const movementCodes = {
        finalStatus: stockStatus.key,
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_STOCK,
        model: configs.MOVEMENT_MODEL_NORMAL,
        code: parameters.MOVEMENT_CODE_RECEPTION,
        priority: parameters.PRIORITY_NORMAL
    };

    //Transaction management
    const generateTransactionId = gql`
        mutation {
            generateTransactionId
        }
    `;
    const transactionIdResponse = await graphqlRequestClient.request(
        generateTransactionId,
        requestHeader
    );
    const lastTransactionId = transactionIdResponse.generateTransactionId;

    const rollbackTransaction = gql`
        mutation rollback($transactionId: String!) {
            rollbackTransaction(transactionId: $transactionId)
        }
    `;
    const rollbackVariable = {
        transactionId: lastTransactionId
    };

    let canRollbackTransaction = false;

    try {
        // retrieve default goodsin HU model
        const HUIdefaultModelQuery = gql`
            query GetHUIDefautlModel(
                $filters: HandlingUnitModelSearchFilters
                $orderBy: [HandlingUnitModelOrderByCriterion!]
            ) {
                handlingUnitModels(filters: $filters, orderBy: $orderBy) {
                    results {
                        id
                        name
                        type
                        category
                    }
                }
            }
        `;

        const HUIdefaultModelFilter = {
            filters: { name: 'DefaultHUIModel' }
        };

        const HUIdefaultModelResponse = await graphqlRequestClient.request(
            HUIdefaultModelQuery,
            HUIdefaultModelFilter,
            requestHeader
        );

        let createdHu;
        //create HU based on model and provided barcode
        if (HUIdefaultModelResponse) {
            const newHUVariables = {
                input: {
                    name: handlingUnit.barcode,
                    barcode: handlingUnit.barcode,
                    code: HUIdefaultModelResponse.handlingUnitModels.results[0].name,
                    category: HUIdefaultModelResponse.handlingUnitModels.results[0].category,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    type: HUIdefaultModelResponse.handlingUnitModels.results[0].type,
                    stockOwnerId: articleInfo.stockOwnerId,
                    locationId: receptionLocation.id,
                    lastTransactionId
                }
            };

            const createHUMutation = gql`
                mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                    createHandlingUnit(input: $input) {
                        id
                        name
                        lastTransactionId
                    }
                }
            `;
            const goodsInHuResult = await graphqlRequestClient.request(
                createHUMutation,
                newHUVariables,
                requestHeader
            );

            if (goodsInHuResult) {
                createdHu = goodsInHuResult.createHandlingUnit;
            }
        }

        //rollback transaction now exists in db and we can rollback if error occurs
        canRollbackTransaction = true;

        //if new goodsin needed
        let HuIToProcess;
        if (handlingUnitInbound === 'to-be-created') {
            const PrefixQuery = gql`
                query GetPrefix {
                    parameters(filters: { scope: "goodsin", code: "PREFIX" }) {
                        results {
                            value
                        }
                    }
                }
            `;

            const PrefixResponse = await graphqlRequestClient.request(PrefixQuery, requestHeader);

            const counterQuery = gql`
                mutation GetGoodsInCounter {
                    getNextCounter(counterCode: "GOODSIN_COUNTER")
                }
            `;

            const counterResponse = await graphqlRequestClient.request(counterQuery, requestHeader);

            const name = generateStandardNumber(
                PrefixResponse.parameters.results[0].value,
                counterResponse.getNextCounter
            );

            let HUInboundResult;
            if (name && createdHu) {
                const newHUInboundVariables = {
                    input: {
                        name,
                        status: configs.HANDLING_UNIT_INBOUND_STATUS_IN_PROGRESS,
                        handlingUnitId: createdHu.id,
                        purchaseOrderId: purchaseOrder.id,
                        lastTransactionId
                    }
                };
                const createHUInboundMutation = gql`
                    mutation createHUInbound($input: CreateHandlingUnitInboundInput!) {
                        createHandlingUnitInbound(input: $input) {
                            id
                            name
                            status
                            handlingUnitId
                            handlingUnit {
                                name
                                barcode
                            }
                            handlingUnitContentInbounds {
                                id
                            }
                        }
                    }
                `;
                HUInboundResult = await graphqlRequestClient.request(
                    createHUInboundMutation,
                    newHUInboundVariables,
                    requestHeader
                );
                //replace info in the handlingUnitInbound
                if (HUInboundResult) {
                    HuIToProcess = HUInboundResult.createHandlingUnitInbound;
                }
            }
        } else {
            HuIToProcess = handlingUnitInbound;
        }

        //1a-bis ...and HUC
        let HUContentId;
        if (HuIToProcess && createdHu) {
            const newHUContentVariables = {
                input: {
                    handlingUnitId: createdHu.id,
                    articleId: articleInfo.articleId,
                    articleLuBarcodeId,
                    stockStatus: stockStatus.key,
                    quantity: movingQuantity,
                    lastTransactionId
                }
            };
            const createHUContentMutation = gql`
                mutation createHUInbound($input: CreateHandlingUnitContentInput!) {
                    createHandlingUnitContent(input: $input) {
                        id
                    }
                }
            `;
            const HUContentResult = await graphqlRequestClient.request(
                createHUContentMutation,
                newHUContentVariables,
                requestHeader
            );
            if (HUContentResult) {
                HUContentId = HUContentResult.createHandlingUnitContent.id;
            }
            //1b Create HUCI
            if (HUContentResult) {
                let handlingUnitContentInbounds = [];
                const status =
                    remainQtyToReceive - movingQuantity === 0
                        ? configs.HANDLING_UNIT_CONTENT_INBOUND_STATUS_CLOSED
                        : configs.HANDLING_UNIT_CONTENT_INBOUND_STATUS_IN_PROGRESS;
                const newHUContentInboundVariables = {
                    input: {
                        lineNumber: HuIToProcess.handlingUnitContentInbounds.length + 1,
                        status,
                        purchaseOrderId: purchaseOrder.id,
                        handlingUnitContentId: HUContentId,
                        handlingUnitInboundId: HuIToProcess.id,
                        purchaseOrderLineId: poLine.id,
                        receivedQuantity: movingQuantity,
                        lastTransactionId
                    }
                };

                const createHUContentInboundMutation = gql`
                    mutation createHUContentInbound(
                        $input: CreateHandlingUnitContentInboundInput!
                    ) {
                        createHandlingUnitContentInbound(input: $input) {
                            id
                            receivedQuantity
                            handlingUnitContent {
                                id
                                articleId
                            }
                        }
                    }
                `;
                const HUContentInboundResult = await graphqlRequestClient.request(
                    createHUContentInboundMutation,
                    newHUContentInboundVariables,
                    requestHeader
                );
                if (HUContentInboundResult) {
                    handlingUnitContentInbounds.push(HUContentInboundResult);
                    HuIToProcess['handlingUnitContentInbounds'] = handlingUnitContentInbounds;
                }
            }
        }

        // purchaseOrderLine update Section
        const status =
            poLine.quantityMax - poLine.receivedQuantity - movingQuantity === 0
                ? configs.PURCHASE_ORDER_LINE_STATUS_CLOSED
                : configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS;

        const poLineUpdateInput = {
            id: poLine.id,
            input: {
                receivedQuantity: poLine.receivedQuantity + movingQuantity,
                status,
                lastTransactionId
            }
        };

        const updatePoLineMutation = gql`
            mutation updatePurchaseOrderLine($id: String!, $input: UpdatePurchaseOrderLineInput!) {
                updatePurchaseOrderLine(id: $id, input: $input) {
                    id
                    status
                }
            }
        `;

        const updatePoLineResponse = await graphqlRequestClient.request(
            updatePoLineMutation,
            poLineUpdateInput,
            requestHeader
        );

        //movement creation section
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;
        const movementVariables = {
            input: {
                articleIdStr: articleInfo.articleId,
                articleNameStr: articleInfo.articleName,
                stockOwnerIdStr: articleInfo.stockOwnerId,
                stockOwnerNameStr: articleInfo.stockOwnerName,
                quantity: movingQuantity,
                ...movementCodes,
                finalLocationIdStr: receptionLocation.id,
                finalLocationNameStr: receptionLocation.name,
                finalContentIdStr: HUContentId,
                finalHandlingUnitIdStr: createdHu.id,
                finalHandlingUnitNameStr: createdHu.name,
                purchaseOrderIdStr: purchaseOrder.id,
                purchaseOrderNameStr: purchaseOrder.name,
                handlingUnitInboundIdStr: HuIToProcess.id,
                handlingUnitInboundNameStr: HuIToProcess.name,
                lastTransactionId
            }
        };

        const resultMovement = await graphqlRequestClient.request(
            createMovement,
            movementVariables,
            requestHeader
        );
        //end movement creation section

        // retrieve PurchaseOrder info after update if needed
        let updatedPo;
        let sumExpectedQty = 0;
        let sumReceivedQty = movingQuantity;
        purchaseOrder.purchaseOrderLines.forEach((poline: any) => {
            sumExpectedQty += poline.quantityMax;
            sumReceivedQty += poline.receivedQuantity;
        });
        if (sumExpectedQty > sumReceivedQty) {
            const updatedPoQuery = gql`
                query GetUpdatedPo($id: String!) {
                    purchaseOrder(id: $id) {
                        id
                        name
                        status
                        supplier
                        purchaseOrderLines {
                            id
                            lineNumber
                            status
                            articleId
                            quantityMax
                            receivedQuantity
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
                                }
                            }
                        }
                    }
                }
            `;
            const updatedPoId = {
                id: purchaseOrder.id
            };

            const updatedPoResponse = await graphqlRequestClient.request(
                updatedPoQuery,
                updatedPoId,
                requestHeader
            );

            if (updatedPoResponse) {
                const { handlingUnitInbounds, ...poOnly } = updatedPoResponse.purchaseOrder;
                updatedPo = { handlingUnitInbound: handlingUnitInbounds[0], purchaseOrder: poOnly };
            }
        }
        //end updated PO section

        //merge results
        res.status(200).json({
            response: {
                HUInbound: HuIToProcess,
                createdHu,
                receivedPoLine: updatePoLineResponse,
                movement: resultMovement,
                updatedPo,
                lastTransactionId
            }
        });
    } catch (error) {
        console.log(error);
        if (canRollbackTransaction)
            await graphqlRequestClient.request(
                rollbackTransaction,
                rollbackVariable,
                requestHeader
            );
        res.status(500).json({ error });
    }
};
