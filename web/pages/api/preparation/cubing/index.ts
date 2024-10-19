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
/* eslint-disable prefer-const */
import { GraphQLClient, gql } from 'graphql-request';
import { NextApiRequest, NextApiResponse } from 'next';
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
        // 'X-API-fake': 'fake',
        // "X-API-seed": "same",
        authorization: `Bearer ${token}`
    };

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    // START //

    const containerInput: Array<Object> = [];
    const contentsInput: Array<Object> = [];
    let contentConfigInput: Array<Object> = [];
    let contentStockInput: Array<Object> = [];

    // 1a- Get HandlingUnitModels data
    const handlingUnitModelsQuery = gql`
        query handlingUnitModels(
            $filters: HandlingUnitModelSearchFilters
            $orderBy: [HandlingUnitModelOrderByCriterion!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            handlingUnitModels(
                filters: $filters
                orderBy: $orderBy
                page: $page
                itemsPerPage: $itemsPerPage
                language: $language
            ) {
                results {
                    id
                    status
                    name
                    weight
                    closureWeight
                    length
                    height
                    width
                    default
                    system
                }
            }
        }
    `;
    const handlingUnitModelsVariables = {
        filters: {},
        orderBy: {
            field: 'name',
            ascending: false
        },
        page: 1,
        itemsPerPage: 100
    };

    const handlingUnitModelsResults: any = await graphqlRequestClient
        .request(handlingUnitModelsQuery, handlingUnitModelsVariables, requestHeader)
        .catch((error: any) => {
            if (error.response.errors[0].extensions) {
                res.status(500).json({
                    error: {
                        is_error: error.response.errors[0].extensions.is_error,
                        code: error.response.errors[0].extensions.code,
                        message: error.response.errors[0].message,
                        variables: error.response.errors[0].extensions.variables,
                        exception: error.response.errors[0].extensions.exception
                    }
                });
            } else {
                res.status(500).json({
                    error: error
                });
            }
        });

    for (const delivery of req.body.deliveries) {
        //Transaction management
        const generateTransactionId = gql`
            mutation {
                generateTransactionId
            }
        `;
        const transactionIdResponse: GraphQLResponseType = await graphqlRequestClient.request(
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

        // 1b- Get delivery data and check its status
        const deliveryQuery = gql`
            query delivery($id: String!) {
                delivery(id: $id) {
                    id
                    status
                    name
                    carrierShippingModeId
                    carrierShippingMode {
                        carrierId
                    }
                    stockOwnerId
                    deliveryLines {
                        id
                        quantityToBePicked
                        stockOwnerId
                        deliveryId
                        article {
                            id
                            description
                            name
                            baseUnitWeight
                            baseUnitPicking
                            baseUnitRotation
                            cubingType
                            endOfLife
                            articleLus {
                                id
                                stockOwnerId
                                length
                                width
                                height
                                baseUnitWeight
                                rotation
                                quantity
                                replenish
                                articleId
                                preparationMode
                            }
                            handlingUnitContents {
                                id
                                quantity
                                reservation
                                stockStatus
                                articleId
                                handlingUnitId
                                handlingUnit {
                                    id
                                    name
                                    category
                                    status
                                    code
                                    reservation
                                    locationId
                                }
                            }
                        }
                    }
                }
            }
        `;

        const deliveryVariables = {
            id: delivery.id
        };

        const deliveryResult: any = await graphqlRequestClient
            .request(deliveryQuery, deliveryVariables, requestHeader)
            .catch((error: any) => {
                if (error.response.errors[0].extensions) {
                    res.status(500).json({
                        error: {
                            is_error: error.response.errors[0].extensions.is_error,
                            code: error.response.errors[0].extensions.code,
                            message: error.response.errors[0].message,
                            variables: error.response.errors[0].extensions.variables,
                            exception: error.response.errors[0].extensions.exception
                        }
                    });
                } else {
                    res.status(500).json({
                        error: error
                    });
                }
            });

        if (deliveryResult.delivery.status >= configs.DELIVERY_STATUS_STARTED) {
            continue;
        }

        if (deliveryResult.delivery.status == configs.DELIVERY_STATUS_ESTIMATED) {
            // Delete existing Boxes and Box Lines
            const deleteDeliveryBoxesVariables = {
                deliveryId: delivery.id
            };

            const deleteDeliveryBoxesMutation = gql`
                mutation deleteDeliveryBoxes($deliveryId: String!) {
                    deleteDeliveryBoxes(deliveryId: $deliveryId)
                }
            `;
            const deletedDeliveryBoxes = await graphqlRequestClient
                .request(deleteDeliveryBoxesMutation, deleteDeliveryBoxesVariables, requestHeader)
                .catch((error: any) => {
                    if (error.response.errors[0].extensions) {
                        res.status(500).json({
                            error: {
                                is_error: error.response.errors[0].extensions.is_error,
                                code: error.response.errors[0].extensions.code,
                                message: error.response.errors[0].message,
                                variables: error.response.errors[0].extensions.variables,
                                exception: error.response.errors[0].extensions.exception
                            }
                        });
                    } else {
                        res.status(500).json({
                            error: error
                        });
                    }
                });
        }

        // 2- Update Delivery status -> TO_BE_ESTIMATED + Update Delivery_lines status -> TO_BE_ESTIMATED
        const updateDeliveryVariables = {
            id: delivery.id,
            input: { status: configs.DELIVERY_STATUS_TO_BE_ESTIMATED }
        };

        const updateDeliveryMutation = gql`
            mutation updateDelivery($id: String!, $input: UpdateDeliveryInput!) {
                updateDelivery(id: $id, input: $input) {
                    id
                }
            }
        `;
        const updatedDelivery = await graphqlRequestClient
            .request(updateDeliveryMutation, updateDeliveryVariables, requestHeader)
            .catch((error: any) => {
                if (error.response.errors[0].extensions) {
                    res.status(500).json({
                        error: {
                            is_error: error.response.errors[0].extensions.is_error,
                            code: error.response.errors[0].extensions.code,
                            message: error.response.errors[0].message,
                            variables: error.response.errors[0].extensions.variables,
                            exception: error.response.errors[0].extensions.exception
                        }
                    });
                } else {
                    res.status(500).json({
                        error: error
                    });
                }
            });

        // 3a- Set inputs for cube mutation
        // contentsInput
        for (const deliveryLine of deliveryResult.delivery.deliveryLines) {
            contentConfigInput = [];
            for (const articleLu of deliveryLine.article.articleLus) {
                const contentConfig = {
                    configId: articleLu.id,
                    configName: deliveryLine.article.name,
                    priority: 0, // 0 if cubing, equipment.priority if round association
                    stockownerId: articleLu.stockOwnerId,
                    criterias: null,
                    allowedCriterias: null,
                    qty: articleLu.quantity,
                    length: articleLu.length,
                    width: articleLu.width,
                    height: articleLu.height,
                    weight: articleLu.baseUnitWeight,
                    asIs: false,
                    emptyContent: false,
                    allowedContainerIds: null,
                    customConfig: null,
                    preparationMode: articleLu.preparationMode
                };
                contentConfigInput.push(contentConfig);
            }

            contentStockInput = [];
            for (const huc of deliveryLine.article.handlingUnitContents) {
                if (huc.handlingUnit.category == parameters.HANDLING_UNIT_CATEGORY_STOCK) {
                    const contentStock = {
                        stockId: huc.id,
                        stockLocation: huc.handlingUnit.locationId,
                        stockQty: huc.quantity,
                        stockConfigId: null,
                        stockPriority: 0, // 0 if cubing, equipment.priority if round association
                        stockCustomConfig: null
                    };
                    contentStockInput.push(contentStock);
                }
            }
            const contentInput = {
                id: deliveryLine.id,
                articleId: deliveryLine.article.id,
                name: deliveryLine.article.name,
                priority: 0, // 0 if cubing, equipment.priority if round association
                qty: deliveryLine.quantityToBePicked,
                configs: contentConfigInput,
                stock: contentStockInput
            };
            contentsInput.push(contentInput);
        }

        // containerInput
        for (const handlingUnitModel of handlingUnitModelsResults.handlingUnitModels.results) {
            const container = {
                id: handlingUnitModel.id,
                name: handlingUnitModel.name,
                priority: 0, // 0 if cubing, equipment.priority if round association
                length: handlingUnitModel.length,
                width: handlingUnitModel.width,
                height: handlingUnitModel.height,
                emptyWeight: handlingUnitModel.weight,
                closingWeight: handlingUnitModel.closureWeight,
                strict: false,
                allowedCriterias: null,
                limits: null
            };
            containerInput.push(container);
        }

        // configInput
        const configInput = {
            checkStockQty: true,
            compacting: false,
            precision: 1,
            customConfig: null
        };

        // cubingInput
        const cubingInput = {
            contents: contentsInput,
            containers: containerInput,
            config: configInput
        };

        // 3b- Calling cube mutation
        const cubeVariables = {
            input: cubingInput
        };

        const cubeMutation = gql`
            mutation cube($input: CubingInput!) {
                cube(input: $input) {
                    success
                    totalContent
                    totalWeight
                    totalVolume
                    errorDetail
                    containers {
                        id
                        containerId
                        containerName
                        length
                        width
                        height
                        emptyWeight
                        closingWeight
                        totalWeight
                        order
                        contents {
                            id
                            contentId
                            contentArticleId
                            contentName
                            contentConfigId
                            contentConfigName
                            contentPreparationMode
                            qty
                            contentConfigQty
                            volume
                            weight
                            stock {
                                stockId
                                stockLocation
                                stockQty
                            }
                        }
                    }
                }
            }
        `;

        let cubeResult: any = undefined;

        try {
            cubeResult = await graphqlRequestClient.request(
                cubeMutation,
                cubeVariables,
                requestHeader
            );
        } catch (error: any) {
            if (error.response.errors[0].extensions) {
                res.status(500).json({
                    error: {
                        is_error: error.response.errors[0].extensions.is_error,
                        code: error.response.errors[0].extensions.code,
                        message: error.response.errors[0].message,
                        variables: error.response.errors[0].extensions.variables,
                        exception: error.response.errors[0].extensions.exception
                    }
                });
            } else {
                res.status(500).json({
                    error: error
                });
            }
        }

        if (!cubeResult?.cube.success) {
            console.log('Cubing-error', cubeResult.cube.errorDetail); // for debug only
            res.status(500).json({
                error: {
                    is_error: true,
                    code: 'CUBING-000100',
                    message: cubeResult?.cube.errorDetail,
                    variables: { deliveryId: delivery.id }
                }
            });
        }

        try {
            for (const container of cubeResult.cube.containers) {
                let finalHuResult: { [k: string]: any } | null;
                let finalHuoResult: { [k: string]: any } | null;
                // SSCC creation
                const resSSCC = await fetch(
                    `${process.env.NEXT_PUBLIC_WMS_URL}/api/handling-units/sscc-generator`,
                    {
                        method: 'POST',
                        headers: {
                            origin: `${req.headers.origin}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            extensionDigit: 0,
                            requestHeader
                        })
                    }
                );
                const SSCC = await resSSCC.json();

                if (SSCC) {
                    // 4a- Create the box
                    // Handling Unit creation
                    const newHUVariables = {
                        input: {
                            name: SSCC.response,
                            code: container.containerName,
                            barcode: SSCC.response,
                            category: parameters.HANDLING_UNIT_CATEGORY_OUTBOUND,
                            status: configs.HANDLING_UNIT_STATUS_CREATED,
                            type: parameters.HANDLING_UNIT_TYPE_BOX,
                            stockOwnerId: deliveryResult.delivery.stockOwnerId,
                            length: container.length,
                            width: container.width,
                            height: container.height,
                            weight: container.totalWeight,
                            lastTransactionId
                        }
                    };
                    const createHUMutation = gql`
                        mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                            createHandlingUnit(input: $input) {
                                id
                                lastTransactionId
                            }
                        }
                    `;
                    finalHuResult = await graphqlRequestClient.request(
                        createHUMutation,
                        newHUVariables,
                        requestHeader
                    );
                    // Handling Unit Outbound creation
                    if (finalHuResult) {
                        const newHUOVariables = {
                            input: {
                                name: SSCC.response,
                                status: configs.HANDLING_UNIT_OUTBOUND_STATUS_ESTIMATED,
                                deliveryId: deliveryResult.delivery.id,
                                stockOwnerId: deliveryResult.delivery.stockOwnerId,
                                handlingUnitModelId: container.containerId,
                                handlingUnitId: finalHuResult.createHandlingUnit.id,
                                carrierShippingModeId:
                                    deliveryResult.delivery.carrierShippingModeId,
                                carrierId: deliveryResult.delivery.carrierShippingMode.carrierId,
                                carrierService: deliveryResult.delivery.carrierService,
                                theoriticalWeight: container.totalWeight,
                                roundPosition: container.order,
                                preparationMode: container.contents[0].contentPreparationMode
                            }
                        };
                        const createHUOMutation = gql`
                            mutation createHandlingUnitOutbound(
                                $input: CreateHandlingUnitOutboundInput!
                            ) {
                                createHandlingUnitOutbound(input: $input) {
                                    id
                                    lastTransactionId
                                }
                            }
                        `;
                        finalHuoResult = await graphqlRequestClient.request(
                            createHUOMutation,
                            newHUOVariables,
                            requestHeader
                        );
                        // 4b- Create the box lines
                        if (finalHuoResult) {
                            for (const content of container.contents) {
                                let finalHucResult: { [k: string]: any } | null;
                                let finalHucoResult: { [k: string]: any } | null;

                                // Handling Unit Content creation
                                const newHUCVariables = {
                                    input: {
                                        stockStatus: parameters.STOCK_STATUSES_SALE,
                                        articleId: content.contentArticleId,
                                        handlingUnitId: finalHuResult.createHandlingUnit.id,
                                        quantity: content.qty
                                    }
                                };
                                const createHUCMutation = gql`
                                    mutation createHandlingUnitContent(
                                        $input: CreateHandlingUnitContentInput!
                                    ) {
                                        createHandlingUnitContent(input: $input) {
                                            id
                                            lastTransactionId
                                        }
                                    }
                                `;
                                finalHucResult = await graphqlRequestClient.request(
                                    createHUCMutation,
                                    newHUCVariables,
                                    requestHeader
                                );

                                // Handling Unit Content Outbound creation
                                if (finalHucResult) {
                                    const newHUCOVariables = {
                                        input: {
                                            status: configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED,
                                            deliveryId: deliveryResult.delivery.id,
                                            deliveryLineId: content.contentId,
                                            handlingUnitContentId:
                                                finalHucResult.createHandlingUnitContent.id,
                                            stockOwnerId: deliveryResult.delivery.stockOwnerId,
                                            quantityToBePicked: content.qty,
                                            lineNumber: Number(content.id),
                                            preparationMode:
                                                container.contents[0].contentPreparationMode,
                                            handlingUnitOutboundId:
                                                finalHuoResult.createHandlingUnitOutbound.id
                                        }
                                    };
                                    const createHUCOMutation = gql`
                                        mutation createHandlingUnitContentOutBound(
                                            $input: CreateHandlingUnitContentOutboundInput!
                                        ) {
                                            createHandlingUnitContentOutbound(input: $input) {
                                                id
                                                lastTransactionId
                                            }
                                        }
                                    `;
                                    finalHucoResult = await graphqlRequestClient.request(
                                        createHUCOMutation,
                                        newHUCOVariables,
                                        requestHeader
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // 5a- Update Delivery + Delivery_lines status -> ESTIMATED
            const estimateDeliveryVariables = {
                id: delivery.id,
                input: { status: configs.DELIVERY_STATUS_ESTIMATED }
            };

            const estimatedDelivery = await graphqlRequestClient.request(
                updateDeliveryMutation,
                estimateDeliveryVariables,
                requestHeader
            );
        } catch (error: any) {
            // await graphqlRequestClient.request(
            //     rollbackTransaction,
            //     rollbackVariable,
            //     requestHeader
            // );

            res.status(500).json({ error });
            if (error.response.errors[0].extensions) {
                res.status(500).json({
                    error: {
                        is_error: error.response.errors[0].extensions.is_error,
                        code: error.response.errors[0].extensions.code,
                        message: error.response.errors[0].message,
                        variables: error.response.errors[0].extensions.variables,
                        exception: error.response.errors[0].extensions.exception
                    }
                });
            } else {
                res.status(500).json({
                    error: error
                });
            }
        }
    }
    // END //
    res.status(200).json({ response: { success: true } });
};
