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
import { errorMonitor } from 'events';
import { gql, GraphQLClient } from 'graphql-request';
import { FormOptionType } from 'models/Models';
import type { NextApiRequest, NextApiResponse } from 'next';

function buildLocationName(location: any) {
    const separator = '-';
    const locationName = location.blockName.concat(
        separator,
        location.aisle,
        separator,
        location.column,
        separator,
        location.level,
        separator,
        location.position
    );
    return locationName;
}

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

    const locationsIds: Array<String> = [];
    let originLocationName = buildLocationName(req.body.originLocation);
    let finalLocationName = buildLocationName(req.body.finalLocation);

    // If originLocationName > finalLocationName, we swap the variables
    if (originLocationName > finalLocationName) {
        finalLocationName = [originLocationName, (originLocationName = finalLocationName)][0];
    }

    //Get the list of locations inside the range
    const query = gql`
        query getLocationsRange($originLocationName: String!, $finalLocationName: String!) {
            locationsRange(
                originLocationName: $originLocationName
                finalLocationName: $finalLocationName
            ) {
                id
            }
        }
    `;

    const variables = {
        originLocationName: originLocationName,
        finalLocationName: finalLocationName
    };

    const locations = await graphqlRequestClient
        .request(query, variables, requestHeader)
        .catch((error: any) => {
            if (error.response.errors[0].extensions.is_error) {
                res.status(500).json({
                    error: {
                        is_error: error.response.errors[0].extensions.is_error,
                        code: error.response.errors[0].extensions.code,
                        message: error.response.errors[0].message,
                        variables: error.response.errors[0].extensions.variables,
                        exception: error.response.errors[0].extensions.exception
                    }
                });
            }
        });

    locations.locationsRange.forEach((item: any) => {
        locationsIds.push(item.id);
    });

    // Delete the locations of the list
    const bulkDeleteLocationsVariables = {
        locationsIds: locationsIds
    };

    const bulkDeleteLocationsMutation = gql`
        mutation bulkDeleteLocations($locationsIds: [String!]!) {
            bulkDeleteLocations(locationsIds: $locationsIds)
        }
    `;
    const result = await graphqlRequestClient
        .request(bulkDeleteLocationsMutation, bulkDeleteLocationsVariables, requestHeader)
        .catch((error: any) => {
            if (error.response.errors[0].extensions.is_error) {
                res.status(500).json({
                    error: {
                        is_error: error.response.errors[0].extensions.is_error,
                        code: error.response.errors[0].extensions.code,
                        message: error.response.errors[0].message,
                        variables: error.response.errors[0].extensions.variables,
                        exception: error.response.errors[0].extensions.exception
                    }
                });
            }
        });

    if (result) res.status(200).json({ response: { locations: result } });
};
