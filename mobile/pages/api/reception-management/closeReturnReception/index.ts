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
    const { purchaseOrder } = req.body;

    // Transaction management
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
        // 1- update purchaseOrder status
        const updatePurchaseOrderMutation = gql`
            mutation updatePurchaseOrder($id: String!, $input: UpdatePurchaseOrderInput!) {
                updatePurchaseOrder(id: $id, input: $input) {
                    id
                    name
                    purchaseOrderLines {
                        id
                        lineNumber
                        quantity
                        receivedQuantity
                        quantityMax
                    }
                    lastTransactionId
                }
            }
        `;

        const updatePurchaseOrderVariable = {
            id: purchaseOrder.id,
            input: {
                status: configs.PURCHASE_ORDER_STATUS_CLOSED,
                lastTransactionId
            }
        };

        const updatedPurchaseOrder = await graphqlRequestClient.request(
            updatePurchaseOrderMutation,
            updatePurchaseOrderVariable
        );
        canRollbackTransaction = true;

        console.log('updatedPurchaseOrder', updatedPurchaseOrder?.updatePurchaseOrder);

        // 2- update PO Lines status and quantityMax
        if (
            updatedPurchaseOrder?.updatePurchaseOrder?.purchaseOrderLines &&
            updatedPurchaseOrder?.updatePurchaseOrder?.purchaseOrderLines.length > 0
        ) {
            const poLinesIds = updatedPurchaseOrder?.updatePurchaseOrder?.purchaseOrderLines.map((line: any) => line.id);
            console.log('poLinesIds', poLinesIds);

            const updatePurchaseOrderLineMutation = gql`
                mutation updatePurchaseOrderLines(
                    $ids: [String!]!
                    $input: UpdatePurchaseOrderLineInput!
                ) {
                    updatePurchaseOrderLines(ids: $ids, input: $input) 
                }
            `;

            const updatePurchaseOrderLineVariable = {
                ids: poLinesIds,
                input: {
                    status: configs.PURCHASE_ORDER_LINE_STATUS_CLOSED,
                    lastTransactionId
                }
            };

            const updatedPurchaseOrderLine = await graphqlRequestClient.request(
                updatePurchaseOrderLineMutation,
                updatePurchaseOrderLineVariable
            );
        }

        //merge results
        res.status(200).json({
            response: {
                updatedPurchaseOrder,
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
