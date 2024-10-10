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

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    const { boxes, dateLocal } = req.body;

    //this section check if the print is single or range location and set values accordingly
    const query = gql`
        query GetBoxes($filters: HandlingUnitOutboundSearchFilters) {
            handlingUnitOutbounds(filters: $filters) {
                results {
                    id
                    name
                    handlingUnitId
                    handlingUnit {
                        name
                        barcode
                        stockOwner {
                            name
                            senderName
                            senderContact
                            senderAddress1
                            senderAddress2
                            senderAddress3
                            senderPostCode
                            senderCity
                            senderCountry
                        }
                    }
                    handlingUnitContentOutbounds {
                        id
                        handlingUnitContent {
                            id
                            article {
                                code
                            }
                        }
                    }
                    delivery {
                        name
                        customerCompany
                        customerCivility
                        customerName
                        customerFirstName
                        customerAddress
                        customerAddress2
                        customerAddress3
                        customerPostcode
                        customerCity
                        customerCountry
                    }
                    handlingUnitModel {
                        name
                    }
                    carrier {
                        name
                    }
                }
            }
        }
    `;

    const variables = {
        filters: { id: boxes }
    };

    const boxResponse: GraphQLResponseType = await graphqlRequestClient.request(
        query,
        variables,
        requestHeader
    );

    let boxesLabelsToPrint;
    if (boxResponse) {
        boxesLabelsToPrint = boxResponse.handlingUnitOutbounds.results;
    }

    const labelSize = { width: 4.1, height: 5.8, unit: 'in' };

    const tmp_context = { boxesLabelsToPrint, labelSize, date: dateLocal };

    const renderDocumentVariables = {
        templateFilename: 'box_label.rml',
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
