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
        proposedRoundAdvisedAddress,
        round,
        articleInfos,
        feature,
        handlingUnit,
        movingQuantity,
        resType
    } = req.body;

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
        // get DEFAULT_ROUND_LOCATION
        const defaultRoundParameterQuery = gql`
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

        const defaultRoundParameterVariables = {
            filters: { scope: 'outbound', code: 'DEFAULT_ROUND_LOCATION' }
        };

        const defaultRoundParameterResult = await graphqlRequestClient.request(
            defaultRoundParameterQuery,
            defaultRoundParameterVariables,
            requestHeader
        );

        const defaultRoundLocationQuery = gql`
            query locations($filters: LocationSearchFilters) {
                locations(filters: $filters) {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const defaultRoundLocationVariables = {
            filters: { name: defaultRoundParameterResult.parameters.results[0].value }
        };

        const defaultRoundLocationResult = await graphqlRequestClient.request(
            defaultRoundLocationQuery,
            defaultRoundLocationVariables,
            requestHeader
        );

        // 1a- Check Final HU
        const handlingUnitQuery = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    results {
                        id
                        name
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

        const handlingUnitVariables = {
            filters: { name: round.name }
        };

        const handlingUnitResult = await graphqlRequestClient.request(
            handlingUnitQuery,
            handlingUnitVariables,
            requestHeader
        );

        let finalHandlingUnitId: any = null;
        let finalHandlingUnitContentId: any = null;

        if (handlingUnitResult?.handlingUnits?.count <= 0) {
            // 1b- Create HU with name = roundName and location = default_round_location (if it does not exist)
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
                    }
                }
            `;

            const createHUvariables = {
                input: {
                    name: round.name,
                    barcode: round.name,
                    code: round.name,
                    type: parameters.HANDLING_UNIT_TYPE_PALLET,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_OUTBOUND,
                    locationId: defaultRoundLocationResult.locations.results[0].id,
                    //SO to be removed here once all tranfered to HUC
                    stockOwnerId:
                        proposedRoundAdvisedAddress.roundLineDetail.deliveryLine.stockOwnerId,
                    lastTransactionId
                }
            };

            const createdHu = await graphqlRequestClient.request(
                createHUMutation,
                createHUvariables
            );

            console.log('createdHu', createdHu);

            finalHandlingUnitId = createdHu.createHandlingUnit.id;
            canRollbackTransaction = true;
        } else {
            finalHandlingUnitId = handlingUnitResult.handlingUnits.results[0].id;
            console.log('finalHandlingUnitId', finalHandlingUnitId);
        }

        // 2a- Check Final HUC
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
            filters: { handlingUnitId: finalHandlingUnitId, articleId: articleInfos.articleId }
        };

        const handlingUnitContentResult = await graphqlRequestClient.request(
            handlingUnitContentQuery,
            handlingUnitContentVariables,
            requestHeader
        );

        if (handlingUnitContentResult?.handlingUnitContents?.count <= 0) {
            // 2b- Create HUC with articleId = scanned article (if it does not exist)
            const createHUCMutation = gql`
                mutation createHandlingUnitContent($input: CreateHandlingUnitContentInput!) {
                    createHandlingUnitContent(input: $input) {
                        id
                        articleId
                        handlingUnitId
                    }
                }
            `;

            const createHUCvariables = {
                input: {
                    handlingUnitId: finalHandlingUnitId,
                    articleId: articleInfos.articleId,
                    quantity: movingQuantity,
                    stockStatus: parameters.STOCK_STATUSES_SALE, // 14000
                    stockOwnerId:
                        proposedRoundAdvisedAddress.roundLineDetail.deliveryLine.stockOwnerId,
                    lastTransactionId
                }
            };

            const createdHuc = await graphqlRequestClient.request(
                createHUCMutation,
                createHUCvariables
            );

            console.log('createdHuc', createdHuc);

            finalHandlingUnitContentId = createdHuc.createHandlingUnitContent.id;
            canRollbackTransaction = true;
        } else {
            //update quantity quantity HUC + qty moving
            const hucToUpdate = handlingUnitContentResult?.handlingUnitContents?.results[0];
            const updateHUCMutation = gql`
                mutation updateHandlingUnitContent(
                    $id: String!
                    $input: UpdateHandlingUnitContentInput!
                ) {
                    updateHandlingUnitContent(id: $id, input: $input) {
                        id
                        quantity
                        lastTransactionId
                    }
                }
            `;

            const updateHUCvariable = {
                id: hucToUpdate.id,
                input: {
                    quantity: hucToUpdate.quantity + movingQuantity,
                    lastTransactionId
                }
            };

            const updatedHUC = await graphqlRequestClient.request(
                updateHUCMutation,
                updateHUCvariable
            );

            finalHandlingUnitContentId = updatedHUC.updateHandlingUnitContent.id;
            console.log('finalHandlingUnitContentId', finalHandlingUnitContentId);
        }

        console.log('resType', resType);

        // 3- Update original HUC ( qty-- ) if resType= EAN OR Update original HUCF (huc = new huc) if resType=  serialNumber
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
                    handlingUnitContentId: finalHandlingUnitContentId,
                    extraStatus1: configs.ROUND_ADVISED_ADDRESS_STATUS_TO_BE_VERIFIED, // 4- SPECIFIC FINDIT : Update HUCF extra_status_1 (To be verified - 457)
                    lastTransactionId
                }
            };

            const updatedHUCF = await graphqlRequestClient.request(
                updateHUCFMutation,
                updateHUCFvariable
            );

            console.log('resType', resType);
        }

        // get origin huc
        const originalHandlingUnitContentVariables = {
            filters: { handlingUnitId: handlingUnit.id, articleId: articleInfos.articleId }
        };

        const originalHandlingUnitContentResult = await graphqlRequestClient.request(
            handlingUnitContentQuery,
            originalHandlingUnitContentVariables,
            requestHeader
        );

        // update origin huc
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

        canRollbackTransaction = true;

        // 5- Update RoundAdvisedAddress status (To be verified - 457)
        const updateRoundAdvisedAddressMutation = gql`
            mutation updateRoundAdvisedAddress(
                $id: String!
                $input: UpdateRoundAdvisedAddressInput!
            ) {
                updateRoundAdvisedAddress(id: $id, input: $input) {
                    id
                    roundOrderId
                    quantity
                    status
                    statusText
                    locationId
                    location {
                        name
                    }
                    handlingUnitContentId
                    handlingUnitContent {
                        quantity
                        articleId
                        article {
                            id
                            name
                            baseUnitWeight
                        }
                        handlingUnitContentFeatures {
                            featureCode {
                                name
                                unique
                            }
                            value
                        }
                        handlingUnitId
                        handlingUnit {
                            id
                            name
                            barcode
                            status
                            statusText
                            type
                            typeText
                            category
                            categoryText
                        }
                        stockOwnerId
                        stockOwner {
                            id
                            name
                        }
                    }
                    roundLineDetailId
                    roundLineDetail {
                        status
                        statusText
                        quantityToBeProcessed
                        processedQuantity
                        roundLineId
                        roundLine {
                            lineNumber
                            articleId
                            status
                            statusText
                        }
                        deliveryLineId
                        deliveryLine {
                            id
                            articleId
                            stockOwnerId
                            deliveryId
                            stockStatus
                            stockStatusText
                            reservation
                        }
                    }
                    lastTransactionId
                }
            }
        `;

        const newQuantity = (proposedRoundAdvisedAddress.quantity -= movingQuantity);
        let updateRoundAdvisedAddressVariables = {};
        if (newQuantity == 0) {
            updateRoundAdvisedAddressVariables = {
                id: proposedRoundAdvisedAddress.id,
                input: {
                    status: configs.ROUND_ADVISED_ADDRESS_STATUS_TO_BE_VERIFIED,
                    quantity: newQuantity,
                    lastTransactionId
                }
            };
        } else {
            updateRoundAdvisedAddressVariables = {
                id: proposedRoundAdvisedAddress.id,
                input: {
                    quantity: newQuantity,
                    lastTransactionId
                }
            };
        }
        const updateRoundAdvisedAddressResponse = await graphqlRequestClient.request(
            updateRoundAdvisedAddressMutation,
            updateRoundAdvisedAddressVariables
        );

        console.log('updateRoundAdvisedAddressResponse', updateRoundAdvisedAddressResponse);

        // 6- Update RoundLineDetail processed quantity (To be verified - 457) (RLD + RL + R statuses will be updated if needed)
        const updateRoundLineDetailMutation = gql`
            mutation updateRoundLineDetail($id: String!, $input: UpdateRoundLineDetailInput!) {
                updateRoundLineDetail(id: $id, input: $input) {
                    id
                    processedQuantity
                    quantityToBeProcessed
                    status
                    statusText
                    roundLineId
                    roundLine {
                        id
                        processedQuantity
                        quantityToBeProcessed
                        status
                        statusText
                        roundId
                        round {
                            id
                            status
                            statusText
                            name
                            priority
                            priorityText
                            roundAdvisedAddresses {
                                id
                                roundOrderId
                                quantity
                                status
                                statusText
                                locationId
                                location {
                                    name
                                }
                                handlingUnitContentId
                                handlingUnitContent {
                                    quantity
                                    articleId
                                    article {
                                        id
                                        name
                                        baseUnitWeight
                                    }
                                    stockOwnerId
                                    stockOwner {
                                        id
                                        name
                                    }
                                    handlingUnitContentFeatures {
                                        featureCode {
                                            name
                                            unique
                                        }
                                        value
                                    }
                                    handlingUnitId
                                    handlingUnit {
                                        id
                                        name
                                        barcode
                                        status
                                        statusText
                                        type
                                        typeText
                                        category
                                        categoryText
                                    }
                                }
                                roundLineDetailId
                                roundLineDetail {
                                    status
                                    statusText
                                    quantityToBeProcessed
                                    processedQuantity
                                    roundLineId
                                    roundLine {
                                        lineNumber
                                        articleId
                                        status
                                        statusText
                                    }
                                    deliveryLineId
                                    deliveryLine {
                                        id
                                        articleId
                                        stockOwnerId
                                        deliveryId
                                        stockStatus
                                        stockStatusText
                                        reservation
                                    }
                                }
                            }
                        }
                    }
                    lastTransactionId
                }
            }
        `;

        const newProcessedQuantity =
            proposedRoundAdvisedAddress.roundLineDetail.processedQuantity + movingQuantity;

        console.log('newProcessedQuantity', newProcessedQuantity);
        console.log(
            'newProcessedQuantity',
            proposedRoundAdvisedAddress.roundLineDetail.processedQuantity
        );

        const updateRoundLineDetailVariables = {
            id: proposedRoundAdvisedAddress.roundLineDetailId,
            input: {
                processedQuantity: newProcessedQuantity,
                extraNumber1: movingQuantity,
                lastTransactionId
            }
        };
        const updateRoundLineDetailResponse = await graphqlRequestClient.request(
            updateRoundLineDetailMutation,
            updateRoundLineDetailVariables
        );

        console.log('updateRoundLineDetailResponse', updateRoundLineDetailResponse);

        // 7- Create Movement (from stock to roundHU)
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
                articleIdStr: articleInfos.articleId,
                articleNameStr: articleInfos.articleName,
                stockOwnerIdStr: articleInfos.stockOwnerId,
                stockOwnerNameStr: articleInfos.stockOwnerName,
                quantity: movingQuantity,
                ...movementCodes,
                originalLocationIdStr: proposedRoundAdvisedAddress.locationId,
                originalLocationNameStr: proposedRoundAdvisedAddress.location.name,
                originalHandlingUnitIdStr: handlingUnit.id,
                originalHandlingUnitNameStr: handlingUnit.name,
                originalContentIdStr:
                    originalHandlingUnitContentResult?.handlingUnitContents?.results[0].id,
                finalLocationIdStr: defaultRoundLocationResult?.locations?.results[0].id,
                finalLocationNameStr: defaultRoundLocationResult?.locations?.results[0].name,
                finalHandlingUnitIdStr: finalHandlingUnitId,
                finalHandlingUnitNameStr: round.name,
                finalContentIdStr: finalHandlingUnitContentId,
                lastTransactionId
            }
        };

        const resultMovement = await graphqlRequestClient.request(
            createMovement,
            movementVariables,
            requestHeader
        );

        //end movement creation section

        //merge results
        res.status(200).json({
            response: {
                updatedRoundAdvisedAddress: updateRoundAdvisedAddressResponse,
                updatedRoundLineDetail: updateRoundLineDetailResponse,
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
