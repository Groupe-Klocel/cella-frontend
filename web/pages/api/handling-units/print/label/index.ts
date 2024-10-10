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
import { GraphQLResponseType } from '@helpers';
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
    let requestHeader;
    if (!req.body.requestHeader) {
        const cookie = parseCookie(req.headers.cookie ?? '');
        const token = cookie['token'];

        requestHeader = {
            authorization: `Bearer ${token}`
        };
    } else {
        requestHeader = req.body.requestHeader;
    }

    const { handlingUnits } = req.body;

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    const labelSize = { width: 6, height: 4, unit: 'in' };

    const tmp_context = { handlingUnits, labelSize };

    const renderDocumentVariables = {
        templateFilename: 'hu_label.rml',
        context: tmp_context
    };

    const renderDocumentDocumentQuery = gql`
        mutation RenderDocument($templateFilename: String!, $context: JSON!) {
            renderDocument(templateFilename: $templateFilename, context: $context) {
                __typename
                ... on RenderedDocument {
                    url
                }
                ... on TemplateDoesNotExist {
                    message
                }
                ... on TemplateError {
                    message
                }
                ... on MissingContext {
                    message
                }
            }
        }
    `;

    const result: GraphQLResponseType = await graphqlRequestClient.request(
        renderDocumentDocumentQuery,
        renderDocumentVariables,
        requestHeader
    );
    res.status(200).json({ url: result.renderDocument.url });
};
