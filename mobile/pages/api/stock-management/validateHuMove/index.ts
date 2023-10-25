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

//
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
    const { originHandlingUnit, originLocation, finalHandlingUnit, finalLocation, isHuToCreate } =
        req.body;

    const movementCodes = {
        initialStatus: originLocation.stockStatus,
        finalStatus: finalLocation.stockStatus,
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_STOCK,
        model: configs.MOVEMENT_MODEL_NORMAL,
        code: parameters.MOVEMENT_CODE_TRANSFER,
        priority: parameters.PRIORITY_NORMAL
    };
    if (originHandlingUnit.category == parameters.HANDLING_UNIT_CATEGORY_INBOUND) {
        movementCodes.code = parameters.MOVEMENT_CODE_RECEPTION;
    }

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

    //update hu section
    try {
        // create dummy hu if needed
        if (isHuToCreate) {
            const createHUquery = gql`
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
                input: { ...finalHandlingUnit, lastTransactionId }
            };

            const createdHu = await graphqlRequestClient.request(createHUquery, createHUvariables);
            finalHandlingUnit.id = createdHu.createHandlingUnit.id;
            canRollbackTransaction = true;
        }
        // end create dummy hu if needed

        const updateHUMutation = gql`
            mutation updateHandlingUnit($id: String!, $input: UpdateHandlingUnitInput!) {
                updateHandlingUnit(id: $id, input: $input) {
                    id
                    locationId
                    lastTransactionId
                }
            }
        `;

        // change category in case of movement from inbound
        const category =
            originHandlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_INBOUND
                ? parameters.HANDLING_UNIT_CATEGORY_STOCK
                : finalHandlingUnit.category;

        // update originHandlingUnit.parent_hu_id if there a finalHandlingUnit and it is different from originHandlingUnit
        let parentHandlingUnitId = null;
        if (finalHandlingUnit && finalHandlingUnit.id != originHandlingUnit.id) {
            parentHandlingUnitId = finalHandlingUnit.id;
        }

        const updateHUVariables = {
            id: originHandlingUnit.id,
            input: {
                locationId: finalLocation.id,
                category: category,
                parentHandlingUnitId: parentHandlingUnitId,
                lastTransactionId
            }
        };

        const updateHuResult = await graphqlRequestClient.request(
            updateHUMutation,
            updateHUVariables,
            requestHeader
        );

        canRollbackTransaction = true;
        //end handling unit update section

        let updateHucResult = null;
        if (finalLocation.stockStatus && originHandlingUnit.handlingUnitContents.length > 0) {
            // update huc stock statuses
            const hucIds = originHandlingUnit.handlingUnitContents.map(
                (huc: { id: any }) => huc.id
            );

            const updateHUCMutation = gql`
                mutation updateHandlingUnitContent(
                    $ids: [String!]!
                    $input: UpdateHandlingUnitContentInput!
                ) {
                    updateHandlingUnitContents(ids: $ids, input: $input)
                }
            `;

            const updateHUCVariables = {
                ids: hucIds,
                input: {
                    stockStatus: finalLocation.stockStatus,
                    lastTransactionId
                }
            };

            const updateHucResult = await graphqlRequestClient.request(
                updateHUCMutation,
                updateHUCVariables,
                requestHeader
            );
            // end update huc stock statuses
        }

        //movements creation section
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;

        let movementResults: any;
        if (originHandlingUnit.handlingUnitContents.length > 0) {
            movementResults = []
            await Promise.all(
                originHandlingUnit.handlingUnitContents.map(async (handlingUnitContent: any) => {
                    const movementVariables = {
                        input: {
                            originalLocationIdStr: originLocation.id,
                            originalLocationNameStr: originLocation.name,
                            originalHandlingUnitIdStr: originHandlingUnit.id,
                            originalHandlingUnitNameStr: originHandlingUnit.name,
                            originalContentIdStr: handlingUnitContent.id,
                            articleIdStr: handlingUnitContent.articleId,
                            articleNameStr: handlingUnitContent.article.name,
                            stockOwnerIdStr: originHandlingUnit.stockOwnerId,
                            stockOwnerNameStr: originHandlingUnit.stockOwner.name,
                            ...movementCodes,
                            finalLocationIdStr: finalLocation.id,
                            finalLocationNameStr: finalLocation.name,
                            finalContentIdStr: handlingUnitContent.id,
                            finalHandlingUnitIdStr: finalHandlingUnit.id,
                            finalHandlingUnitNameStr: finalHandlingUnit.name,
                            lastTransactionId
                        }
                    };

                    const resultMovementLine = await graphqlRequestClient.request(
                        createMovement,
                        movementVariables,
                        requestHeader
                    );
                    movementResults.push(resultMovementLine);
                })
            );
        }
        else {
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
                    originalLocationIdStr: originLocation.id,
                    originalLocationNameStr: originLocation.name,
                    originalHandlingUnitIdStr: originHandlingUnit.id,
                    originalHandlingUnitNameStr: originHandlingUnit.name,
                    stockOwnerIdStr: originHandlingUnit.stockOwnerId,
                    stockOwnerNameStr: originHandlingUnit.stockOwner.name,
                    ...movementCodes,
                    finalLocationIdStr: finalLocation.id,
                    finalLocationNameStr: finalLocation.name,
                    finalHandlingUnitIdStr: finalHandlingUnit.id,
                    finalHandlingUnitNameStr: finalHandlingUnit.name,
                    lastTransactionId
                }
            };

            const movementResults = await graphqlRequestClient.request(
                createMovement,
                movementVariables,
                requestHeader
            );
            //end movement creation section
        }
        //end movement creation section

        //merge results
        res.status(200).json({
            response: {
                updatedHU: updateHuResult,
                updatedHUC: updateHucResult,
                movement: movementResults,
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
