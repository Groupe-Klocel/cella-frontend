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
import { generateStandardNumber } from '@helpers';

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

    const { orderDate, supplier } = req.body;

    try {
        const PrefixQuery = gql`
            query GetPrefix {
                parameters(filters: { scope: "return", code: "PREFIX" }) {
                    results {
                        value
                    }
                }
            }
        `;

        const PrefixResponse = await graphqlRequestClient.request(PrefixQuery, requestHeader);

        const counterQuery = gql`
            mutation GetGoodsInCounter {
                getNextCounter(counterCode: "RETURN_COUNTER")
            }
        `;

        const counterResponse = await graphqlRequestClient.request(counterQuery, requestHeader);

        const name = generateStandardNumber(
            PrefixResponse.parameters.results[0].value,
            counterResponse.getNextCounter
        );
        let createdPO;
        if (name) {
            const newreturnPOVariables = {
                input: {
                    name,
                    type: configs.PURCHASE_ORDER_TYPE_L2_RETURN,
                    status: configs.PURCHASE_ORDER_STATUS_IN_PROGRESS,
                    orderDate,
                    supplier
                }
            };

            const createReturnPoMutation = gql`
                mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
                    createPurchaseOrder(input: $input) {
                        id
                        name
                        orderDate
                        purchaseOrderLines {
                            id
                            lineNumber
                        }
                    }
                }
            `;
            createdPO = await graphqlRequestClient.request(
                createReturnPoMutation,
                newreturnPOVariables,
                requestHeader
            );
        }
        res.status(200).json({
            response: {
                createdPO
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error });
    }
};
