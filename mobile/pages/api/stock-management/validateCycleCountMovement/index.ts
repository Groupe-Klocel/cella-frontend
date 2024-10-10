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
import { decodeJWT, GraphQLResponseType } from '@helpers';
import moment from 'moment';

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

    const username = decodeJWT(token).username;

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
        cycleCount,
        currentCycleCountLine,
        cycleCountMovement,
        location,
        handlingUnit,
        huToCreate,
        handlingUnitContent,
        article,
        stockOwner,
        stockStatus,
        feature,
        resType,
        quantity,
        featureCode
    } = req.body;

    console.log('API-input', req.body);

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

    let canRollbackTransaction = false;

    try {
        let finalCycleCountMovement = null;

        // Check if cycleCountMovement exists
        if (Object.keys(cycleCountMovement).length === 0) {
            // cycleCountMovement creation
            const createCycleCountMovementMutation = gql`
                mutation createCycleCountMovement($input: CreateCycleCountMovementInput!) {
                    createCycleCountMovement(input: $input) {
                        id
                        status
                        statusText
                        cycleCountId
                        cycleCountLineId
                        cycleCountLine {
                            cycleCountMovements {
                                id
                                status
                                statusText
                                cycleCountId
                                cycleCountLineId
                                originalQuantityPass1
                                quantityPass1
                                gapPass1
                                operatorPass1
                                originalQuantityPass2
                                quantityPass2
                                gapPass2
                                operatorPass2
                                originalQuantityPass3
                                quantityPass3
                                gapPass3
                                operatorPass3
                                articleId
                                articleNameStr
                                stockOwnerId
                                stockOwnerNameStr
                                locationId
                                locationNameStr
                                handlingUnitId
                                handlingUnitNameStr
                                parentHandlingUnitNameStr
                                handlingUnitContentId
                                contentStatus
                                handlingUnitContentFeatureId
                                features
                            }
                        }
                        lastTransactionId
                    }
                }
            `;

            const pass1Data = {
                status: currentCycleCountLine?.status,
                originalQuantityPass1: 0,
                quantityPass1: quantity,
                gapPass1: quantity,
                datePass1: moment(),
                operatorPass1: username
            };
            let CCMfeatures: any = {};
            if (resType == 'serialNumber') {
                CCMfeatures[featureCode.name] = {
                    value: feature.value
                };
            }

            const createCycleCountMovementVariables = {
                input: {
                    cycleCountId: cycleCount?.id,
                    locationId: location?.id,
                    locationNameStr: location?.name,
                    handlingUnitId: handlingUnit?.id ?? undefined,
                    handlingUnitNameStr: handlingUnit?.name ?? undefined,
                    parentHandlingUnitNameStr: handlingUnit?.parentHandlingUnit.name ?? undefined,
                    contentStatus: stockStatus?.key,
                    stockOwnerId: stockOwner?.id,
                    stockOwnerNameStr: stockOwner?.name,
                    articleId: article?.id,
                    articleNameStr: article?.name,
                    handlingUnitContentFeatureId: feature?.id ?? undefined,
                    features: CCMfeatures,
                    type: cycleCount?.type,
                    ...pass1Data,
                    createdByCycleCount: true,
                    lastTransactionId
                }
            };

            const createCycleCountMovementResult: GraphQLResponseType =
                await graphqlRequestClient.request(
                    createCycleCountMovementMutation,
                    createCycleCountMovementVariables,
                    requestHeader
                );

            finalCycleCountMovement = createCycleCountMovementResult.createCycleCountMovement;
        } else {
            // cycleCountMovement update
            let passXData: any = null;
            const quantityToUpdate = resType == 'serialNumber' ? 1 : handlingUnitContent?.quantity;
            switch (cycleCountMovement.status) {
                case configs.CYCLE_COUNT_STATUS_CREATED:
                case configs.CYCLE_COUNT_STATUS_PASS_1_IN_PROGRESS:
                    passXData = {
                        status: currentCycleCountLine?.status,
                        originalQuantityPass1: quantityToUpdate ?? 0,
                        quantityPass1: quantity,
                        gapPass1: quantity - quantityToUpdate,
                        datePass1: moment(),
                        operatorPass1: username
                    };
                    break;
                case configs.CYCLE_COUNT_STATUS_PASS_1_VALIDATED:
                case configs.CYCLE_COUNT_STATUS_PASS_2_IN_PROGRESS:
                    passXData = {
                        status: currentCycleCountLine?.status,
                        originalQuantityPass2: quantityToUpdate,
                        quantityPass2: quantity,
                        gapPass2: quantity - cycleCountMovement?.quantityToUpdate,
                        datePass2: moment(),
                        operatorPass2: username
                    };
                    break;
                case configs.CYCLE_COUNT_STATUS_PASS_2_VALIDATED:
                case configs.CYCLE_COUNT_STATUS_PASS_3_IN_PROGRESS:
                    passXData = {
                        status: currentCycleCountLine?.status,
                        originalQuantityPass3: quantityToUpdate,
                        quantityPass3: quantity,
                        gapPass3: quantity - cycleCountMovement?.quantityToUpdate,
                        datePass3: moment(),
                        operatorPass3: username
                    };
                    break;
                default:
                    passXData = null;
                    break;
            }

            const updateCycleCountMovementMutation = gql`
                mutation updateCycleCountMovement(
                    $id: String!
                    $input: UpdateCycleCountMovementInput!
                ) {
                    updateCycleCountMovement(id: $id, input: $input) {
                        id
                        status
                        statusText
                        cycleCountId
                        cycleCountLineId
                        cycleCountLine {
                            id
                            status
                            statusText
                            order
                            articleId
                            articleNameStr
                            stockOwnerId
                            stockOwnerNameStr
                            locationId
                            locationNameStr
                            handlingUnitId
                            handlingUnitNameStr
                            parentHandlingUnitNameStr
                            handlingUnitContentId
                            cycleCountId
                            cycleCountMovements {
                                id
                                status
                                statusText
                                cycleCountId
                                cycleCountLineId
                                originalQuantityPass1
                                quantityPass1
                                gapPass1
                                operatorPass1
                                originalQuantityPass2
                                quantityPass2
                                gapPass2
                                operatorPass2
                                originalQuantityPass3
                                quantityPass3
                                gapPass3
                                operatorPass3
                                articleId
                                articleNameStr
                                stockOwnerId
                                stockOwnerNameStr
                                locationId
                                locationNameStr
                                handlingUnitId
                                handlingUnitNameStr
                                parentHandlingUnitNameStr
                                handlingUnitContentId
                                contentStatus
                                handlingUnitContentFeatureId
                                features
                            }
                        }
                        lastTransactionId
                    }
                }
            `;

            const updateCycleCountMovementvariable = {
                id: cycleCountMovement.id,
                input: {
                    ...passXData,
                    lastTransactionId
                }
            };

            const updatedCycleCountMovementResponse: GraphQLResponseType =
                await graphqlRequestClient.request(
                    updateCycleCountMovementMutation,
                    updateCycleCountMovementvariable
                );

            finalCycleCountMovement = updatedCycleCountMovementResponse.updateCycleCountMovement;
            console.log('API-UpdateOutput', finalCycleCountMovement);
        }

        canRollbackTransaction = true;

        //merge results
        res.status(200).json({
            response: {
                updatedCycleCountLine: finalCycleCountMovement?.cycleCountLine,
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
