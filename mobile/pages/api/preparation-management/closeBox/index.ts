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
    const { handlingUnitOutbound, deleteDeclarativeHUO, roundHU } = req.body;

    const handlingUnitContentOutboundIds = handlingUnitOutbound.handlingUnitContentOutbounds.map(
        (handlingUnitContentOutbound: any) => handlingUnitContentOutbound.id
    );

    // Transaction management
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

    let canRollbackTransaction = false;

    try {
        // delete HUO if required

        // get DEFAULT_DECLARATIVE_LU
        const defaultDeclarativeLuParameterQuery = gql`
            query parameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    results {
                        code
                        value
                        scope
                    }
                }
            }
        `;

        const defaultDeclarativeLuParameterVariables = {
            filters: { scope: 'cubing', code: 'DEFAULT_DECLARATIVE_LU' }
        };

        const defaultDeclarativeLuParameterResult = await graphqlRequestClient.request(
            defaultDeclarativeLuParameterQuery,
            defaultDeclarativeLuParameterVariables,
            requestHeader
        );

        const defaultDeclarativeLuQuery = gql`
            query handlingUnitModels($filters: HandlingUnitModelSearchFilters) {
                handlingUnitModels(filters: $filters) {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const defaultDeclarativeLuVariables = {
            filters: { name: defaultDeclarativeLuParameterResult.parameters.results[0].value }
        };

        const defaultDeclarativeLuResult = await graphqlRequestClient.request(
            defaultDeclarativeLuQuery,
            defaultDeclarativeLuVariables,
            requestHeader
        );

        // get declarative HUO
        const declarativeHUOQuery = gql`
            query handlingUnitOutbounds($filters: HandlingUnitOutboundSearchFilters) {
                handlingUnitOutbounds(filters: $filters) {
                    count
                    results {
                        id
                        deliveryId
                    }
                }
            }
        `;

        const declarativeHUOVariables = {
            filters: {
                handlingUnitModelId: defaultDeclarativeLuResult.handlingUnitModels.results[0].id,
                deliveryId: handlingUnitOutbound.deliveryId
            }
        };

        const declarativeHUOResult = await graphqlRequestClient.request(
            declarativeHUOQuery,
            declarativeHUOVariables,
            requestHeader
        );

        if (deleteDeclarativeHUO) {
            // Delete HUO
            const deleteHUOMutation = gql`
                mutation deleteDeliveryBoxes(
                    $deliveryId: String!
                    $handlingUnitOutboundId: String
                ) {
                    deleteDeliveryBoxes(
                        deliveryId: $deliveryId
                        handlingUnitOutboundId: $handlingUnitOutboundId
                    )
                }
            `;
            const deleteHUOVariables = {
                deliveryId: declarativeHUOResult.handlingUnitOutbounds.results[0].deliveryId,
                handlingUnitOutboundId: declarativeHUOResult.handlingUnitOutbounds.results[0].id
            };

            const resultDeleteHUOResponse = await graphqlRequestClient.request(
                deleteHUOMutation,
                deleteHUOVariables,
                requestHeader
            );

            // update Round status
            const updateRoundMutation = gql`
                mutation updateRound($id: String!, $input: UpdateRoundInput!) {
                    updateRound(id: $id, input: $input) {
                        id
                        status
                        statusText
                    }
                }
            `;
            const updateRoundVariables = {
                id: handlingUnitOutbound?.roundId,
                input: {
                    status: configs.ROUND_STATUS_CLOSED
                }
            };
            const updateRoundResponse = await graphqlRequestClient.request(
                updateRoundMutation,
                updateRoundVariables
            );
        }

        // update HUO status
        const updateHandlingUnitOutboundMutation = gql`
            mutation updateHandlingUnitOutbound(
                $id: String!
                $input: UpdateHandlingUnitOutboundInput!
            ) {
                updateHandlingUnitOutbound(id: $id, input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;

        const updateHandlingUnitOutboundvariable = {
            id: handlingUnitOutbound.id,
            input: {
                status: configs.HANDLING_UNIT_OUTBOUND_STATUS_PREPARED,
                lastTransactionId
            }
        };

        const updatedHandlingUnitOutbound = await graphqlRequestClient.request(
            updateHandlingUnitOutboundMutation,
            updateHandlingUnitOutboundvariable
        );

        // 6- Get updated origin HU
        const updatedRoundHUQuery = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    results {
                        id
                        name
                        type
                        typeText
                        barcode
                        category
                        categoryText
                        code
                        parentHandlingUnitId
                        parentHandlingUnit {
                            id
                            name
                            type
                            typeText
                        }
                        childrenHandlingUnits {
                            id
                            name
                            type
                            typeText
                            category
                            categoryText
                        }
                        reservation
                        status
                        stockOwnerId
                        stockOwner {
                            name
                        }
                        locationId
                        location {
                            name
                            category
                            categoryText
                        }
                        handlingUnitContents {
                            id
                            quantity
                            reservation
                            stockStatus
                            stockStatusText
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                            }
                            handlingUnitContentFeatures {
                                id
                                featureCode {
                                    name
                                    unique
                                }
                                value
                            }
                        }
                    }
                }
            }
        `;

        const updatedRoundHUVariables = {
            filters: { id: roundHU.id }
        };

        const updatedRoundHUResult = await graphqlRequestClient.request(
            updatedRoundHUQuery,
            updatedRoundHUVariables,
            requestHeader
        );

        //merge results
        res.status(200).json({
            response: {
                updatedHandlingUnitOutbound,
                updatedRoundHU: updatedRoundHUResult?.handlingUnits?.results[0],
                lastTransactionId
            }
        });
    } catch (error) {
        console.log(error);
        if (canRollbackTransaction)
            await graphqlRequestClient.request(
                rollbackTransaction,
                rollbackVariable,
                requestHeader
            );
        res.status(500).json({ error });
    }
};
