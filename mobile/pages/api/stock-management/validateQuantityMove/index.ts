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
    const { originalLocation, articleInfo, articleLuBarcodeId, movingQuantity, finalLocation } =
        req.body;

    const movementCodes = {
        initialStatus: 14000,
        finalStatus: 14000,
        status: 1000,
        type: 20010,
        model: 10300,
        code: 10025,
        priority: 1
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

    //update mutation is shared for origin and destination
    const updateHUCMutation = gql`
        mutation updateHandlingUnitContent($id: String!, $input: UpdateHandlingUnitContentInput!) {
            updateHandlingUnitContent(id: $id, input: $input) {
                id
                quantity
                lastTransactionId
            }
        }
    `;

    try {
        //origin content update section
        const originHUCVariables = {
            id: originalLocation.originalContent.id,
            input: {
                quantity: originalLocation.originalContent.quantity - movingQuantity,
                lastTransactionId
            }
        };

        const originHucResult = await graphqlRequestClient.request(
            updateHUCMutation,
            originHUCVariables,
            requestHeader
        );
        //end origin content update section

        //final content creation or update section
        let destinationHucResult: { [k: string]: any } | null;
        // final content HU creation when needed
        let destinationHuResult: { [k: string]: any } | null;
        if (finalLocation.type == 'empty') {
            try {
                const res = await fetch(
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
                const SSCC = await res.json();

                if (SSCC) {
                    const newHUVariables = {
                        input: {
                            name: SSCC.response,
                            code: originalLocation.originalHu.code,
                            category: originalLocation.originalHu.category,
                            status: 450,
                            type: originalLocation.originalHu.type,
                            stockOwnerId: articleInfo.stockOwnerId,
                            locationId: finalLocation.id,
                            lastTransactionId
                        }
                    };
                    const createHUMutation = gql`
                        mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                            createHandlingUnit(input: $input) {
                                id
                                name
                                lastTransactionId
                            }
                        }
                    `;
                    destinationHuResult = await graphqlRequestClient.request(
                        createHUMutation,
                        newHUVariables,
                        requestHeader
                    );
                    //inject id in the finalLocation const
                    if (destinationHuResult) {
                        const destinationHu = {
                            destinationHuId: destinationHuResult.createHandlingUnit.id,
                            destinationHuName: destinationHuResult.createHandlingUnit.name
                        };
                        finalLocation['destinationHu'] = destinationHu;
                    }
                }
            } catch (error) {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
        //RESTART: check that code is still working after SSCC generator adding
        if (finalLocation.type == 'HU_without_HUC' || finalLocation.type == 'empty') {
            const newHUCVariables = {
                input: {
                    stockStatus: 14000,
                    handlingUnitId: finalLocation.destinationHu.destinationHuId,
                    articleId: articleInfo.articleId,
                    articleLuBarcodeId,
                    quantity: movingQuantity,
                    lastTransactionId
                }
            };
            const createHUCMutation = gql`
                mutation createHandlingUnitContent($input: CreateHandlingUnitContentInput!) {
                    createHandlingUnitContent(input: $input) {
                        id
                        quantity
                        lastTransactionId
                    }
                }
            `;
            destinationHucResult = await graphqlRequestClient.request(
                createHUCMutation,
                newHUCVariables,
                requestHeader
            );
            //inject id in the finalLocation const
            if (destinationHucResult) {
                const destinationContent = {
                    destinationContentId: destinationHucResult.createHandlingUnitContent.id
                };
                finalLocation['destinationContent'] = destinationContent;
            }
        } else {
            const destinationHUCVariables = {
                id: finalLocation.destinationContent.destinationContentId,
                input: {
                    quantity:
                        finalLocation.destinationContent.destinationContentQuantity +
                        movingQuantity,
                    lastTransactionId
                }
            };
            destinationHucResult = await graphqlRequestClient.request(
                updateHUCMutation,
                destinationHUCVariables,
                requestHeader
            );
        }
        //end final content creation or update section

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
                stockOwnerIdStr: articleInfo.stockOwnerId,
                stockOwnerNameStr: articleInfo.stockOwnerName,
                quantity: movingQuantity,
                ...movementCodes,
                finalLocationIdStr: finalLocation.id,
                finalLocationNameStr: finalLocation.name,
                finalContentIdStr: finalLocation.destinationContent.destinationContentId,
                finalHandlingUnitIdStr: finalLocation.destinationHu.destinationHuId,
                finalHandlingUnitNameStr: finalLocation.destinationHu.destinationHuName,
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
                destinationHUC: destinationHucResult,
                movement: resultMovement,
                lastTransactionId
            }
        });
    } catch (error) {
        console.log(error);
        await graphqlRequestClient.request(rollbackTransaction, rollbackVariable, requestHeader);
        res.status(500).json({ error });
    }
};
