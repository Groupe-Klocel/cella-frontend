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

    const { purchaseOrderId: id, dateLocal } = req.body;

    const query = gql`
        query GetPurchaseOrderById($id: String!) {
            purchaseOrder(id: $id) {
                name
                stockOwner {
                    name
                    logo
                }
                statusText
                typeText
                supplier
                purchaseOrderLines {
                    quantity
                    quantityMax
                    receivedQuantity
                    reservedQuantity
                    article {
                        name
                        additionalDescription
                    }
                }
            }
        }
    `;

    const variables = {
        id
    };

    const poResponse = await graphqlRequestClient.request(query, variables, requestHeader);

    const tmp_context = {
        purchaseOrder: poResponse.purchaseOrder,
        date: dateLocal
    };

    const renderDocumentVariables = {
        templateFilename: 'purchase_order.rml',
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

    const result = await graphqlRequestClient.request(
        renderDocumentDocumentQuery,
        renderDocumentVariables,
        requestHeader
    );

    res.status(200).json({ url: result.renderDocument.url });
};
