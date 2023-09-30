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
    const { handlingUnit, finalLocation } = req.body;

    const movementCodes = {
        initialStatus: parameters.STOCK_STATUSES_SALE,
        finalStatus: parameters.STOCK_STATUSES_SALE,
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_STOCK,
        model: configs.MOVEMENT_MODEL_NORMAL,
        code: parameters.MOVEMENT_CODE_TRANSFER,
        // code: parameters.MOVEMENT_CODE_RECEPTION,
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

    //update hu section
    try {
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
            handlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_INBOUND
                ? parameters.HANDLING_UNIT_CATEGORY_STOCK
                : handlingUnit.category;

        const updateHUVariables = {
            id: handlingUnit.id,
            input: { locationId: finalLocation.id, category, lastTransactionId }
        };

        const updateHuResult = await graphqlRequestClient.request(
            updateHUMutation,
            updateHUVariables,
            requestHeader
        );
        //end handling unit update section

        //movements creation section
        const createMovement = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;

        let movementResults: any = [];
        await Promise.all(
            handlingUnit.handlingUnitContent.map(async (handlingUnitContent: any) => {
                const movementVariables = {
                    input: {
                        originalLocationIdStr: handlingUnit.locationId,
                        originalLocationNameStr: handlingUnit.location.name,
                        originalHandlingUnitIdStr: handlingUnit.id,
                        originalHandlingUnitNameStr: handlingUnit.name,
                        originalContentIdStr: handlingUnitContent.id,
                        articleIdStr: handlingUnitContent.articleId,
                        articleNameStr: handlingUnitContent.article.name,
                        stockOwnerIdStr: handlingUnit.stockOwnerId,
                        stockOwnerNameStr: handlingUnit.stockOwner.name,
                        ...movementCodes,
                        finalLocationIdStr: finalLocation.id,
                        finalLocationNameStr: finalLocation.name,
                        finalContentIdStr: handlingUnitContent.id,
                        finalHandlingUnitIdStr: handlingUnit.id,
                        finalHandlingUnitNameStr: handlingUnit.name,
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
        //end movement creation section

        //merge results
        res.status(200).json({
            response: {
                updatedHU: updateHuResult,
                movement: movementResults,
                lastTransactionId
            }
        });
    } catch (error) {
        console.log(error);
        await graphqlRequestClient.request(rollbackTransaction, rollbackVariable, requestHeader);
        res.status(500).json({ error });
    }
};
