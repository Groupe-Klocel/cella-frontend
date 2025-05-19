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
import { useHandlingUnitContents } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useRouter } from 'next/router';
import parameters from '../../../../../common/parameters.json';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface ISimilarLocationsProps {
    articleId: string;
    chosenContentId: string;
    stockOwnerId?: string;
    stockStatus?: number;
}

export const SimilarLocations = ({
    articleId,
    chosenContentId,
    stockOwnerId,
    stockStatus
}: ISimilarLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [similarLocations, setSimilarLocationsInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const defaultFilter = { articleId: `${articleId}` };
    const stockOwnerFilter = stockOwnerId ? { stockOwnerId: `${stockOwnerId}` } : undefined;
    const stockStatusFilter = stockStatus ? { stockStatus: stockStatus } : undefined;
    const filters = { ...defaultFilter, ...stockOwnerFilter, ...stockStatusFilter };

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
                code: 'SIMILAR_LOCATIONS_NUMBER'
            }
        };
        const locationsNumber = await graphqlRequestClient.request(query, variables);
        return locationsNumber.parameters.results[0].value;
    };

    useEffect(() => {
        async function fetchData() {
            const locationsNumber = await getLocationsNumber();

            if (locationsNumber) {
                setNbMaxLocations(parseInt(locationsNumber));
            }
        }
        fetchData();
    }, []);

    //bloc
    const getSimilarLocations = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query handlingUnitContents(
                $filters: HandlingUnitContentSearchFilters
                $orderBy: [HandlingUnitContentOrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
                $language: String = "en"
            ) {
                handlingUnitContents(
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
                        stockOwnerId
                        stockOwner {
                            id
                            name
                        }
                        article {
                            description
                            name
                            featureTypeText
                            baseUnitWeight
                        }
                        quantity
                        stockStatus
                        stockStatusText
                        extraText1
                        handlingUnitId
                        handlingUnit {
                            name
                            code
                            type
                            typeText
                            category
                            categoryText
                            locationId
                            location {
                                name
                                replenish
                                category
                                categoryText
                                status
                                extraText1
                                extraText3
                                block {
                                    name
                                    building {
                                        name
                                    }
                                }
                            }
                            parentHandlingUnit {
                                name
                            }
                            stockOwner {
                                name
                            }
                        }
                    }
                }
            }
        `;
        const sortByQuantity = {
            field: 'quantity',
            ascending: false
        };
        const variables = {
            filters: filters,
            orderBy: sortByQuantity,
            page: 1,
            itemsPerPage: 100,
            language: router.locale
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getSimilarLocations();
            if (result) setSimilarLocationsInfos(result);
        }
        fetchData();
    }, []);
    //end bloc

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
        if (similarLocations) {
            const locData: Array<any> = [];
            similarLocations?.handlingUnitContents?.results
                .filter(
                    (e: any) =>
                        e.id !== chosenContentId &&
                        e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_STOCK &&
                        e.handlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_STOCK &&
                        e.handlingUnit.location.status !== configs.LOCATION_STATUS_DISABLED
                )
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        type: 'Stock'
                    });
                });
            similarLocations?.handlingUnitContents?.results
                .filter(
                    (e: any) =>
                        e.id !== chosenContentId &&
                        e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_PICKING &&
                        e.handlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_STOCK &&
                        e.handlingUnit.location.status !== configs.LOCATION_STATUS_DISABLED
                )
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        type: 'Picking'
                    });
                });
            locData.sort(compare);
            setDisplayedLocations(locData);
        }
    }, [similarLocations, nbMaxLocations]);

    const columns = [
        {
            title: t('common:location_abbr'),
            dataIndex: 'locationName',
            key: 'location'
        },
        {
            title: t('common:quantity_abbr'),
            dataIndex: 'quantity',
            key: 'quantity'
        },
        {
            title: t('common:type'),
            dataIndex: 'type',
            key: 'type'
        }
    ];

    return (
        <PageTableContentWrapper>
            {similarLocations ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
