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
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { isString } from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import graphqlRequestClient from 'graphql/graphqlRequestClient';

async function createCycleCountError(
    cycleCountId: string,
    message: string,
    errorCode?: string,
    lastTransactionId?: string
): Promise<boolean> {
    try {
        const createCCErrorMutation = gql`
            mutation createCycleCountError($input: CreateCycleCountErrorInput!) {
                createCycleCountError(input: $input) {
                    id
                    cycleCountId
                }
            }
        `;

        const createCCErrorVariables = {
            input: {
                cycleCountId,
                message,
                errorCode,
                lastTransactionId
            }
        };

        const createdCCError = await graphqlRequestClient.request(
            createCCErrorMutation,
            createCCErrorVariables
        );
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}

function searchByIdInCCMs(ccmArray: any[], idToSearch: string) {
    console.log('searchByIdInCCMs', ccmArray, idToSearch);

    for (let j = 0; j < ccmArray.length; j++) {
        const ccmObject = ccmArray[j];
        const jsonObject = ccmObject.features;

        try {
            if (jsonObject.ID && jsonObject.ID.value === idToSearch) {
                return ccmObject;
            }
        } catch (error: any) {
            console.error(`Error parsing JSON at index ${j}: ${error.message}`);
        }
    }

    return null; // Return null if the item is not found
}

export { createCycleCountError, searchByIdInCCMs };
