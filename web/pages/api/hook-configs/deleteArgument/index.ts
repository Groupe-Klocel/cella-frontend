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
import { InputMaybe, Scalars } from 'generated/graphql';

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
    let canRollbackTransaction = false;

    const requestHeader = {
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

    const { id, argument, argKey } = req.body;

    try {
        const input_tmp: InputMaybe<Scalars['JSON']> = {};
        const jsonData: any = {};

        argument.split(',').forEach((element: any) => {
            if (element !== '') {
                const [key, value] = element.split('=');
                if (key !== argKey) {
                    jsonData[key] = value;
                }
            }
        });

        input_tmp['argument'] = Object.assign({}, jsonData);

        const query = gql`
            mutation UpdateHookConfig($id: String!, $input: UpdateHookConfigInput!) {
                updateHookConfig(id: $id, input: $input) {
                    id
                    argument
                }
            }
        `;
        const cleanArgumentVariables = {
            id,
            input: {
                argument: {},
                lastTransactionId
            }
        };

        const cleanArgumentResponse = await graphqlRequestClient.request(
            query,
            cleanArgumentVariables,
            requestHeader
        );

        canRollbackTransaction = true;

        if (cleanArgumentResponse.updateHookConfig) {
            const updateArgumentVariables = {
                id,
                input: {
                    ...input_tmp,
                    lastTransactionId
                }
            };

            const result = await graphqlRequestClient.request(
                query,
                updateArgumentVariables,
                requestHeader
            );

            res.status(200).json({
                response: {
                    updateHookConfig: result.updateHookConfig ?? undefined
                }
            });
        }
    } catch (error: any) {
        if (canRollbackTransaction)
            await graphqlRequestClient.request(
                rollbackTransaction,
                rollbackVariable,
                requestHeader
            );
        res.status(500).json({ error: error });
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