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
import { PageTableContentWrapper, ContentSpin, RadioSimpleTable } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IEmptyLocationsProps {
    withAvailableHU?: boolean;
}

export const EmptyLocations = ({ withAvailableHU }: IEmptyLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const [emptyLocations, setEmptyLocationsInfos] = useState<any>();
    const [locationsData, setLocationsData] = useState<any>();

    const getLocationsNumber = async (): Promise<string | undefined> => {
        const query = gql`
            query parameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        scope
                        code
                        value
                    }
                }
            }
        `;

        const variables = {
            filters: {
                scope: 'radio',
                code: 'EMPTY_LOCATIONS_NUMBER'
            }
        };
        const locationsNumber = await graphqlRequestClient.request(query, variables);
        return locationsNumber.parameters.results[0].value;
    };

    useEffect(() => {
        async function fetchData() {
            const locationNumber = await getLocationsNumber();

            if (locationNumber) {
                setNbMaxLocations(parseInt(locationNumber));
            }
        }
        fetchData();
    }, []);

    const getLocationIds = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query locations(
                $filters: LocationSearchFilters
                $orderBy: [LocationOrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
                $language: String = "en"
            ) {
                locations(
                    filters: $filters
                    orderBy: $orderBy
                    page: $page
                    itemsPerPage: $itemsPerPage
                    language: $language
                ) {
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
                    }
                }
            }
        `;
        const sortByDate = {
            field: 'created',
            ascending: false
        };
        const variables = {
            filters: {
                autocountHandlingUnit: 0,
                status: configs.LOCATION_STATUS_AVAILABLE
            },
            orderBy: sortByDate,
            page: 1,
            itemsPerPage: 100,
            language: router.locale
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
    };

    const getEmptyLocations = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query handlingUnits(
                $filters: HandlingUnitSearchFilters
                $orderBy: [HandlingUnitOrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
                $language: String = "en"
            ) {
                handlingUnits(
                    filters: $filters
                    orderBy: $orderBy
                    page: $page
                    itemsPerPage: $itemsPerPage
                    language: $language
                ) {
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
                    }
                }
            }
        `;
        const sortByName = {
            field: 'name',
            ascending: false
        };
        const variables = {
            filters: {
                autocountHandlingUnitContent: 0,
                location_Category: 20710,
                status: configs.LOCATION_STATUS_AVAILABLE
            },
            orderBy: sortByName,
            page: 1,
            itemsPerPage: 100,
            language: router.locale
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
    };
    useEffect(() => {
        async function fetchLocationIdsData() {
            const result = await getLocationIds();
            if (result) setLocationsData(result);
        }
        fetchLocationIdsData();

        async function fetchEmptyLocationsData() {
            const result = await getEmptyLocations();
            if (result) setEmptyLocationsInfos(result);
        }
        fetchEmptyLocationsData();
    }, []);

    //When location
    useEffect(() => {
        function compare(a: any, b: any) {
            if (a.locationName < b.locationName) {
                return -1;
            }
            if (a.locationName > b.locationName) {
                return 1;
            }
            return 0;
        }
        if (locationsData) {
            const locData: Array<any> = [];
            locationsData?.locations?.results.slice(0, nbMaxLocations).forEach((e: any) => {
                locData.push({
                    locationId: e.id,
                    locationName: e.name,
                    type: e.category === configs.LOCATION_CATEGORY_PICKING ? 'Picking' : 'Stock',
                    withHU: false
                });
            });
            if (withAvailableHU) {
                emptyLocations?.handlingUnits?.results
                    .slice(0, nbMaxLocations)
                    .forEach((e: any) => {
                        locData.push({
                            locationId: e.locationId,
                            locationName: e.location.name,
                            type:
                                e.location.category === configs.LOCATION_CATEGORY_PICKING
                                    ? 'Picking'
                                    : 'Stock',
                            withHU: true
                        });
                    });
            }
            locData.sort(compare);
            setDisplayedLocations(locData);
        }
    }, [locationsData, nbMaxLocations]);

    const columns = [
        {
            title: t('common:locations-empty_abbr'),
            dataIndex: 'locationName',
            key: 'location'
        },
        {
            title: t('common:type'),
            dataIndex: 'type',
            key: 'type'
        }
    ];

    return (
        <PageTableContentWrapper>
            {locationsData ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
