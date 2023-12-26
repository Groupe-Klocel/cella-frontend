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
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';

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

    // retrieve information from front
    const { trigger, originData, destinationData } = req.body;

    console.log('API-input:', req.body);

    const commonMovementInfos = {
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_STOCK,
        model: configs.MOVEMENT_MODEL_NORMAL,
        priority: parameters.PRIORITY_NORMAL
    };

    const originCommonInfos = {
        originalLocationIdStr: originData?.locationId,
        originalLocationNameStr: originData?.locationName,
        originalContentIdStr: originData?.handlingUnitContentId,
        originalHandlingUnitIdStr: originData?.handlingUnitId,
        originalHandlingUnitNameStr: originData?.handlingUnitName
    };

    const destinationCommonInfos = {
        finalLocationIdStr: destinationData?.locationId,
        finalLocationNameStr: destinationData?.locationName,
        finalContentIdStr: destinationData?.handlingUnitContentId,
        finalHandlingUnitIdStr: destinationData?.handlingUnitId,
        finalHandlingUnitNameStr: destinationData?.handlingUnitName,
        finalQuantity: destinationData?.quantity
    };

    let canRollbackTransaction = false;
    let movementInputs = [];
    if (trigger == 'addContent') {
        movementInputs.push({
            articleIdStr: destinationData?.articleId,
            articleNameStr: destinationData?.articleName,
            stockOwnerIdStr: destinationData?.stockOwnerId,
            stockOwnerNameStr: destinationData?.stockOwnerName,
            quantity: destinationData?.quantity,
            finalStatus: destinationData?.stockStatus,
            ...commonMovementInfos,
            code: parameters.MOVEMENT_CODE_POSITIVE_STOCK_ADJUSTEMENT,
            ...destinationCommonInfos,
            lastTransactionId
        });
    } else if (trigger == 'deleteContent') {
        movementInputs.push({
            articleIdStr: originData?.articleId,
            articleNameStr: originData?.articleName,
            stockOwnerIdStr: originData?.stockOwnerId,
            stockOwnerNameStr: originData?.stockOwnerName,
            quantity: -originData?.quantity,
            initialStatus: originData?.stockStatus,
            ...commonMovementInfos,
            code: parameters.MOVEMENT_CODE_NEGATIVE_STOCK_ADJUSTEMENT,
            ...originCommonInfos,
            lastTransactionId
        });
    } else if (trigger == 'updateContent') {
        const fieldsOfInterest = ['stockOwnerId', 'stockOwnerName', 'articleId', 'articleName'];
        const hasFieldChange = fieldsOfInterest.some(
            (key) => originData[key] !== destinationData[key]
        );
        console.log('hfC', hasFieldChange);
        if (hasFieldChange) {
            const originObject = {
                articleIdStr: originData.articleId,
                articleNameStr: originData.articleName,
                stockOwnerIdStr: originData.stockOwnerId,
                stockOwnerNameStr: originData.stockOwnerName,
                quantity: -originData.quantity,
                ...originCommonInfos,
                ...destinationCommonInfos,
                ...commonMovementInfos,
                code: parameters.MOVEMENT_CODE_NEGATIVE_STOCK_ADJUSTEMENT
            };
            const destinationObject = {
                articleIdStr: destinationData.articleId,
                articleNameStr: destinationData.articleName,
                stockOwnerIdStr: destinationData.stockOwnerId,
                stockOwnerNameStr: destinationData.stockOwnerName,
                quantity: destinationData.quantity,
                ...originCommonInfos,
                ...destinationCommonInfos,
                ...commonMovementInfos,
                code: parameters.MOVEMENT_CODE_POSITIVE_STOCK_ADJUSTEMENT
            };
            movementInputs.push({ ...originObject }, { ...destinationObject });
        } else if (originData.Quantity !== destinationData.Quantity) {
            const movingQuantity = destinationData.quantity - originData.quantity;
            const quantityChangeObject = {
                articleIdStr: originData?.articleId,
                articleNameStr: originData?.articleName,
                stockOwnerIdStr: originData?.stockOwnerId,
                stockOwnerNameStr: originData?.stockOwnerName,
                quantity: movingQuantity,
                ...originCommonInfos,
                ...destinationCommonInfos,
                ...commonMovementInfos,
                code:
                    movingQuantity > 0
                        ? parameters.MOVEMENT_CODE_POSITIVE_STOCK_ADJUSTEMENT
                        : parameters.MOVEMENT_CODE_NEGATIVE_STOCK_ADJUSTEMENT
            };
            movementInputs.push(quantityChangeObject);
        }
        const fieldsOfInterest2 = ['stockStatus', 'reservation'];
        const hasFieldChange2 = fieldsOfInterest2.some(
            (key) => originData[key] !== destinationData[key]
        );
        if (hasFieldChange2) {
            const changingStatusReservation = {
                articleIdStr: originData.articleId,
                articleNameStr: originData.articleName,
                stockOwnerIdStr: originData.stockOwnerId,
                stockOwnerNameStr: originData.stockOwnerName,
                initialStatus: originData?.stockStatus,
                finalStatus: destinationData?.stockStatus,
                initialReservation: originData?.reservation,
                finalReservation: destinationData?.reservation,
                ...originCommonInfos,
                ...destinationCommonInfos,
                ...commonMovementInfos,
                code: parameters['MOVEMENT_CODE_STATUS/RESERVATION_CHANGE']
            };
            movementInputs.push({ ...changingStatusReservation });
        }
    } else if (trigger == 'addContentFeature') {
        const finalFeatures: any = {};
        finalFeatures[destinationData.feature.code] = {
            value: destinationData.feature.value
        };
        movementInputs.push({
            articleIdStr: destinationData?.articleId,
            articleNameStr: destinationData?.articleName,
            stockOwnerIdStr: destinationData?.stockOwnerId,
            stockOwnerNameStr: destinationData?.stockOwnerName,
            quantity: destinationData?.quantity,
            finalStatus: destinationData?.stockStatus,
            ...commonMovementInfos,
            code: parameters.MOVEMENT_CODE_POSITIVE_STOCK_ADJUSTEMENT,
            ...destinationCommonInfos,
            finalFeatures,
            lastTransactionId
        });
    } else if (trigger == 'deleteContentFeature') {
        const originalFeatures: any = {};
        originalFeatures[originData.feature.code] = {
            value: originData.feature.value
        };
        movementInputs.push({
            articleIdStr: originData?.articleId,
            articleNameStr: originData?.articleName,
            stockOwnerIdStr: originData?.stockOwnerId,
            stockOwnerNameStr: originData?.stockOwnerName,
            quantity: originData?.quantity,
            initialStatus: originData?.stockStatus,
            finalStatus: originData?.stockStatus,
            ...commonMovementInfos,
            code: parameters.MOVEMENT_CODE_NEGATIVE_STOCK_ADJUSTEMENT,
            ...originCommonInfos,
            originalFeatures,
            lastTransactionId
        });
    } else if (trigger == 'updateContentFeature') {
        const originalFeatures: any = {};
        originalFeatures[originData.feature.code] = {
            value: originData.feature.value
        };
        const finalFeatures: any = {};
        finalFeatures[destinationData.feature.code] = {
            value: destinationData.feature.value
        };
        movementInputs.push({
            articleIdStr: destinationData?.articleId,
            articleNameStr: destinationData?.articleName,
            stockOwnerIdStr: destinationData?.stockOwnerId,
            stockOwnerNameStr: destinationData?.stockOwnerName,
            quantity: destinationData?.quantity,
            initialStatus: destinationData?.stockStatus,
            finalStatus: destinationData?.stockStatus,
            ...commonMovementInfos,
            code: parameters['MOVEMENT_CODE_STATUS/RESERVATION_CHANGE'],
            ...originCommonInfos,
            ...destinationCommonInfos,
            originalFeatures,
            finalFeatures,
            lastTransactionId
        });
    }

    console.log('movIpts', movementInputs);

    try {
        let movementResults: any = [];
        //create Movement input
        await Promise.all(
            (movementInputs = movementInputs.map(async (movementInput) => {
                const movementVariables = {
                    input: movementInput
                };

                //create movement
                const createMovement = gql`
                    mutation createMovement($input: CreateMovementInput!) {
                        createMovement(input: $input) {
                            id
                            lastTransactionId
                        }
                    }
                `;
                const resultMovement = await graphqlRequestClient.request(
                    createMovement,
                    movementVariables,
                    requestHeader
                );

                console.log('resultMovement', resultMovement);
                //rollback transaction now exists in db and we can rollback if error occurs
                canRollbackTransaction = true;

                movementResults.push(resultMovement);
            }))
        );
        res.status(200).json({
            response: {
                createdMovement: movementResults
            }
        });
    } catch (error: any) {
        console.log('mvtError', error);
        if (canRollbackTransaction)
            await graphqlRequestClient.request(
                rollbackTransaction,
                rollbackVariable,
                requestHeader
            );
        res.status(500).json({ error });
    }
};
