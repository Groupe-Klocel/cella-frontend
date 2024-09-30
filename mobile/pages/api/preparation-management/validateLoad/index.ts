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
    const { box, load } = req.body;

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
        // Update box status
        const updatedBoxMutation = gql`
            mutation updateHandlingUnitOutbound(
                $id: String!
                $input: UpdateHandlingUnitOutboundInput!
            ) {
                updateHandlingUnitOutbound(id: $id, input: $input) {
                    id
                    status
                    loadId
                }
            }
        `;
        const data = {
            status: configs.HANDLING_UNIT_OUTBOUND_STATUS_LOADED,
            loadId: load.id,
            lastTransactionId
        };
        const updatedBoxVariables = {
            id: box.id,
            input: data
        };

        const resultBoxResponse: GraphQLResponseType = await graphqlRequestClient.request(
            updatedBoxMutation,
            updatedBoxVariables,
            requestHeader
        );
        console.log('Result of box Status', resultBoxResponse);

        // Update Load
        const updatedLoadMutation = gql`
            mutation updateLoad($id: String!, $input: UpdateLoadInput!) {
                updateLoad(id: $id, input: $input) {
                    id
                    status
                }
            }
        `;
        const dataForLoad = {
            status: configs.LOAD_STATUS_LOAD_IN_PROGRESS,
            numberHuLoaded: load.numberHuLoaded + 1,
            weight: load.weight + box.theoriticalWeight,
            lastTransactionId
        };
        const updatedLoadVariables = {
            id: load.id,
            input: dataForLoad
        };

        const resultLoadResponse = await graphqlRequestClient.request(
            updatedLoadMutation,
            updatedLoadVariables,
            requestHeader
        );
        console.log('Result of Load Status', resultLoadResponse);

        // Create Load Line
        const createLoadLineMutation = gql`
            mutation createLoadLine($input: CreateLoadLineInput!) {
                createLoadLine(input: $input) {
                    id
                }
            }
        `;
        const updatedLoadLineVariables = {
            input: {
                status: configs.LOAD_STATUS_CREATED,
                handlingUnitName: box.handlingUnit.name,
                handlingUnitId: box.handlingUnit.id,
                loadId: load.id
            }
        };

        const resultLoadlineResponse = await graphqlRequestClient.request(
            createLoadLineMutation,
            updatedLoadLineVariables,
            requestHeader
        );
        console.log('Result of Load line id', resultLoadlineResponse);

        //merge results
        res.status(200).json({
            response: {
                updatedBox: resultBoxResponse.handlingUnitOutbound,
                lastTransactionId
            }
        });
    } catch (error) {
        await graphqlRequestClient.request(rollbackTransaction, rollbackVariable, requestHeader);
        res.status(500).json({ error });
    }
};
