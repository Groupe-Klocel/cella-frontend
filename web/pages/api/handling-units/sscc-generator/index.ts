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
import { corsMiddleware } from '@helpers';
import { gql, GraphQLClient } from 'graphql-request';
import type { NextApiRequest, NextApiResponse } from 'next';

function generateSSCC(extensionDigit: number, prefix: string, serialNumberCounter: number): string {
    // Check the lengths
    // extension digit
    const extensionDigitLength = extensionDigit.toString().length;
    if (extensionDigitLength !== 1) {
        throw new Error(`Extension Digit number ${extensionDigit} should have only 1 digit`);
    }
    // serialLength
    const serialLength = serialNumberCounter.toString().length;
    const maxSsccWithoutCheckDigit = 16 - prefix.length;
    if (serialLength > maxSsccWithoutCheckDigit) {
        throw new Error(`Serial number ${serialNumberCounter} is too long for prefix ${prefix}`);
    }

    // Generate a string of zeros with a length equal to the number of digits needed
    const zeroStr = '0'.repeat(maxSsccWithoutCheckDigit - serialLength);

    const ssccWithoutCheckDigit = prefix.toString() + zeroStr + serialNumberCounter.toString();

    // Calculate the check digit using mod10 and weight at 3
    let sum = 0;
    let weight = 3;
    for (let i = ssccWithoutCheckDigit.length - 1; i >= 0; i--) {
        sum += parseInt(ssccWithoutCheckDigit.charAt(i)) * weight;
        weight = weight === 3 ? 1 : 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    // Combine the data string and check digit to form the SSCC
    const sscc = extensionDigit.toString() + ssccWithoutCheckDigit + checkDigit;
    return sscc;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    await corsMiddleware(req, res);

    // Parameters/configs values retrieval
    //N.B: the requestHeader has to be gave as an input since authorization is given from radio side here
    const { extensionDigit, requestHeader } = req.body;

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    const counterQuery = gql`
        mutation GetSSCCCounter {
            getNextCounter(counterCode: "SSCC_COUNTER")
        }
    `;

    const counterResponse = await graphqlRequestClient.request(counterQuery, requestHeader);

    //GCP = Global Company Prefix
    const GCPQuery = gql`
        query GetGCP {
            configs(filters: { code: "GCP" }) {
                results {
                    value
                }
            }
        }
    `;

    const GCPResponse = await graphqlRequestClient.request(GCPQuery, requestHeader);

    // call the function with queried values
    const GCP = GCPResponse.configs.results[0].value;
    const serialCounter = counterResponse.getNextCounter;
    let sscc = generateSSCC(extensionDigit, GCP, serialCounter);

    // check if HU with SSCC still exists
    const HUQuery = gql`
        query HU_SSCC($filters: HandlingUnitSearchFilters) {
            handlingUnits(filters: $filters) {
                results {
                    id
                    name
                }
            }
        }
    `;

    // function to check if SSCC is still used by HU
    let HUexists = true;
    do {
        const HU_SSCC_Variables = {
            filters: { name: sscc }
        };
        const HUResponse = await graphqlRequestClient.request(
            HUQuery,
            HU_SSCC_Variables,
            requestHeader
        );
        if (HUResponse.handlingUnits.results.length === 0) {
            HUexists = false;
        } else {
            const counterResponse = await graphqlRequestClient.request(counterQuery, requestHeader);
            const serialCounter = counterResponse.getNextCounter;
            const newSSCC = generateSSCC(extensionDigit, GCP, serialCounter);
            sscc = newSSCC;
        }
    } while (HUexists);

    if (sscc) {
        res.status(200).json({ response: sscc });
    }
};
