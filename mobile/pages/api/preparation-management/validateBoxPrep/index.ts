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
        authorization: `Bearer ${token}`
    };

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    // retrieve information from front
    const { box, articleInfo, boxLine, movingQuantity, pickedLocation } = req.body;

    const movementCodes = {
        initialStatus: parameters.STOCK_STATUSES_SALE,
        status: configs.MOVEMENT_STATUS_VALIDATED,
        type: configs.MOVEMENT_TYPE_PREPARATION,
        model: configs.MOVEMENT_MODEL_NORMAL,
        code: parameters.MOVEMENT_CODE_PRODUCT_PICK,
        priority: parameters.PRIORITY_NORMAL
    };

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

    try {
        //retrieve original content
        const HUCFilter = {
            filters: {
                articleId: articleInfo.id,
                handlingUnit_StockOwnerId: articleInfo.stockOwnerId,
                handlingUnit_LocationId: pickedLocation.id
            }
        };

        const HUCQuery = gql`
            query GetHandlingUnitContents(
                $filters: HandlingUnitContentSearchFilters
                $orderBy: [HandlingUnitContentOrderByCriterion!]
            ) {
                handlingUnitContents(filters: $filters, orderBy: $orderBy) {
                    results {
                        id
                        handlingUnitId
                        handlingUnit {
                            name
                        }
                    }
                }
            }
        `;

        const HUCResponse: GraphQLResponseType = await graphqlRequestClient.request(
            HUCQuery,
            HUCFilter,
            requestHeader
        );

        // update box_line section
        const boxLineUpdateInput = {
            id: boxLine.id,
            input: {
                pickedQuantity: boxLine.pickedQuantity + movingQuantity,
                lastTransactionId
            }
        };

        const updateBoxLineMutation = gql`
            mutation updateBoxLine($id: String!, $input: UpdateHandlingUnitContentOutboundInput!) {
                updateHandlingUnitContentOutbound(id: $id, input: $input) {
                    pickedQuantity
                }
            }
        `;

        const updateBoxLineResponse = await graphqlRequestClient.request(
            updateBoxLineMutation,
            boxLineUpdateInput,
            requestHeader
        );
        //end updated box line section

        // retrieve PurchaseOrder info after update if needed
        const updatedBoxQuery = gql`
            query GetUpdatedBox($id: String!) {
                handlingUnitOutbound(id: $id) {
                    id
                    name
                    status
                    statusText
                    preparationMode
                    preparationModeText
                    carrier {
                        id
                        name
                    }
                    delivery {
                        id
                        name
                    }
                    handlingUnitModel {
                        id
                        name
                        weight
                        closureWeight
                    }
                    round {
                        id
                        name
                    }
                    handlingUnit {
                        id
                        name
                        stockOwnerId
                        stockOwner {
                            name
                        }
                        status
                        statusText
                        warehouseCode
                    }
                    handlingUnitContentOutbounds {
                        id
                        lineNumber
                        status
                        statusText
                        pickedQuantity
                        quantityToBePicked
                        pickingLocation {
                            id
                            name
                        }
                        handlingUnitContent {
                            id
                            articleId
                        }
                    }
                    createdBy
                    created
                    modifiedBy
                    modified
                    extras
                }
            }
        `;
        const updatedBoxId = {
            id: box.id
        };

        const updatedBoxResponse: GraphQLResponseType = await graphqlRequestClient.request(
            updatedBoxQuery,
            updatedBoxId,
            requestHeader
        );
        //end updated box line section

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
                articleIdStr: articleInfo.articleId,
                articleNameStr: articleInfo.articleName,
                stockOwnerIdStr: articleInfo.stockOwnerId,
                stockOwnerNameStr: articleInfo.stockOwnerName,
                quantity: movingQuantity,
                ...movementCodes,
                originalLocationIdStr: pickedLocation.id,
                originalLocationNameStr: pickedLocation.name,
                originalContentIdStr: HUCResponse.handlingUnitContents.results[0].id,
                finalContentIdStr: boxLine.handlingUnitContent.id,
                originalHandlingUnitIdStr:
                    HUCResponse.handlingUnitContents.results[0].handlingUnitId,
                originalHandlingUnitNameStr:
                    HUCResponse.handlingUnitContents.results[0].handlingUnit.name,
                finalHandlingUnitIdStr: box.handlingUnit.id,
                finalHandlingUnitNameStr: box.handlingUnit.name,
                handlingUnitOutboundIdStr: box.id,
                handlingUnitOutboundNameStr: box.name,
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
                preparedBoxLine: updateBoxLineResponse,
                updatedBox: updatedBoxResponse.handlingUnitOutbound,
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
