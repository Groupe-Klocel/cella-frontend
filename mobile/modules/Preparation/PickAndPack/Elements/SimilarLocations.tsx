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
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { log } from 'console';

export interface ISimilarLocationsProps {
    articleId: string;
    chosenContentId: string;
    stockOwnerId?: string;
    stockStatus?: number;
}

export const SimilarPickingLocations = ({
    articleId,
    chosenContentId,
    stockOwnerId,
    stockStatus
}: ISimilarLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    //ENHANCEMENT: nbMaxLocations will be used to change according to a parameter
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const defaultFilter = { articleId: `${articleId}` };
    const stockOwnerFilter = stockOwnerId ? { stockOwnerId: `${stockOwnerId}` } : undefined;
    const stockStatusFilter = stockStatus ? { stockStatus: stockStatus } : undefined;
    const categoryFilter = {
        handlingUnit_Category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
        handlingUnit_Location_Category: configs.LOCATION_CATEGORY_PICKING
    };
    const filters = {
        ...defaultFilter,
        ...stockOwnerFilter,
        ...stockStatusFilter,
        ...categoryFilter
    };
    const [similarLocations, setSimilarLocationsInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

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
            ascending: true
        };
        const variables = {
            filters: filters,
            orderBy: sortByQuantity,
            page: 1,
            itemsPerPage: 100,
            language: router.locale
        };
        const handlingUnitContentInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitContentInfos;
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getSimilarLocations();
            if (result) setSimilarLocationsInfos(result);
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (similarLocations) {
            const locData: Array<any> = [];
            similarLocations?.handlingUnitContents?.results
                .filter((e: any) => e.id !== chosenContentId && e.quantity > 0)
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        key: e.id,
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        category: e.handlingUnit.location.categoryText
                    });
                });

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
            title: t('common:category'),
            dataIndex: 'category',
            key: 'category'
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
