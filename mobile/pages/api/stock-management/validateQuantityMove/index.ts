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
import { isNonUniqueAndMatches } from '@helpers';

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
        originalLocation,
        articleInfo,
        articleLuBarcodeId,
        movingQuantity,
        finalLocation,
        finalHandlingUnit,
        isHuToCreate,
        resType,
        feature
    } = req.body;

    console.log('input', req.body);

    const finalStockStatus =
        finalLocation.stockStatus ?? originalLocation.originalContent?.stockStatus;

    const movementCodes = {
        initialStatus: originalLocation.originalContent.stockStatus,
        finalStatus: finalStockStatus,
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_STOCK,
        model: configs.MOVEMENT_MODEL_NORMAL,
        code: parameters.MOVEMENT_CODE_TRANSFER,
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

    //update mutation is shared for origin and destination
    const updateHUCMutation = gql`
        mutation updateHandlingUnitContent(
            $id: String!
            $input: UpdateHandlingUnitContentInput!
            $advancedInput: JSON!
        ) {
            updateHandlingUnitContent(id: $id, input: $input, advancedInput: $advancedInput) {
                id
                quantity
                handlingUnitContentFeatures {
                    id
                    featureCodeId
                    value
                }
                lastTransactionId
            }
        }
    `;

    try {
        //final content creation or update section
        let destinationHUC: { [k: string]: any } | undefined;
        // final content HU creation when needed
        let destinationHu = !isHuToCreate ? finalHandlingUnit : undefined;
        let nbDestinationHu = 0;
        // We always try to retrieve the final HU
        try {
            const newHUVariables = {
                filters: { name: finalHandlingUnit.name }
            };
            const queryHUM = gql`
                query handlingUnits($filters: HandlingUnitSearchFilters) {
                    handlingUnits(filters: $filters) {
                        count
                        results {
                            id
                            name
                            lastTransactionId
                            handlingUnitContents {
                                id
                                articleId
                                stockStatus
                                stockOwnerId
                                quantity
                            }
                        }
                    }
                }
            `;
            const destinationHuResult = await graphqlRequestClient.request(
                queryHUM,
                newHUVariables,
                requestHeader
            );
            console.log('destinationHuResult', destinationHuResult);

            destinationHu = destinationHuResult.handlingUnits.results[0];
            nbDestinationHu = destinationHuResult.handlingUnits.count;

            canRollbackTransaction = true;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
        console.log('destinationHu', destinationHu);
        try {
            if (nbDestinationHu == 0) {
                const newHUVariables = {
                    input: { ...finalHandlingUnit, lastTransactionId }
                };
                const createHUMutation = gql`
                    mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                        createHandlingUnit(input: $input) {
                            id
                            name
                            lastTransactionId
                            handlingUnitContents {
                                id
                                articleId
                                stockStatus
                                stockOwnerId
                                quantity
                            }
                        }
                    }
                `;
                const destinationHuResult = await graphqlRequestClient.request(
                    createHUMutation,
                    newHUVariables,
                    requestHeader
                );

                destinationHu = destinationHuResult.createHandlingUnit;

                canRollbackTransaction = true;
                console.log('HU created:', destinationHuResult);
            }
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }

        let isHUCCreated = false;
        // Check if there is a final content with same article and stock status exist in the current Hu, if not create it
        if (
            destinationHu.handlingUnitContents.length < 0 ||
            !destinationHu.handlingUnitContents?.some(
                (huc: any) =>
                    huc.articleId === articleInfo.articleId &&
                    huc.stockStatus === finalStockStatus &&
                    huc.stockOwnerId === originalLocation.originalContent.stockOwnerId &&
                    (huc.handlingUnitContentFeatures?.some((feature: any) =>
                        isNonUniqueAndMatches(feature, huc.handlingUnitContentFeatures)
                    ) ||
                        huc.handlingUnitContentFeatures?.every(
                            (feature: any) => feature.featureCode.unique === true
                        ))
            )
        ) {
            isHUCCreated = true;
            const newHUCVariables = {
                input: {
                    stockStatus: finalStockStatus,
                    handlingUnitId: destinationHu.id,
                    articleId: articleInfo.articleId,
                    articleLuBarcodeId,
                    quantity: movingQuantity,
                    stockOwnerId: originalLocation.originalContent.stockOwnerId,
                    lastTransactionId
                }
            };
            const createHUCMutation = gql`
                mutation createHandlingUnitContent($input: CreateHandlingUnitContentInput!) {
                    createHandlingUnitContent(input: $input) {
                        id
                        quantity
                        handlingUnitContentFeatures {
                            id
                            featureCodeId
                            value
                        }
                        lastTransactionId
                    }
                }
            `;
            const destinationHucResult = await graphqlRequestClient.request(
                createHUCMutation,
                newHUCVariables,
                requestHeader
            );

            destinationHUC = destinationHucResult.createHandlingUnitContent;
        } else {
            const destinationContentToUpdate = destinationHu.handlingUnitContents.filter(
                (huc: any) =>
                    huc.articleId === articleInfo.articleId &&
                    huc.stockStatus === finalStockStatus &&
                    huc.stockOwnerId === originalLocation.originalContent.stockOwnerId
            )[0];
            console.log('destinationContentToUpdate', destinationContentToUpdate);

            const destinationHUCVariables = {
                id: destinationContentToUpdate.id,
                input: {
                    lastTransactionId
                },
                advancedInput: {
                    quantity: `quantity+${movingQuantity}`
                }
            };
            const destinationHucResult = await graphqlRequestClient.request(
                updateHUCMutation,
                destinationHUCVariables,
                requestHeader
            );

            destinationHUC = destinationHucResult.updateHandlingUnitContent;
        }
        canRollbackTransaction = true;
        //end final content creation or update section

        // Create/Update HUCF
        if (resType === 'serialNumber') {
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
                    handlingUnitContentId: destinationHUC?.id,
                    lastTransactionId
                }
            };

            const updatedHUCF = await graphqlRequestClient.request(
                updateHUCFMutation,
                updateHUCFvariable
            );

            console.log('updatedHUCF', updatedHUCF);
        } else {
            // HUCF creation
            if (
                originalLocation.originalContent?.handlingUnitContentFeatures.length > 0 &&
                isHUCCreated
            ) {
                // Create HUCFs in new HUC
                const hucfInputs = [];
                for (const feature of originalLocation.originalContent
                    .handlingUnitContentFeatures) {
                    const inputsFeature = {
                        featureCodeId: feature.featureCode.id,
                        value: feature.value,
                        handlingUnitContentId: destinationHUC?.id,
                        lastTransactionId
                    };
                    hucfInputs.push(inputsFeature);
                }

                const createHUCFsMutation = gql`
                    mutation createHandlingUnitContentFeatures(
                        $inputs: [CreateHandlingUnitContentFeatureInput!]!
                    ) {
                        createHandlingUnitContentFeatures(inputs: $inputs)
                    }
                `;
                const createHUCFsVariables = {
                    inputs: hucfInputs
                };
                const createdHUCFs = await graphqlRequestClient.request(
                    createHUCFsMutation,
                    createHUCFsVariables,
                    requestHeader
                );

                //destination content Qty update
                const destinationHUCVariables = {
                    id: destinationHUC?.id,
                    input: {
                        lastTransactionId
                    },
                    advancedInput: {
                        quantity: `${movingQuantity}`
                    }
                };

                const destinationHucResult = await graphqlRequestClient.request(
                    updateHUCMutation,
                    destinationHUCVariables,
                    requestHeader
                );

                destinationHUC = destinationHucResult.updateHandlingUnitContent;
            }
        }

        //origin content update section
        const originHUCVariables = {
            id: originalLocation.originalContent.id,
            input: {
                lastTransactionId
            },
            advancedInput: {
                quantity: `quantity-${movingQuantity}`
            }
        };

        const originHucResult = await graphqlRequestClient.request(
            updateHUCMutation,
            originHUCVariables,
            requestHeader
        );
        //end origin content update section

        console.log('originHucResult', originHucResult);

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
                originalLocationIdStr: originalLocation.id,
                originalLocationNameStr: originalLocation.name,
                originalHandlingUnitIdStr: originalLocation.originalHu.id,
                originalHandlingUnitNameStr: originalLocation.originalHu.name,
                originalContentIdStr: originalLocation.originalContent.id,
                articleIdStr: articleInfo.articleId,
                articleNameStr: articleInfo.articleName,
                stockOwnerIdStr: originalLocation.originalContent.stockOwnerId,
                stockOwnerNameStr: originalLocation.originalContent.stockOwnerName,
                quantity: movingQuantity,
                ...movementCodes,
                finalLocationIdStr: finalLocation.id,
                finalLocationNameStr: finalLocation.name,
                finalContentIdStr: destinationHUC?.id,
                finalHandlingUnitIdStr: destinationHu.id,
                finalHandlingUnitNameStr: destinationHu.name,
                originalFeatures: JSON.stringify(
                    originalLocation.originalContent?.handlingUnitContentFeatures
                ),
                finalFeatures: JSON.stringify(destinationHUC?.handlingUnitContentFeatures),
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
                originHuc: originHucResult,
                destinationHUC,
                movement: resultMovement,
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
