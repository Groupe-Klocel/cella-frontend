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

    // retrieve information from front
    const { input } = req.body;

    let canRollbackTransaction = false;

    try {
        //updateBarcodeInput
        const updateBarcodeInput = {
            id: input.barcodeId,
            input: {
                blacklisted: input.blacklisted,
                lastTransactionId
            }
        };

        //update barcode
        const updateBarcode = gql`
            mutation UpdateBarcode($id: String!, $input: UpdateBarcodeInput!) {
                updateBarcode(id: $id, input: $input) {
                    id
                    blacklisted
                }
            }
        `;
        const updateBarcodeResponse: GraphQLResponseType = await graphqlRequestClient.request(
            updateBarcode,
            updateBarcodeInput,
            requestHeader
        );

        //rollback transaction now exists in db and we can rollback if error occurs
        canRollbackTransaction = true;

        //updateArticleLuBarcodeInput
        const updateArticleLuBarcodeInput = {
            id: input.id,
            input: {
                master: input.master,
                lastTransactionId
            }
        };

        //update article_lu_barcode
        const updateArticleLuBarcode = gql`
            mutation UpdateArticleLuBarcode($id: String!, $input: UpdateArticleLuBarcodeInput!) {
                updateArticleLuBarcode(id: $id, input: $input) {
                    id
                    master
                }
            }
        `;
        const updateArticleLuBarcodeResponse: GraphQLResponseType =
            await graphqlRequestClient.request(
                updateArticleLuBarcode,
                updateArticleLuBarcodeInput,
                requestHeader
            );
        res.status(200).json({
            response: {
                updatedBarcode: updateBarcodeResponse.updateBarcode ?? undefined,
                updatedArticleLuBarcode:
                    updateArticleLuBarcodeResponse.updateArticleLuBarcode ?? undefined
            }
        });
    } catch (error: any) {
        if (canRollbackTransaction)
            await graphqlRequestClient.request(
                rollbackTransaction,
                rollbackVariable,
                requestHeader
            );
        res.status(500).json({ error });
        if (error.response.errors[0].extensions) {
            res.status(500).json({
                error: {
                    is_error: error.response.errors[0].extensions.is_error,
                    code: error.response.errors[0].extensions.code,
                    message: error.response.errors[0].message,
                    variables: error.response.errors[0].extensions.variables,
                    exception: error.response.errors[0].extensions.exception
                }
            });
        } else {
            res.status(500).json({
                error: error
            });
        }
    }
};
