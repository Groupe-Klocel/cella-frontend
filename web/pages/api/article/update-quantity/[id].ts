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

interface IData {
    width: number;
    height: number;
    length: number;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.cookie?.split('token=')[1].split(';')[0];
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

    const { id } = req.query;

    const query = gql`
        query getArticleById($id: String!) {
            article(id: $id) {
                width
                height
                length
            }
        }
    `;

    const variables = {
        id: id
    };

    const data = await graphqlRequestClient.request(query, variables, requestHeader);
    const qnt = calculateBoxQuantity(data.article);
    console.log('quantity=', qnt);

    // update box quantity in database by sending gql mutaion.
    // implement after gql endpoint done!
    const updateVariables = {
        id: id,
        input: {
            boxQuantity: qnt
        }
    };

    const updateMutation = gql`
        mutation updateArticle($id: String!, $input: UpdateArticleInput!) {
            updateArticle(id: $id, input: $input) {
                boxQuantity
            }
        }
    `;

    const result = await graphqlRequestClient.request(
        updateMutation,
        updateVariables,
        requestHeader
    );

    res.status(200).json({ quantity: result.updateArticle.boxQuantity });
};

function calculateBoxQuantity({ width, height, length }: IData) {
    const articleVolume = (width * height * length) / 100 ** 3; // cubic centimeters to cubic meters
    if (articleVolume == 0) return 0;
    const boxVolume = (600 * 400 * 400) / 1000 ** 3; // cubic millimeters to cubic meters
    return Math.floor(boxVolume / articleVolume);
}
