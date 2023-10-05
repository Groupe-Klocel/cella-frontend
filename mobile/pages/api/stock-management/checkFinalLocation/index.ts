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

    const checkFinalLocationVariables = {
        originLocationId: req.body.originLocationId,
        destinationLocationId: req.body.destinationLocationId,
        articleId: req.body.articleId
    };

    let checkFinalLocation: any | null;
    if (req.body.movementType == 'contentMvt') {
        checkFinalLocation = gql`
            query checkFinalLocationQuantity(
                $originLocationId: String!
                $destinationLocationId: String!
                $articleId: String
            ) {
                checkFinalLocationQuantity(
                    originLocationId: $originLocationId
                    destinationLocationId: $destinationLocationId
                    articleId: $articleId
                ) {
                    isCorrect
                    locationComparison
                    destinationContentId
                    destinationContentQuantity
                    destinationHuId
                }
            }
        `;
    } else if (req.body.movementType == 'palletMvt' || req.body.movementType == 'receptionMvt') {
        checkFinalLocation = gql`
            query checkFinalLocationPallet(
                $originLocationId: String!
                $destinationLocationId: String!
            ) {
                checkFinalLocationPallet(
                    originLocationId: $originLocationId
                    destinationLocationId: $destinationLocationId
                ) {
                    isCorrect
                    locationComparison
                }
            }
        `;
    }

    const result = await graphqlRequestClient
        .request(checkFinalLocation, checkFinalLocationVariables, requestHeader)
        .catch((error: any) => {
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
                res.status(500).json({ error });
            }
        });

    if (result) {
        res.status(200).json({ response: result });
    }
};
