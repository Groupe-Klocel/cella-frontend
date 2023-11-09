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
    const { substitutedFeature, newFeature } = req.body;

    console.log('body', req.body);

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

    let controlLocationHU: any;
    let controlLocationHUC: any;

    try {
        // 1- get DEFAULT_CONTROL_LOCATION
        const defaultControlLocationParameterQuery = gql`
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

        const defaultControlLocationParameterVariables = {
            filters: { scope: 'outbound', code: 'DEFAULT_CONTROL_LOCATION' }
        };

        const defaultControlLocationParameterResult = await graphqlRequestClient.request(
            defaultControlLocationParameterQuery,
            defaultControlLocationParameterVariables,
            requestHeader
        );

        console.log('parameter', defaultControlLocationParameterResult.parameters.results);

        const defaultControlLocationQuery = gql`
            query locations($filters: LocationSearchFilters) {
                locations(filters: $filters) {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const defaultControlLocationVariables = {
            filters: { name: defaultControlLocationParameterResult.parameters.results[0].value }
        };

        const defaultControlLocationResult = await graphqlRequestClient.request(
            defaultControlLocationQuery,
            defaultControlLocationVariables,
            requestHeader
        );

        console.log('yocation', defaultControlLocationResult.locations.results);

        // 2- Check Control Location HU
        const controlHandlingUnitQuery = gql`
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

        const controlHandlingUnitVariables = {
            filters: { locationId: defaultControlLocationResult.locations.results[0].id }
        };

        const controlHandlingUnitResult = await graphqlRequestClient.request(
            controlHandlingUnitQuery,
            controlHandlingUnitVariables,
            requestHeader
        );

        console.log('controlHUres', controlHandlingUnitResult);

        if (!controlHandlingUnitResult || controlHandlingUnitResult?.handlingUnits?.count <= 0) {
            // HU does not exist, we create it
            // 2a- Generate SSCC
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            // BOX by default
            let extensionDigit = 0;

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

            // 2b- Create HU
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
                    code: ssccToCreate,
                    type: parameters.HANDLING_UNIT_TYPE_BOX,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                    stockOwnerId:
                        substitutedFeature?.handlingUnitContent?.handlingUnit?.stockOwnerId,
                    locationId: defaultControlLocationResult.locations.results[0].id,
                    lastTransactionId
                }
            };

            const createdHu = await graphqlRequestClient.request(
                createHUMutation,
                createHUvariables
            );

            console.log('createdHu', createdHu);

            controlLocationHU = createdHu.createHandlingUnit;
            canRollbackTransaction = true;
        } else {
            // Final HU and HUO exist
            controlLocationHU = controlHandlingUnitResult?.handlingUnits?.results[0];
            console.log('controlLocationHU', controlLocationHU);
        }

        // 3- Check Final HUC
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
                handlingUnitId: controlLocationHU.id,
                articleId: substitutedFeature?.handlingUnitContent?.articleId
            }
        };

        const handlingUnitContentResult = await graphqlRequestClient.request(
            handlingUnitContentQuery,
            handlingUnitContentVariables,
            requestHeader
        );

        if (
            !handlingUnitContentResult ||
            handlingUnitContentResult?.handlingUnitContents?.count <= 0
        ) {
            // 3a- Create HUC (if it does not exist)
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
                    handlingUnitId: controlLocationHU.id,
                    articleId: substitutedFeature?.handlingUnitContent?.articleId,
                    quantity: 0,
                    stockStatus: parameters.STOCK_STATUSES_A_CONTROLER,
                    lastTransactionId
                }
            };

            const createdHuc = await graphqlRequestClient.request(
                createHUCMutation,
                createHUCvariables
            );

            console.log('createdHuc', createdHuc);

            controlLocationHUC = createdHuc.createHandlingUnitContent;
            canRollbackTransaction = true;
        } else {
            controlLocationHUC = handlingUnitContentResult?.handlingUnitContents?.results[0];
            console.log('controlLocationHUCId', controlLocationHUC);
        }

        // 4a- Update NOK HUCF
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

        const updateNOKHUCFvariable = {
            id: substitutedFeature.id,
            input: {
                handlingUnitContentId: controlLocationHUC.id,
                lastTransactionId
            }
        };

        const updatedNOKHUCF = await graphqlRequestClient.request(
            updateHUCFMutation,
            updateNOKHUCFvariable
        );

        console.log('updatedNOKHUCF', updatedNOKHUCF);

        canRollbackTransaction = true;

        // 4b- Create substitutedFeature Movement (from roundHU to stock)
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;
        const movementNOKCodes = {
            initialStatus: substitutedFeature.handlingUnitContent.stockStatus,
            finalStatus: parameters.STOCK_STATUSES_A_CONTROLER,
            status: configs.MOVEMENT_STATUS_VALIDATED,
            type: configs.MOVEMENT_TYPE_PREPARATION,
            model: configs.MOVEMENT_MODEL_NORMAL,
            code: parameters.MOVEMENT_CODE_PRODUCT_PICK,
            priority: parameters.PRIORITY_NORMAL
        };
        const movementNOKVariables = {
            input: {
                articleIdStr: substitutedFeature.handlingUnitContent.articleId,
                articleNameStr: substitutedFeature.handlingUnitContent.article.name,
                stockOwnerIdStr: substitutedFeature.handlingUnitContent.handlingUnit.stockOwnerId,
                stockOwnerNameStr:
                    substitutedFeature.handlingUnitContent.handlingUnit.stockOwner.name,
                quantity: 1,
                ...movementNOKCodes,
                originalLocationIdStr:
                    substitutedFeature.handlingUnitContent.handlingUnit.locationId,
                originalLocationNameStr:
                    substitutedFeature.handlingUnitContent.handlingUnit.location.name,
                originalHandlingUnitIdStr: substitutedFeature.handlingUnitContent.handlingUnit.id,
                originalHandlingUnitNameStr:
                    substitutedFeature.handlingUnitContent.handlingUnit.name,
                originalContentIdStr: substitutedFeature.handlingUnitContentId,
                finalLocationIdStr: controlLocationHU.locationId,
                finalLocationNameStr: controlLocationHU.location.name,
                finalHandlingUnitIdStr: controlLocationHU.id,
                finalHandlingUnitNameStr: controlLocationHU.name,
                finalContentIdStr: controlLocationHUC.id,
                lastTransactionId
            }
        };

        const movementNOKResult = await graphqlRequestClient.request(
            createMovement,
            movementNOKVariables,
            requestHeader
        );

        // 5a- Update New HUCF
        const updateOKHUCFvariable = {
            id: newFeature.id,
            input: {
                handlingUnitContentId: substitutedFeature.handlingUnitContentId,
                extraStatus1: parameters.HANDLING_UNIT_CONTENT_FEATURE_EXTRA_STATUS1_A_CONTRÔLER,
                lastTransactionId
            }
        };

        const updatedOKHUCF = await graphqlRequestClient.request(
            updateHUCFMutation,
            updateOKHUCFvariable
        );

        console.log('updatedOKHUCF', updatedOKHUCF);

        // 5b- Create newFeature Movement (from stock to roundHU)
        const movementOKCodes = {
            initialStatus: newFeature.handlingUnitContent.stockStatus,
            finalStatus: parameters.STOCK_STATUSES_SALE,
            status: configs.MOVEMENT_STATUS_VALIDATED,
            type: configs.MOVEMENT_TYPE_PREPARATION,
            model: configs.MOVEMENT_MODEL_NORMAL,
            code: parameters.MOVEMENT_CODE_PRODUCT_PICK,
            priority: parameters.PRIORITY_NORMAL
        };
        const movementOKVariables = {
            input: {
                articleIdStr: newFeature.handlingUnitContent.articleId,
                articleNameStr: newFeature.handlingUnitContent.article.name,
                stockOwnerIdStr: newFeature.handlingUnitContent.handlingUnit.stockOwnerId,
                stockOwnerNameStr: newFeature.handlingUnitContent.handlingUnit.stockOwner.name,
                quantity: 1,
                ...movementOKCodes,
                originalLocationIdStr: newFeature.handlingUnitContent.handlingUnit.locationId,
                originalLocationNameStr: newFeature.handlingUnitContent.handlingUnit.location.name,
                originalHandlingUnitIdStr: newFeature.handlingUnitContent.handlingUnit.id,
                originalHandlingUnitNameStr: newFeature.handlingUnitContent.handlingUnit.name,
                originalContentIdStr: newFeature.handlingUnitContentId,
                finalLocationIdStr: substitutedFeature.handlingUnitContent.handlingUnit.locationId,
                finalLocationNameStr:
                    substitutedFeature.handlingUnitContent.handlingUnit.location.name,
                finalHandlingUnitIdStr: substitutedFeature.handlingUnitContent.handlingUnit.id,
                finalHandlingUnitNameStr: substitutedFeature.handlingUnitContent.handlingUnit.name,
                finalContentIdStr: substitutedFeature.handlingUnitContentId,
                lastTransactionId
            }
        };

        const movementOKResult = await graphqlRequestClient.request(
            createMovement,
            movementOKVariables,
            requestHeader
        );

        // 6- Get remaining Features List
        const remainingFeaturesQuery = gql`
            query handlingUnitContentFeatures($filters: HandlingUnitContentFeatureSearchFilters) {
                handlingUnitContentFeatures(filters: $filters) {
                    count
                    results {
                        id
                        extraStatus1
                        value
                        featureCodeId
                        featureCode {
                            id
                            name
                        }
                        handlingUnitContentId
                        handlingUnitContent {
                            id
                            stockStatus
                            stockStatusText
                            quantity
                            handlingUnitId
                            handlingUnit {
                                id
                                name
                                locationId
                                location {
                                    id
                                    name
                                    category
                                    categoryText
                                }
                                stockOwnerId
                                stockOwner {
                                    id
                                    name
                                }
                                parentHandlingUnitId
                                parentHandlingUnit {
                                    id
                                    name
                                }
                            }
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                            }
                            handlingUnitContentFeatures {
                                id
                                extraStatus1
                                value
                                featureCodeId
                                featureCode {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const remainingFeaturesVariables = {
            filters: {
                extraStatus1: parameters.HANDLING_UNIT_CONTENT_FEATURE_EXTRA_STATUS1_CHECK_NOK,
                handlingUnitContent_HandlingUnitId:
                    substitutedFeature.handlingUnitContent.handlingUnit.id
            }
        };

        const remainingFeaturesResult = await graphqlRequestClient.request(
            remainingFeaturesQuery,
            remainingFeaturesVariables,
            requestHeader
        );

        //merge results
        res.status(200).json({
            response: {
                remainingFeatures: remainingFeaturesResult?.handlingUnitContentFeatures?.results,
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
