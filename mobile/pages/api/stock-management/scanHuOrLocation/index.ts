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

    const { scannedInfo } = req.body;

    const sharedFilter = {
        filters: { barcode: scannedInfo }
    };

    const husQuery = gql`
        query GetHandlingUnits(
            $filters: HandlingUnitSearchFilters
            $orderBy: [HandlingUnitOrderByCriterion!]
        ) {
            handlingUnits(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    id
                    name
                    type
                    barcode
                    category
                    code
                    parentHandlingUnitId
                    reservation
                    status
                    stockOwnerId
                    location {
                        id
                        name
                        category
                        categoryText
                        status
                        statusText
                        stockStatus
                        stockStatusText
                        huManagement
                    }
                }
            }
        }
    `;

    const locationsQuery = gql`
        query GetLocations($filters: LocationSearchFilters, $orderBy: [LocationOrderByCriterion!]) {
            locations(filters: $filters, orderBy: $orderBy) {
                count
                itemsPerPage
                totalPages
                results {
                    id
                    name
                    barcode
                    aisle
                    column
                    level
                    position
                    replenish
                    blockId
                    block {
                        name
                    }
                    replenishType
                    constraint
                    comment
                    baseUnitRotation
                    allowCycleCountStockMin
                    category
                    categoryText
                    stockStatus
                    stockStatusText
                    status
                    statusText
                    huManagement
                    handlingUnits {
                        id
                        name
                        type
                        barcode
                        category
                        code
                        parentHandlingUnitId
                        reservation
                        status
                        stockOwnerId
                    }
                }
            }
        }
    `;

    const locationResponse: GraphQLResponseType = await graphqlRequestClient.request(
        locationsQuery,
        sharedFilter,
        requestHeader
    );

    let response;
    if (locationResponse && locationResponse.locations.count !== 0) {
        const extractLocationResponse = locationResponse.locations?.results;
        if (locationResponse.locations?.results.length === 1) {
            const { handlingUnits, ...locationOnly } = extractLocationResponse[0];
            const handlingUnitOnly =
                handlingUnits.length !== 0 ? { ...handlingUnits[0] } : undefined;
            response = {
                resType: 'location',
                handlingUnit: handlingUnitOnly,
                locations: [locationOnly]
            };
        } else {
            response = {
                resType: 'location',
                handlingUnit: undefined,
                locations: extractLocationResponse
            };
        }
    } else {
        const huResponse: GraphQLResponseType = await graphqlRequestClient.request(
            husQuery,
            sharedFilter,
            requestHeader
        );

        if (huResponse && huResponse.handlingUnits.count === 1) {
            const extractHuResponse = huResponse.handlingUnits?.results[0];
            const { location, ...huOnly } = extractHuResponse;
            response = {
                resType: 'handlingUnit',
                handlingUnit: huOnly,
                locations: [{ ...location }]
            };
        } else {
            res.status(500).json({
                error: {
                    is_error: true,
                    code: 'FAPI_000001',
                    message: 'element not found'
                }
            });
        }
    }

    if (response) {
        res.status(200).json({ response: response });
    }
};
