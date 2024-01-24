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
        articleInfos,
        feature,
        movingQuantity,
        resType,
        roundHU,
        round,
        existingFinalHUO,
        handlingUnitModel,
        roundContentInfos
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

    try {
        // get DEFAULT_SHIPPING_LOCATION
        const defaultShippingLocationParameterQuery = gql`
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

        const defaultShippingLocationParameterVariables = {
            filters: { scope: 'outbound', code: 'DEFAULT_SHIPPING_LOCATION' }
        };

        const defaultShippingLocationParameterResult = await graphqlRequestClient.request(
            defaultShippingLocationParameterQuery,
            defaultShippingLocationParameterVariables,
            requestHeader
        );

        const defaultShippingLocationQuery = gql`
            query locations($filters: LocationSearchFilters) {
                locations(filters: $filters) {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const defaultShippingLocationVariables = {
            filters: { name: defaultShippingLocationParameterResult.parameters.results[0].value }
        };

        const defaultShippingLocationResult = await graphqlRequestClient.request(
            defaultShippingLocationQuery,
            defaultShippingLocationVariables,
            requestHeader
        );

        // 1- Check Final HU
        const finalHandlingUnitQuery = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    results {
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
            }
        `;

        let finalHandlingUnitResult = undefined;
        if (Object.keys(existingFinalHUO).length > 0) {
            const finalHandlingUnitVariables = {
                filters: { id: existingFinalHUO.handlingUnitId }
            };
            finalHandlingUnitResult = await graphqlRequestClient.request(
                finalHandlingUnitQuery,
                finalHandlingUnitVariables,
                requestHeader
            );
        }

        let finalHandlingUnit: any;
        let finalHandlingUnitOutbound: any;
        let finalHandlingUnitContent: any;

        console.log('fHUres', finalHandlingUnitResult);

        if (!finalHandlingUnitResult || finalHandlingUnitResult?.handlingUnits?.count <= 0) {
            // HU does not exist, we create it
            // 1a- Generate SSCC
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            let extensionDigit = 0;
            if (handlingUnitModel.type == 71100) {
                // PALLET
                extensionDigit = 1;
            }

            const variables = {
                functionName: 'K_generateSSCC',
                event: {
                    extensionDigit
                }
            };

            const generateSSCC_result = await graphqlRequestClient.request(query, variables);
            if (generateSSCC_result.executeFunction.status === 'ERROR') {
                res.status(500).json({ error: generateSSCC_result.executeFunction.output });
            } else if (
                generateSSCC_result.executeFunction.status === 'OK' &&
                generateSSCC_result.executeFunction.output.status === 'KO'
            ) {
                res.status(500).json({
                    error: generateSSCC_result.executeFunction.output.output.code
                });
            }

            const ssccToCreate = generateSSCC_result.executeFunction.output;

            // 1b- Create HU
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
                    name: ssccToCreate,
                    barcode: ssccToCreate,
                    code: handlingUnitModel.name,
                    type: handlingUnitModel.type,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_OUTBOUND,
                    stockOwnerId: roundHU.stockOwnerId,
                    locationId: defaultShippingLocationResult.locations.results[0].id,
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

            // 1c- Create HUO
            const createHUOMutation = gql`
                mutation createHandlingUnitOutbound($input: CreateHandlingUnitOutboundInput!) {
                    createHandlingUnitOutbound(input: $input) {
                        id
                        name
                        status
                        statusText
                        preparationMode
                        preparationModeText
                        theoriticalWeight
                        carrier {
                            id
                            name
                        }
                        carrierShippingModeId
                        carrierShippingMode {
                            id
                            toBePalletized
                        }
                        deliveryId
                        delivery {
                            id
                            name
                        }
                        handlingUnitModelId
                        handlingUnitModel {
                            id
                            name
                            weight
                            closureWeight
                        }
                        roundId
                        round {
                            id
                            name
                        }
                        loadId
                        load {
                            id
                            name
                        }
                        handlingUnitId
                        handlingUnit {
                            id
                            name
                            type
                            typeText
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            status
                            statusText
                            warehouseCode
                            parentHandlingUnitId
                        }
                        handlingUnitContentOutbounds {
                            id
                            lineNumber
                            status
                            statusText
                            pickedQuantity
                            quantityToBePicked
                            pickingLocationId
                            pickingLocation {
                                id
                                name
                            }
                            handlingUnitContentId
                            handlingUnitContent {
                                id
                                articleId
                                article {
                                    name
                                    description
                                    baseUnitWeight
                                }
                            }
                        }
                        createdBy
                        created
                        modifiedBy
                        modified
                    }
                }
            `;

            const createHUOvariables = {
                input: {
                    name: ssccToCreate,
                    status: configs.HANDLING_UNIT_OUTBOUND_STATUS_PACKING_IN_PROGRESS,
                    handlingUnitModelId: handlingUnitModel.id,
                    roundId: round.id,
                    deliveryId:
                        round.roundAdvisedAddresses[0].roundLineDetail.deliveryLine.deliveryId,
                    handlingUnitId: finalHandlingUnit.id,
                    stockOwnerId: finalHandlingUnit.stockOwnerId,
                    lastTransactionId
                }
            };

            const createdHuo = await graphqlRequestClient.request(
                createHUOMutation,
                createHUOvariables
            );

            console.log('createdHuo', createdHuo);

            finalHandlingUnitOutbound = createdHuo.createHandlingUnitOutbound;
            canRollbackTransaction = true;
        } else {
            // Final HU and HUO exist
            finalHandlingUnit = existingFinalHUO.handlingUnit;
            finalHandlingUnitOutbound = existingFinalHUO;
            console.log('finalHandlingUnit', finalHandlingUnit);
            console.log('finalHandlingUnitOutbound', finalHandlingUnitOutbound);
        }
        // retrieve roundLinedetails for round and article
        const roundLineDetailsQuery = gql`
            query roundLineDetails(
                $filters: RoundLineDetailSearchFilters
                $orderBy: [RoundLineDetailOrderByCriterion!]
            ) {
                roundLineDetails(filters: $filters, orderBy: $orderBy) {
                    count
                    results {
                        id
                        status
                        statusText
                        quantityToBeProcessed
                        processedQuantity
                        roundLineId
                        extraNumber2
                        roundLine {
                            id
                            lineNumber
                            articleId
                            status
                            statusText
                        }
                        handlingUnitContentOutbounds {
                            id
                            lineNumber
                            handlingUnitContentId
                            handlingUnitOutboundId
                            handlingUnitContent {
                                id
                                quantity
                            }
                        }
                        deliveryLineId
                        deliveryLine {
                            id
                            stockOwnerId
                            deliveryId
                        }
                    }
                }
            }
        `;

        const roundLineDetailsVariables = {
            filters: { roundLine_RoundId: round.id, roundLine_ArticleId: articleInfos.id },
            orderBy: [{ field: 'order', ascending: true }]
        };

        const roundLineDetailsResult = await graphqlRequestClient.request(
            roundLineDetailsQuery,
            roundLineDetailsVariables,
            requestHeader
        );

        console.log('roundLineDetailsResult', roundLineDetailsResult);

        // catch first not null having preparation to do roundLineDetail
        let quantityToPack = movingQuantity;
        while (quantityToPack > 0) {
            console.log('quantityToPack', quantityToPack);
            if (roundLineDetailsResult?.roundLineDetails?.results) {
                const roundLineDetails = roundLineDetailsResult.roundLineDetails.results;
                for (const roundLineDetail of roundLineDetails) {
                    console.log('qtyToPackInside', quantityToPack);
                    if (quantityToPack > 0) {
                        console.log('procQty', roundLineDetail.processedQuantity);
                        console.log('extraNumber2', roundLineDetail.extraNumber2);
                        if (
                            roundLineDetail.processedQuantity -
                                (roundLineDetail.extraNumber2 ?? 0) >
                            0
                        ) {
                            const minQuantity = Math.min(
                                movingQuantity,
                                roundLineDetail.processedQuantity -
                                    (roundLineDetail.extraNumber2 ?? 0)
                            );

                            //HUCO where HU = finalHU and DeliveryLine = roundLineDetails.deliveryLine
                            const handlingUnitContentOutboundQuery = gql`
                                query handlingUnitContentOutbounds(
                                    $filters: HandlingUnitContentOutboundSearchFilters
                                ) {
                                    handlingUnitContentOutbounds(filters: $filters) {
                                        count
                                        results {
                                            id
                                            pickedQuantity
                                            handlingUnitContent {
                                                id
                                                quantity
                                            }
                                        }
                                    }
                                }
                            `;
                            console.log('fHuId', finalHandlingUnit.id);
                            console.log('rldId', roundLineDetail.deliveryLineId);

                            const handlingUnitContentOutboundVariables = {
                                filters: {
                                    handlingUnitContent_HandlingUnitId: finalHandlingUnit.id,
                                    deliveryLineId: roundLineDetail.deliveryLineId
                                }
                            };

                            const handlingUnitContentOutboundResult =
                                await graphqlRequestClient.request(
                                    handlingUnitContentOutboundQuery,
                                    handlingUnitContentOutboundVariables,
                                    requestHeader
                                );

                            console.log(
                                'queriedHucOLoop',
                                handlingUnitContentOutboundResult.handlingUnitContentOutbounds
                                    .results
                            );

                            if (
                                handlingUnitContentOutboundResult.handlingUnitContentOutbounds
                                    .results.length <= 0
                            ) {
                                const createHUCMutation = gql`
                                    mutation createHandlingUnitContent(
                                        $input: CreateHandlingUnitContentInput!
                                    ) {
                                        createHandlingUnitContent(input: $input) {
                                            id
                                            articleId
                                            article {
                                                id
                                                name
                                                stockOwnerId
                                                stockOwner {
                                                    name
                                                }
                                                baseUnitWeight
                                            }
                                            quantity
                                            reservation
                                            stockStatus
                                            stockStatusText
                                            stockOwnerId
                                            handlingUnit {
                                                id
                                                name
                                                locationId
                                                location {
                                                    id
                                                    name
                                                }
                                            }
                                            stockOwner {
                                                id
                                                name
                                            }
                                        }
                                    }
                                `;

                                const createHUCvariables = {
                                    input: {
                                        handlingUnitId: finalHandlingUnit.id,
                                        articleId: articleInfos.id,
                                        quantity: minQuantity,
                                        stockOwnerId: roundContentInfos.stockOwnerId,
                                        stockStatus: parameters.STOCK_STATUSES_SALE, // 14000
                                        lastTransactionId
                                    }
                                };

                                const createdHuc = await graphqlRequestClient.request(
                                    createHUCMutation,
                                    createHUCvariables
                                );
                                console.log('createdHuc', createdHuc.createHandlingUnitContent);

                                finalHandlingUnitContent = createdHuc.createHandlingUnitContent;

                                const createHUCOMutation = gql`
                                    mutation createHandlingUnitContentOutbound(
                                        $input: CreateHandlingUnitContentOutboundInput!
                                    ) {
                                        createHandlingUnitContentOutbound(input: $input) {
                                            id
                                        }
                                    }
                                `;

                                const createHUCOvariables = {
                                    input: {
                                        lineNumber:
                                            handlingUnitContentOutboundResult
                                                .handlingUnitContentOutbounds.results.length + 1,
                                        handlingUnitContentId: finalHandlingUnitContent.id,
                                        handlingUnitOutboundId: finalHandlingUnitOutbound.id,
                                        status: configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_PACKING_IN_PROGRESS,
                                        deliveryId: roundLineDetail.deliveryLine.deliveryId,
                                        deliveryLineId: roundLineDetail.deliveryLineId,
                                        pickedQuantity: minQuantity,
                                        pickingLocationId:
                                            roundContentInfos?.handlingUnit?.locationId,
                                        pickingHandlingUnitId: roundHU.id,
                                        stockOwnerId: roundContentInfos.stockOwnerId,
                                        lastTransactionId
                                    }
                                };

                                const createdHuco = await graphqlRequestClient.request(
                                    createHUCOMutation,
                                    createHUCOvariables
                                );

                                console.log(
                                    'createdHucO',
                                    createdHuco.createHandlingUnitContentOutbound
                                );

                                quantityToPack -= minQuantity;
                            } else {
                                //  update final HUCO quantity
                                const hucOToUpdate =
                                    handlingUnitContentOutboundResult?.handlingUnitContentOutbounds
                                        ?.results[0];

                                const newHUCQuantity =
                                    hucOToUpdate.handlingUnitContent.quantity + minQuantity;

                                const updateFinalHUCOMutation = gql`
                                    mutation updateHandlingUnitContentOutbound(
                                        $id: String!
                                        $input: UpdateHandlingUnitContentOutboundInput!
                                    ) {
                                        updateHandlingUnitContentOutbound(id: $id, input: $input) {
                                            id
                                            lastTransactionId
                                        }
                                    }
                                `;

                                const updateFinalHUCOvariable = {
                                    id: hucOToUpdate.id,
                                    input: {
                                        pickedQuantity: newHUCQuantity,
                                        lastTransactionId
                                    }
                                };
                                const updatedFinalHUCO = await graphqlRequestClient.request(
                                    updateFinalHUCOMutation,
                                    updateFinalHUCOvariable
                                );
                                console.log(
                                    'updatedFinalHUCO',
                                    updatedFinalHUCO.updateHandlingUnitContentOutbound
                                );

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

                                const updateFinalHUCvariable = {
                                    id: hucOToUpdate.handlingUnitContent.id,
                                    input: {
                                        quantity: newHUCQuantity,
                                        lastTransactionId
                                    }
                                };
                                const updatedFinalHUC = await graphqlRequestClient.request(
                                    updateFinalHUCMutation,
                                    updateFinalHUCvariable
                                );

                                console.log(
                                    'updatedFinalHUC',
                                    updatedFinalHUC.updateHandlingUnitContent
                                );

                                finalHandlingUnitContent =
                                    updatedFinalHUC.updateHandlingUnitContent;
                                quantityToPack -= minQuantity;

                                // RESTART HERE : check consistency
                                canRollbackTransaction = true;
                            }
                            //updateROundLineDetail
                            const updateRoundLineDetailMutation = gql`
                                mutation updateRoundLineDetail(
                                    $id: String!
                                    $input: UpdateRoundLineDetailInput!
                                ) {
                                    updateRoundLineDetail(id: $id, input: $input) {
                                        id
                                        processedQuantity
                                        extraStatus2
                                        lastTransactionId
                                    }
                                }
                            `;
                            const updatedQty = roundLineDetail.extraNumber2 + minQuantity;
                            const updateRoundLineDetailVariables = {
                                id: roundLineDetail.id,
                                input: {
                                    extraNumber2: updatedQty,
                                    lastTransactionId
                                }
                            };
                            const updateRoundLineDetailResponse =
                                await graphqlRequestClient.request(
                                    updateRoundLineDetailMutation,
                                    updateRoundLineDetailVariables
                                );
                            console.log(
                                'updatRLDResp',
                                updateRoundLineDetailResponse.updateRoundLineDetail
                            );
                        }
                    } else {
                        break;
                    }
                }
            }
        }
        // // 2- Check Final HUC
        // const handlingUnitContentQuery = gql`
        //     query handlingUnitContents($filters: HandlingUnitContentSearchFilters) {
        //         handlingUnitContents(filters: $filters) {
        //             count
        //             results {
        //                 id
        //                 articleId
        //                 quantity
        //             }
        //         }
        //     }
        // `;

        // const handlingUnitContentVariables = {
        //     filters: { handlingUnitId: finalHandlingUnit.id, articleId: articleInfos.id }
        // };

        // const handlingUnitContentResult = await graphqlRequestClient.request(
        //     handlingUnitContentQuery,
        //     handlingUnitContentVariables,
        //     requestHeader
        // );

        // if (handlingUnitContentResult?.handlingUnitContents?.count <= 0) {
        //     // 2a- Create HUC with articleId = scanned article (if it does not exist)
        //     const createHUCMutation = gql`
        //         mutation createHandlingUnitContent($input: CreateHandlingUnitContentInput!) {
        //             createHandlingUnitContent(input: $input) {
        //                 id
        //                 articleId
        //                 handlingUnitId
        //             }
        //         }
        //     `;

        //     const createHUCvariables = {
        //         input: {
        //             handlingUnitId: finalHandlingUnit.id,
        //             articleId: articleInfos.id,
        //             quantity: movingQuantity,
        //             stockOwnerId: roundContentInfos.stockOwnerId,
        //             stockStatus: parameters.STOCK_STATUSES_SALE, // 14000
        //             lastTransactionId
        //         }
        //     };

        //     const createdHuc = await graphqlRequestClient.request(
        //         createHUCMutation,
        //         createHUCvariables
        //     );

        //     console.log('createdHuc', createdHuc);

        //     finalHandlingUnitContent = createdHuc.createHandlingUnitContent;
        //     canRollbackTransaction = true;

        //     // 2b- Create HUCO

        //     // retrieve roundAdvisedAddress containting article in course
        //     const roundAdvisedAddress = round.roundAdvisedAddresses.filter(
        //         (e: any) => e.handlingUnitContent.articleId == articleInfos.id
        //     )[0];

        //     const createHUCOMutation = gql`
        //         mutation createHandlingUnitContentOutbound(
        //             $input: CreateHandlingUnitContentOutboundInput!
        //         ) {
        //             createHandlingUnitContentOutbound(input: $input) {
        //                 id
        //             }
        //         }
        //     `;

        //     const createHUCOvariables = {
        //         input: {
        //             lineNumber: finalHandlingUnitOutbound.handlingUnitContentOutbounds.length + 1,
        //             handlingUnitContentId: finalHandlingUnitContent.id,
        //             handlingUnitOutboundId: finalHandlingUnitOutbound.id,
        //             status: configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_PACKING_IN_PROGRESS,
        //             deliveryId: roundAdvisedAddress.roundLineDetail.deliveryLine.deliveryId,
        //             deliveryLineId: roundAdvisedAddress.roundLineDetail.deliveryLineId,
        //             pickedQuantity: movingQuantity,
        //             pickingLocationId: roundContentInfos.handlingUnit.locationId,
        //             pickingHandlingUnitId: roundHU.id,
        //             stockOwnerId: roundContentInfos.stockOwnerId,
        //             lastTransactionId
        //         }
        //     };

        //     const createdHuco = await graphqlRequestClient.request(
        //         createHUCOMutation,
        //         createHUCOvariables
        //     );

        //     console.log('createdHuco', createdHuco);
        // } else {
        //     finalHandlingUnitContent = handlingUnitContentResult?.handlingUnitContents?.results[0];
        //     console.log('finalHandlingUnitContentId', finalHandlingUnitContent);

        //     // 2c- final HUC exists, we update its quantity
        //     const updateFinalHUCMutation = gql`
        //         mutation updateHandlingUnitContent(
        //             $id: String!
        //             $input: UpdateHandlingUnitContentInput!
        //         ) {
        //             updateHandlingUnitContent(id: $id, input: $input) {
        //                 id
        //                 lastTransactionId
        //             }
        //         }
        //     `;

        //     const newHUCQuantity =
        //         handlingUnitContentResult?.handlingUnitContents?.results[0].quantity +
        //         movingQuantity;

        //     const updateFinalHUCvariable = {
        //         id: finalHandlingUnitContent.id,
        //         input: {
        //             quantity: newHUCQuantity,
        //             lastTransactionId
        //         }
        //     };
        //     const updatedFinalHUC = await graphqlRequestClient.request(
        //         updateFinalHUCMutation,
        //         updateFinalHUCvariable
        //     );

        //     canRollbackTransaction = true;

        //     // 2d- Check Final HUCO
        //     const handlingUnitContentOutboundQuery = gql`
        //         query handlingUnitContentOutbounds(
        //             $filters: HandlingUnitContentOutboundSearchFilters
        //         ) {
        //             handlingUnitContentOutbounds(filters: $filters) {
        //                 count
        //                 results {
        //                     id
        //                     pickedQuantity
        //                 }
        //             }
        //         }
        //     `;

        //     const handlingUnitContentOutboundVariables = {
        //         filters: { handlingUnitContentId: finalHandlingUnitContent.id }
        //     };

        //     const handlingUnitContentOutboundResult = await graphqlRequestClient.request(
        //         handlingUnitContentOutboundQuery,
        //         handlingUnitContentOutboundVariables,
        //         requestHeader
        //     );

        //     // 2e-  we update final HUCO quantity
        //     const updateFinalHUCOMutation = gql`
        //         mutation updateHandlingUnitContentOutbound(
        //             $id: String!
        //             $input: UpdateHandlingUnitContentOutboundInput!
        //         ) {
        //             updateHandlingUnitContentOutbound(id: $id, input: $input) {
        //                 id
        //                 lastTransactionId
        //             }
        //         }
        //     `;

        //     const updateFinalHUCOvariable = {
        //         id: handlingUnitContentOutboundResult?.handlingUnitContentOutbounds?.results[0].id,
        //         input: {
        //             pickedQuantity: newHUCQuantity,
        //             lastTransactionId
        //         }
        //     };
        //     const updatedFinalHUCO = await graphqlRequestClient.request(
        //         updateFinalHUCOMutation,
        //         updateFinalHUCOvariable
        //     );
        // }

        console.log('resType', resType);

        // 3- Update HUCF
        if (resType === 'serialNumber') {
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

        // 4a- get origin huc
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

        const originalHandlingUnitContentVariables = {
            filters: { handlingUnitId: roundHU.id, articleId: articleInfos.id }
        };

        const originalHandlingUnitContentResult = await graphqlRequestClient.request(
            handlingUnitContentQuery,
            originalHandlingUnitContentVariables,
            requestHeader
        );

        // 4b- update origin huc
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

        const stockQuantity =
            originalHandlingUnitContentResult?.handlingUnitContents?.results[0].quantity -
            movingQuantity;

        const updateHUCvariable = {
            id: originalHandlingUnitContentResult?.handlingUnitContents?.results[0].id,
            input: {
                quantity: stockQuantity,
                lastTransactionId
            }
        };

        const updatedHUC = await graphqlRequestClient.request(updateHUCMutation, updateHUCvariable);

        console.log('updatedOriginHUC', updatedHUC);

        // 5- Create Movement (from stock to roundHU)
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;
        const movementCodes = {
            initialStatus: parameters.STOCK_STATUSES_SALE,
            status: configs.MOVEMENT_STATUS_VALIDATED,
            type: configs.MOVEMENT_TYPE_PREPARATION,
            model: configs.MOVEMENT_MODEL_NORMAL,
            code: parameters.MOVEMENT_CODE_PRODUCT_PICK,
            priority: parameters.PRIORITY_NORMAL
        };
        const movementVariables = {
            input: {
                articleIdStr: articleInfos.id,
                articleNameStr: articleInfos.name,
                stockOwnerIdStr: articleInfos?.stockOwnerId,
                stockOwnerNameStr: articleInfos?.stockOwner?.name,
                quantity: movingQuantity,
                ...movementCodes,
                originalLocationIdStr: roundHU.locationId,
                originalLocationNameStr: roundHU.location.name,
                originalHandlingUnitIdStr: roundHU.id,
                originalHandlingUnitNameStr: roundHU.name,
                originalContentIdStr:
                    originalHandlingUnitContentResult?.handlingUnitContents?.results[0].id,
                finalLocationIdStr: defaultShippingLocationResult?.locations?.results[0].id,
                finalLocationNameStr: defaultShippingLocationResult?.locations?.results[0].name,
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

        // 6- Get updated origin HU
        const updatedRoundHUQuery = gql`
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
                            reservation
                            articleId
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            handlingUnit {
                                id
                                name
                                locationId
                                location {
                                    id
                                    name
                                }
                            }
                            article {
                                id
                                name
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                baseUnitWeight
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

        const updatedRoundHUVariables = {
            filters: { id: roundHU.id }
        };

        const updatedRoundHUResult = await graphqlRequestClient.request(
            updatedRoundHUQuery,
            updatedRoundHUVariables,
            requestHeader
        );

        const updatedFinalHUOQuery = gql`
            query handlingUnitOutbounds($filters: HandlingUnitOutboundSearchFilters) {
                handlingUnitOutbounds(filters: $filters) {
                    count
                    results {
                        id
                        name
                        status
                        statusText
                        preparationMode
                        preparationModeText
                        theoriticalWeight
                        carrier {
                            id
                            name
                        }
                        carrierShippingModeId
                        carrierShippingMode {
                            id
                            toBePalletized
                        }
                        deliveryId
                        delivery {
                            id
                            name
                        }
                        handlingUnitModelId
                        handlingUnitModel {
                            id
                            name
                            weight
                            closureWeight
                        }
                        roundId
                        round {
                            id
                            name
                        }
                        loadId
                        load {
                            id
                            name
                        }
                        handlingUnitId
                        handlingUnit {
                            id
                            name
                            type
                            typeText
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            status
                            statusText
                            warehouseCode
                            parentHandlingUnitId
                        }
                        handlingUnitContentOutbounds {
                            id
                            lineNumber
                            status
                            statusText
                            pickedQuantity
                            quantityToBePicked
                            pickingLocationId
                            pickingLocation {
                                id
                                name
                            }
                            handlingUnitContentId
                            handlingUnitContent {
                                id
                                articleId
                                quantity
                                article {
                                    id
                                    name
                                    description
                                    stockOwnerId
                                    stockOwner {
                                        name
                                    }
                                    baseUnitWeight
                                }
                            }
                        }
                        createdBy
                        created
                        modifiedBy
                        modified
                        extras
                    }
                }
            }
        `;

        const updatedFinalHUOVariables = {
            filters: { id: finalHandlingUnitOutbound.id }
        };

        const updatedFinalHUOResult = await graphqlRequestClient.request(
            updatedFinalHUOQuery,
            updatedFinalHUOVariables,
            requestHeader
        );

        //merge results
        res.status(200).json({
            response: {
                updatedRoundHU: updatedRoundHUResult?.handlingUnits?.results[0],
                originHandlingUnitContent: updatedHUC.updateHandlingUnitContent,
                finalHandlingUnit,
                finalHandlingUnitOutbound: updatedFinalHUOResult?.handlingUnitOutbounds?.results[0],
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
