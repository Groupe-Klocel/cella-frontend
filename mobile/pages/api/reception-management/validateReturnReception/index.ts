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

    // retrieve information from front
    const {
        originBlock,
        finalLocation,
        purchaseOrder,
        movingQuantity,
        existingFinalHU,
        resType,
        originHUC,
        feature,
        stockOwner,
        articleInfos,
        featureCode
    } = req.body;

    console.log('input', req.body);

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

    let retAlbiLocation = null;
    let finalHandlingUnit = null;
    let finalHandlingUnitContent = null;

    try {
        // get RET_ALBI_LOCATION if not in body
        if (!finalLocation?.id) {
            const retAlbiLocationParameterQuery = gql`
                query parameters($filters: ParameterSearchFilters) {
                    parameters(filters: $filters) {
                        results {
                            code
                            value
                            scope
                        }
                    }
                }
            `;

            const retAlbiLocationParameterVariables = {
                filters: { scope: 'inbound', code: 'RET_ALBI_LOCATION' }
            };

            const retAlbiLocationParameterResult = await graphqlRequestClient.request(
                retAlbiLocationParameterQuery,
                retAlbiLocationParameterVariables,
                requestHeader
            );

            const retAlbiLocationQuery = gql`
                query locations($filters: LocationSearchFilters) {
                    locations(filters: $filters) {
                        results {
                            id
                            name
                        }
                    }
                }
            `;

            const retAlbiLocationVariables = {
                filters: { name: retAlbiLocationParameterResult.parameters.results[0].value }
            };

            const retAlbiLocationResult = await graphqlRequestClient.request(
                retAlbiLocationQuery,
                retAlbiLocationVariables,
                requestHeader
            );
            retAlbiLocation = retAlbiLocationResult.locations.results[0];
        } else {
            retAlbiLocation = finalLocation;
        }

        // 1- Check Final HU
        if (!existingFinalHU?.id) {
            // 1a- HU does not exist, we create it
            const createHUMutation = gql`
                mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                    createHandlingUnit(input: $input) {
                        id
                        name
                        barcode
                        type
                        category
                        locationId
                        location {
                            id
                            name
                            barcode
                        }
                        stockOwnerId
                        handlingUnitContents {
                            id
                            articleId
                            quantity
                            handlingUnitContentFeatures {
                                id
                                value
                            }
                        }
                    }
                }
            `;

            const createHUvariables = {
                input: {
                    name: existingFinalHU.name,
                    barcode: existingFinalHU.name,
                    code: existingFinalHU.name,
                    type: parameters.HANDLING_UNIT_TYPE_BOX,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                    locationId: retAlbiLocation.id,
                    lastTransactionId
                }
            };

            const createdHu = await graphqlRequestClient.request(
                createHUMutation,
                createHUvariables
            );

            console.log('createdHu', createdHu);

            finalHandlingUnit = createdHu.createHandlingUnit;
            canRollbackTransaction = true;
        } else {
            // 1b- Final HU exists
            finalHandlingUnit = existingFinalHU;
            console.log('finalHU', finalHandlingUnit);
        }

        // 2- Check Final HUC
        const handlingUnitContentQuery = gql`
            query handlingUnitContents($filters: HandlingUnitContentSearchFilters) {
                handlingUnitContents(filters: $filters) {
                    count
                    results {
                        id
                        articleId
                        quantity
                    }
                }
            }
        `;

        const handlingUnitContentVariables = {
            filters: {
                handlingUnitId: finalHandlingUnit.id,
                articleId: articleInfos.id,
                stockOwnerId: stockOwner.id
            }
        };

        const handlingUnitContentResult = await graphqlRequestClient.request(
            handlingUnitContentQuery,
            handlingUnitContentVariables,
            requestHeader
        );

        if (handlingUnitContentResult?.handlingUnitContents?.count <= 0) {
            // 2a- Create HUC with articleId = scanned article (if it does not exist)
            const createHUCMutation = gql`
                mutation createHandlingUnitContent($input: CreateHandlingUnitContentInput!) {
                    createHandlingUnitContent(input: $input) {
                        id
                        articleId
                        handlingUnitId
                        quantity
                    }
                }
            `;

            const createHUCvariables = {
                input: {
                    handlingUnitId: finalHandlingUnit.id,
                    articleId: articleInfos.id,
                    quantity: movingQuantity,
                    stockOwnerId: stockOwner.id,
                    stockStatus: parameters.STOCK_STATUSES_RETOUR,
                    lastTransactionId
                }
            };

            const createdHuc = await graphqlRequestClient.request(
                createHUCMutation,
                createHUCvariables
            );

            console.log('createdHuc', createdHuc);

            finalHandlingUnitContent = createdHuc.createHandlingUnitContent;
        } else {
            finalHandlingUnitContent = handlingUnitContentResult?.handlingUnitContents?.results[0];
            console.log('finalHandlingUnitContentId', finalHandlingUnitContent);

            // 2c- final HUC exists, we update its quantity
            const updateFinalHUCMutation = gql`
                mutation updateHandlingUnitContent(
                    $id: String!
                    $input: UpdateHandlingUnitContentInput!
                ) {
                    updateHandlingUnitContent(id: $id, input: $input) {
                        id
                        lastTransactionId
                    }
                }
            `;

            const newHUCQuantity = finalHandlingUnitContent.quantity + movingQuantity;
            finalHandlingUnitContent.quantity = newHUCQuantity;

            const updateFinalHUCvariable = {
                id: finalHandlingUnitContent.id,
                input: {
                    quantity: newHUCQuantity,
                    lastTransactionId
                }
            };
            const updatedFinalHUC = await graphqlRequestClient.request(
                updateFinalHUCMutation,
                updateFinalHUCvariable
            );
        }

        canRollbackTransaction = true;

        console.log('resType', resType);

        // 3- Create/Update HUCF
        if (resType === 'serialNumber') {
            if (!feature?.id) {
                // 3a- unknown ID, we create a new HUCF
                const createHUCFMutation = gql`
                    mutation createHandlingUnitContentFeature(
                        $input: CreateHandlingUnitContentFeatureInput!
                    ) {
                        createHandlingUnitContentFeature(input: $input) {
                            id
                            lastTransactionId
                        }
                    }
                `;

                const createHUCFvariable = {
                    input: {
                        handlingUnitContentId: finalHandlingUnitContent.id,
                        featureCodeId: featureCode.id,
                        value: feature.value,
                        lastTransactionId
                    }
                };

                const createdHUCF = await graphqlRequestClient.request(
                    createHUCFMutation,
                    createHUCFvariable
                );

                console.log('createdHUCF', createdHUCF);
            } else {
                // 3b- known ID, we update the HUCF
                const updateHUCFMutation = gql`
                    mutation updateHandlingUnitContentFeature(
                        $id: String!
                        $input: UpdateHandlingUnitContentFeatureInput!
                    ) {
                        updateHandlingUnitContentFeature(id: $id, input: $input) {
                            id
                            lastTransactionId
                        }
                    }
                `;

                const updateHUCFvariable = {
                    id: feature.id,
                    input: {
                        handlingUnitContentId: finalHandlingUnitContent.id,
                        lastTransactionId
                    }
                };

                const updatedHUCF = await graphqlRequestClient.request(
                    updateHUCFMutation,
                    updateHUCFvariable
                );

                console.log('updatedHUCF', updatedHUCF);
            }
        }

        let updatedHUC = null;

        // 4- Update origin HUC (if it exists)
        if (originHUC?.id) {
            const updateHUCMutation = gql`
                mutation updateHandlingUnitContent(
                    $id: String!
                    $input: UpdateHandlingUnitContentInput!
                ) {
                    updateHandlingUnitContent(id: $id, input: $input) {
                        id
                        lastTransactionId
                    }
                }
            `;

            const stockQuantity = originHUC?.quantity - movingQuantity;

            const updateHUCvariable = {
                id: originHUC?.id,
                input: {
                    quantity: stockQuantity,
                    lastTransactionId
                }
            };

            updatedHUC = await graphqlRequestClient.request(updateHUCMutation, updateHUCvariable);

            console.log('updatedOriginHUC', updatedHUC);
        }

        // 5- Check Purchase Order Line
        const purchaseOrderLineQuery = gql`
            query purchaseOrderLines($filters: PurchaseOrderLineSearchFilters) {
                purchaseOrderLines(filters: $filters) {
                    count
                    results {
                        id
                        purchaseOrderId
                        status
                        blockingStatus
                        quantity
                        quantityMax
                        receivedQuantity
                        articleId
                        lineNumber
                    }
                }
            }
        `;

        const purchaseOrderLineVariables = {
            filters: {
                purchaseOrderId: purchaseOrder.id,
                articleId: articleInfos.id,
                stockOwnerId: stockOwner.id
            }
        };

        const purchaseOrderLineResult = await graphqlRequestClient.request(
            purchaseOrderLineQuery,
            purchaseOrderLineVariables,
            requestHeader
        );

        if (!purchaseOrderLineResult || purchaseOrderLineResult?.purchaseOrderLines?.count <= 0) {
            // 5a- POLine does not exists, we create it
            const createPOLineMutation = gql`
                mutation createPurchaseOrderLine($input: CreatePurchaseOrderLineInput!) {
                    createPurchaseOrderLine(input: $input) {
                        id
                        purchaseOrderId
                        status
                        blockingStatus
                        quantity
                        receivedQuantity
                        articleId
                        lineNumber
                    }
                }
            `;

            const createPOLinevariable = {
                input: {
                    quantity: movingQuantity,
                    receivedQuantity: movingQuantity,
                    blockingStatus: parameters.STOCK_STATUSES_RETOUR,
                    status: configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS,
                    stockOwnerId: stockOwner.id,
                    purchaseOrderId: purchaseOrder.id,
                    articleId: articleInfos.id,
                    lastTransactionId
                }
            };

            const createdPOLine = await graphqlRequestClient.request(
                createPOLineMutation,
                createPOLinevariable
            );
        } else {
            // 5b- POLine exists, we update it
            const updatePOLineMutation = gql`
                mutation updatePurchaseOrderLine(
                    $id: String!
                    $input: UpdatePurchaseOrderLineInput!
                ) {
                    updatePurchaseOrderLine(id: $id, input: $input) {
                        id
                        purchaseOrderId
                        status
                        blockingStatus
                        quantity
                        receivedQuantity
                        articleId
                        lineNumber
                    }
                }
            `;

            const newPOLineQuantity =
                purchaseOrderLineResult?.purchaseOrderLines?.results[0].quantity + movingQuantity;
            const newPOLineReceivedQuantity =
                purchaseOrderLineResult?.purchaseOrderLines?.results[0].receivedQuantity +
                movingQuantity;
            const newPOLineQuantityMax =
                purchaseOrderLineResult?.purchaseOrderLines?.results[0].quantityMax +
                movingQuantity;

            const updatePOLinevariable = {
                id: purchaseOrderLineResult?.purchaseOrderLines?.results[0].id,
                input: {
                    quantity: newPOLineQuantity,
                    quantityMax: newPOLineQuantityMax,
                    receivedQuantity: newPOLineReceivedQuantity,
                    lastTransactionId
                }
            };

            const updatedPOLine = await graphqlRequestClient.request(
                updatePOLineMutation,
                updatePOLinevariable
            );
        }

        // 6- Create Movement (from clientBlock to retAlbiLocation)
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;
        const movementCodes = {
            initialStatus: 14020,
            finalStatus: parameters.STOCK_STATUSES_RETOUR,
            status: configs.MOVEMENT_STATUS_VALIDATED,
            type: configs.MOVEMENT_TYPE_PREPARATION,
            model: configs.MOVEMENT_MODEL_NORMAL,
            code: parameters['MOVEMENT_CODE_STOCK_RE-INTEGRATION'],
            priority: parameters.PRIORITY_NORMAL
        };
        const movementVariables = {
            input: {
                articleIdStr: articleInfos.id,
                articleNameStr: articleInfos.name,
                stockOwnerIdStr: stockOwner?.id,
                stockOwnerNameStr: stockOwner?.name,
                quantity: movingQuantity,
                finalQuantity: movingQuantity,
                purchaseOrderIdStr: purchaseOrder.id,
                purchaseOrderNameStr: purchaseOrder.name,
                ...movementCodes,
                originalLocationIdStr: originBlock.locations[0].id,
                originalLocationNameStr: originBlock.locations[0].name,
                originalHandlingUnitIdStr: originHUC?.handlingUnit?.id,
                originalHandlingUnitNameStr: originHUC?.handlingUnit?.name,
                originalContentIdStr: originHUC?.id,
                finalLocationIdStr: retAlbiLocation.id,
                finalLocationNameStr: retAlbiLocation.name,
                finalHandlingUnitIdStr: finalHandlingUnit.id,
                finalHandlingUnitNameStr: finalHandlingUnit.name,
                finalContentIdStr: finalHandlingUnitContent.id,
                lastTransactionId
            }
        };

        const resultMovement = await graphqlRequestClient.request(
            createMovement,
            movementVariables,
            requestHeader
        );
        //end movement creation section

        // 6a- Get updated HU
        const updatedFinalHUQuery = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    results {
                        id
                        name
                        type
                        typeText
                        barcode
                        category
                        categoryText
                        code
                        parentHandlingUnitId
                        parentHandlingUnit {
                            id
                            name
                            type
                            typeText
                        }
                        childrenHandlingUnits {
                            id
                            name
                            type
                            typeText
                            category
                            categoryText
                        }
                        reservation
                        status
                        stockOwnerId
                        stockOwner {
                            name
                        }
                        locationId
                        location {
                            name
                            category
                            categoryText
                        }
                        handlingUnitContents {
                            id
                            quantity
                            reservation
                            stockStatus
                            stockStatusText
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                            }
                            handlingUnitContentFeatures {
                                id
                                featureCode {
                                    name
                                    unique
                                }
                                value
                            }
                        }
                    }
                }
            }
        `;

        const updatedFinalHUVariables = {
            filters: { id: finalHandlingUnit.id }
        };

        const updatedFinalHUResult = await graphqlRequestClient.request(
            updatedFinalHUQuery,
            updatedFinalHUVariables,
            requestHeader
        );

        // 6b- Get updated PO
        const updatedPOQuery = gql`
            query purchaseOrders($filters: PurchaseOrderSearchFilters) {
                purchaseOrders(filters: $filters) {
                    count
                    results {
                        id
                        name
                        status
                        statusText
                        purchaseOrderLines {
                            id
                            purchaseOrderId
                            status
                            blockingStatus
                            quantity
                            receivedQuantity
                            articleId
                            lineNumber
                        }
                    }
                }
            }
        `;

        const updatedPOVariables = {
            filters: { id: purchaseOrder.id }
        };

        const updatedPOResult = await graphqlRequestClient.request(
            updatedPOQuery,
            updatedPOVariables,
            requestHeader
        );

        //merge results
        res.status(200).json({
            response: {
                updatedFinalHU: updatedFinalHUResult?.handlingUnits?.results[0],
                updatedPO: updatedPOResult?.purchaseOrders?.results[0],
                retAlbiLocation,
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
