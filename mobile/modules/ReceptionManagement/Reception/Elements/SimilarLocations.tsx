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

export interface ISimilarLocationsProps {
    currentPurchaseOrderLine: any;
    currentFeatures?: any;
    locationIdToExclude?: string;
}

export const SimilarLocations = ({
    currentPurchaseOrderLine,
    currentFeatures,
    locationIdToExclude
}: ISimilarLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [contentsToDisplay, setContentsToDisplay] = useState<Array<any>>();
    const { graphqlRequestClient } = useAuth();

    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const defaultFilter = { articleId: `${currentPurchaseOrderLine.articleId}` };
    const stockOwnerFilter = { stockOwnerId: `${currentPurchaseOrderLine.stockOwnerId}` };
    const stockStatusFilter = { stockStatus: currentPurchaseOrderLine.blockingStatus };
    const filters = { ...defaultFilter, ...stockOwnerFilter, ...stockStatusFilter };
    const {
        isLoading: huContentLoading,
        data: huContentData,
        error: huContentError
    } = useHandlingUnitContents(filters, 1, 100, null, router.locale);

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

    console.log('DLA-nbMaxLocations-sim', nbMaxLocations);

    //handle similar features if any
    useEffect(() => {
        if (!currentFeatures) {
            setContentsToDisplay(huContentData?.handlingUnitContents?.results);
        } else {
            const notUniqueFeatures = currentFeatures?.filter((e: any) => !e.featureCode.unique);
            if (notUniqueFeatures && notUniqueFeatures.length > 0) {
                //check if one or more of the not uniquefeatures is in handlingUnitContentFeatures of each handlingUnitcontents.results
                const notNullHUCFs = huContentData?.handlingUnitContents?.results.filter(
                    (e: any) => e.handlingUnitContentFeatures.length > 0
                );
                const filteredContents = notNullHUCFs?.filter((e: any) =>
                    e.handlingUnitContentFeatures.some((hucf: any) =>
                        notUniqueFeatures.some(
                            (notUniqueFeature: any) => notUniqueFeature.value == hucf.value
                        )
                    )
                );
                setContentsToDisplay(filteredContents);
            }
        }
    }, [huContentData]);

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
        if (contentsToDisplay) {
            const locData: Array<any> = [];
            contentsToDisplay
                ?.filter(
                    (e: any) =>
                        e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_STOCK &&
                        e.handlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_STOCK &&
                        e.handlingUnit.locationId !== locationIdToExclude
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
            contentsToDisplay
                ?.filter(
                    (e: any) =>
                        e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_RECEPTION &&
                        e.handlingUnit.category === parameters.HANDLING_UNIT_CATEGORY_STOCK &&
                        e.handlingUnit.locationId !== locationIdToExclude
                )
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        type: 'Reception'
                    });
                });
            locData.sort(compare);
            setDisplayedLocations(locData);
        }
    }, [contentsToDisplay, nbMaxLocations]);

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
            {huContentData && !huContentLoading ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
