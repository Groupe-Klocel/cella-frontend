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
import { cookie } from '@helpers';
import { gql, GraphQLClient } from 'graphql-request';
import type { NextApiRequest, NextApiResponse } from 'next';

interface IData {
    details: any;
}

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

    //const token = req.headers.cookie?.split('token=')[1].split(';')[0];
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
    const body = req.body;

    const updateHUVariables = {
        id: req.body.hu_id,
        input: req.body.hu_body
    };

    const updateHUOutboundVariables = {
        id: req.body.hu_outbound_id,
        input: req.body.hu_outbound_body
    };

    const updateHUMutation = gql`
        mutation updateHandlingUnit($id: String!, $input: UpdateHandlingUnitInput!) {
            updateHandlingUnit(id: $id, input: $input) {
                id
                name
            }
        }
    `;
    const updateHUOutboundMutation = gql`
        mutation updateHandlingUnitOutbound(
            $id: String!
            $input: UpdateHandlingUnitOutboundInput!
        ) {
            updateHandlingUnitOutbound(id: $id, input: $input) {
                id
                theoriticalWeight
            }
        }
    `;
    const result = await graphqlRequestClient.request(
        updateHUMutation,
        updateHUVariables,
        requestHeader
    );

    const result2 = await graphqlRequestClient.request(
        updateHUOutboundMutation,
        updateHUOutboundVariables,
        requestHeader
    );

    res.status(200).json({ response: { hu: result, huo: result2 } });
};
