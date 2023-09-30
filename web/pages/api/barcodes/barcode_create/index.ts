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
    const { input } = req.body;

    try {
        //createBarcodeSection
        const createBarcodeInput = {
            input: {
                name: input.name,
                stockOwnerId: input.stockOwnerId,
                lastTransactionId
            }
        };

        const createBarcode = gql`
            mutation CreateBarcode($input: CreateBarcodeInput!) {
                createBarcode(input: $input) {
                    id
                    name
                    stockOwnerId
                }
            }
        `;
        const createBarcodeResponse = await graphqlRequestClient.request(
            createBarcode,
            createBarcodeInput,
            requestHeader
        );

        //createArticleLuBarcode section
        let createArticleLuBarcodeResponse;
        if (createBarcodeResponse) {
            const createArticleLuBarcodeInput = {
                input: {
                    articleId: input.articleId,
                    articleLuId: input.articleLuId,
                    stockOwnerId: input.stockOwnerId,
                    master: input.master,
                    barcodeId: createBarcodeResponse.createBarcode.id,
                    lastTransactionId
                }
            };

            const createArticleLuBarcode = gql`
                mutation CreateArticleLuBarcode($input: CreateArticleLuBarcodeInput!) {
                    createArticleLuBarcode(input: $input) {
                        id
                        articleId
                        articleLuId
                        barcodeId
                        stockOwnerId
                        master
                    }
                }
            `;
            createArticleLuBarcodeResponse = await graphqlRequestClient.request(
                createArticleLuBarcode,
                createArticleLuBarcodeInput,
                requestHeader
            );
        }
        res.status(200).json({
            response: {
                createdBarcode: createBarcodeResponse.createBarcode ?? undefined,
                createdArticleLuBarcode:
                    createArticleLuBarcodeResponse.createArticleLuBarcode ?? undefined
            }
        });
        console.log('DLA-res', res);
    } catch (error: any) {
        console.log('DLA-err', error);
        await graphqlRequestClient.request(rollbackTransaction, rollbackVariable, requestHeader);
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
