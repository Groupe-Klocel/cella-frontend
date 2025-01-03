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
import parameters from '../../../../../common/parameters.json';
import { GraphQLResponseType } from '@helpers';

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
    const { handlingUnit, box, hUModel } = req.body;

    //Transaction management
    const generateTransactionId = gql`
        mutation {
            generateTransactionId
        }
    `;
    const transactionIdResponse: GraphQLResponseType = await graphqlRequestClient.request(
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
        // get DEFAULT_PALLET_WEIGHT
        const defaultPalletWeightParameterQuery = gql`
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

        const defaultPalletWeightParameterVariables = {
            filters: { scope: 'outbound', code: 'DEFAULT_PALLET_WEIGHT' }
        };

        const defaultPalletWeightParameterResult: GraphQLResponseType =
            await graphqlRequestClient.request(
                defaultPalletWeightParameterQuery,
                defaultPalletWeightParameterVariables,
                requestHeader
            );

        // get DEFAULT_SHIPPING_LOCATION
        const defaultShippingLocationParameterQuery = gql`
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

        const defaultShippingLocationParameterVariables = {
            filters: { scope: 'outbound', code: 'DEFAULT_SHIPPING_LOCATION' }
        };

        const defaultShippingLocationParameterResult: GraphQLResponseType =
            await graphqlRequestClient.request(
                defaultShippingLocationParameterQuery,
                defaultShippingLocationParameterVariables,
                requestHeader
            );

        const defaultShippingLocationQuery = gql`
            query locations($filters: LocationSearchFilters) {
                locations(filters: $filters) {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const defaultShippingLocationVariables = {
            filters: { name: defaultShippingLocationParameterResult.parameters.results[0].value }
        };

        const defaultShippingLocationResult: GraphQLResponseType =
            await graphqlRequestClient.request(
                defaultShippingLocationQuery,
                defaultShippingLocationVariables,
                requestHeader
            );

        // 1a- Check Final HU
        const handlingUnitQuery = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    results {
                        id
                        name
                        handlingUnitContents {
                            id
                            articleId
                            quantity
                            handlingUnitContentFeatures {
                                id
                                value
                            }
                        }
                        handlingUnitOutbounds {
                            id
                            status
                            carrierId
                            carrierShippingModeId
                        }
                    }
                }
            }
        `;

        const handlingUnitVariables = {
            filters: { name: handlingUnit.name }
        };

        const handlingUnitResult: GraphQLResponseType = await graphqlRequestClient.request(
            handlingUnitQuery,
            handlingUnitVariables,
            requestHeader
        );

        let finalHandlingUnitId: any = null;
        let finalHandlingUnitOutbound: any;

        if (handlingUnitResult?.handlingUnits?.count <= 0) {
            // 1b- Create HU with name = HU name and location = default_shipping_location (if it does not exist)
            const createHUMutation = gql`
                mutation createHandlingUnit($input: CreateHandlingUnitInput!) {
                    createHandlingUnit(input: $input) {
                        id
                        name
                        barcode
                        type
                        category
                        locationId
                        location {
                            id
                            name
                            barcode
                        }
                        stockOwnerId
                    }
                }
            `;

            const createHUvariables = {
                input: {
                    name: handlingUnit.name,
                    barcode: handlingUnit.name,
                    code: handlingUnit.name,
                    type: parameters.HANDLING_UNIT_TYPE_PALLET,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_OUTBOUND,
                    locationId: defaultShippingLocationResult.locations.results[0].id,
                    lastTransactionId
                }
            };

            const createdHu: GraphQLResponseType = await graphqlRequestClient.request(
                createHUMutation,
                createHUvariables
            );

            console.log('createdHu', createdHu);

            finalHandlingUnitId = createdHu.createHandlingUnit.id;
            canRollbackTransaction = true;
            //create HUO
            const createHUOMutation = gql`
                mutation createHandlingUnitOutbound($input: CreateHandlingUnitOutboundInput!) {
                    createHandlingUnitOutbound(input: $input) {
                        id
                        name
                        status
                        statusText
                        preparationMode
                        preparationModeText
                        theoriticalWeight
                        carrier {
                            id
                            name
                        }
                        carrierShippingModeId
                        carrierShippingMode {
                            id
                            toBePalletized
                        }
                        handlingUnitModelId
                        handlingUnitModel {
                            id
                            name
                            weight
                            closureWeight
                        }
                        roundId
                        round {
                            id
                            name
                        }
                        loadId
                        load {
                            id
                            name
                        }
                        handlingUnitId
                        handlingUnit {
                            id
                            name
                            type
                            typeText
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            status
                            statusText
                            warehouseCode
                            parentHandlingUnitId
                        }
                        handlingUnitContentOutbounds {
                            id
                            lineNumber
                            status
                            statusText
                            pickedQuantity
                            quantityToBePicked
                            pickingLocationId
                            pickingLocation {
                                id
                                name
                            }
                            handlingUnitContentId
                            handlingUnitContent {
                                id
                                articleId
                                article {
                                    name
                                    description
                                    baseUnitWeight
                                }
                            }
                        }
                        createdBy
                        created
                        modifiedBy
                        modified
                    }
                }
            `;

            const createHUOvariables = {
                input: {
                    name: handlingUnit.name,
                    status: configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_IN_PREPARATION,
                    handlingUnitModelId: hUModel.id,
                    carrierId: box.handlingUnitOutbounds[0].carrierId,
                    carrierShippingModeId: box.handlingUnitOutbounds[0].carrierShippingModeId,
                    handlingUnitId: finalHandlingUnitId,
                    theoriticalWeight: hUModel.weight,
                    handlingUnitModelClosureWeight: hUModel.closureWeight,
                    lastTransactionId
                }
            };

            const createdHuo: GraphQLResponseType = await graphqlRequestClient.request(
                createHUOMutation,
                createHUOvariables
            );

            finalHandlingUnitOutbound = createdHuo.createHandlingUnitOutbound;
            canRollbackTransaction = true;
        } else {
            finalHandlingUnitId = handlingUnitResult.handlingUnits.results[0].id;
            finalHandlingUnitOutbound =
                handlingUnitResult.handlingUnits.results[0]?.handlingUnitOutbounds[0];
            console.log('finalHandlingUnitId', finalHandlingUnitId);
        }

        // Update old parentHU theoriticalWeight if exists
        if (box.parentHandlingUnitId) {
            const oldParentHandlingUnitQuery = gql`
                query handlingUnits($filters: HandlingUnitSearchFilters) {
                    handlingUnits(filters: $filters) {
                        count
                        results {
                            id
                            handlingUnitOutbounds {
                                id
                            }
                        }
                    }
                }
            `;

            const oldParentHandlingUnitVariables = {
                filters: { id: box.parentHandlingUnitId }
            };

            const oldParentHandlingUnitResult: GraphQLResponseType =
                await graphqlRequestClient.request(
                    oldParentHandlingUnitQuery,
                    oldParentHandlingUnitVariables,
                    requestHeader
                );
            const oldHUO =
                oldParentHandlingUnitResult.handlingUnits.results[0]?.handlingUnitOutbounds[0];

            const updateOldPalletHUOMutation = gql`
                mutation UpdateHandlingUnitOutbound(
                    $id: String!
                    $advancedInput: JSON!
                    $input: UpdateHandlingUnitOutboundInput!
                ) {
                    updateHandlingUnitOutbound(
                        id: $id
                        advancedInput: $advancedInput
                        input: $input
                    ) {
                        id
                        lastTransactionId
                    }
                }
            `;
            const updateOldPalletHUOVariables = {
                id: oldHUO?.id,
                input: {
                    lastTransactionId
                },
                advancedInput: {
                    theoriticalWeight: `theoriticalWeight-${box.handlingUnitOutbounds[0].theoriticalWeight}`
                }
            };

            const updateOldPalletHUOResult = await graphqlRequestClient.request(
                updateOldPalletHUOMutation,
                updateOldPalletHUOVariables,
                requestHeader
            );
        }

        // children hu update
        const updateChildrenHUMutation = gql`
            mutation UpdateHandlingUnit($id: String!, $input: UpdateHandlingUnitInput!) {
                updateHandlingUnit(id: $id, input: $input) {
                    id
                    parentHandlingUnitId
                    lastTransactionId
                }
            }
        `;
        const updateChildrenHUVariables = {
            id: box.id,
            input: {
                parentHandlingUnitId: finalHandlingUnitId,
                lastTransactionId
            }
        };

        const updateChildrenHUResult = await graphqlRequestClient.request(
            updateChildrenHUMutation,
            updateChildrenHUVariables,
            requestHeader
        );

        // Pallet HUO theoriticalWeight update
        const updatePalletHUOMutation = gql`
            mutation UpdateHandlingUnitOutbound(
                $id: String!
                $advancedInput: JSON!
                $input: UpdateHandlingUnitOutboundInput!
            ) {
                updateHandlingUnitOutbound(id: $id, advancedInput: $advancedInput, input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;
        const updatePalletHUOVariables = {
            id: finalHandlingUnitOutbound?.id,
            input: {
                lastTransactionId
            },
            advancedInput: {
                theoriticalWeight: `theoriticalWeight+${box.handlingUnitOutbounds[0].theoriticalWeight}`
            }
        };

        const updatePalletHUOResult = await graphqlRequestClient.request(
            updatePalletHUOMutation,
            updatePalletHUOVariables,
            requestHeader
        );

        // ScanHandlingUnit-2: launch query
        const query = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
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
                            barcode
                            category
                            categoryText
                            code
                            handlingUnitContents {
                                id
                                quantity
                                reservation
                                stockStatus
                                stockStatusText
                                stockOwnerId
                                handlingUnit {
                                    id
                                    name
                                    locationId
                                    location {
                                        id
                                        name
                                    }
                                }
                                stockOwner {
                                    id
                                    name
                                }
                                articleId
                                article {
                                    id
                                    name
                                    stockOwnerId
                                    stockOwner {
                                        name
                                    }
                                    baseUnitWeight
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
                            stockOwnerId
                            handlingUnit {
                                id
                                name
                                locationId
                                location {
                                    id
                                    name
                                }
                            }
                            stockOwner {
                                id
                                name
                            }
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                baseUnitWeight
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
                        handlingUnitOutbounds {
                            id
                            status
                            carrierId
                            carrier {
                                id
                                name
                            }
                            carrierShippingModeId
                            handlingUnitModelId
                        }
                    }
                }
            }
        `;

        const variables = {
            filters: { id: finalHandlingUnitId }
        };
        const handlingUnitInfos: GraphQLResponseType = await graphqlRequestClient.request(
            query,
            variables
        );

        //merge results
        res.status(200).json({
            response: {
                handlingUnit: handlingUnitInfos.handlingUnits.results[0],
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
