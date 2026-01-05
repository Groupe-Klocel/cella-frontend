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
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';

export interface ISimilarLocationsV2Props {
    articleId: string;
    originalContentId?: string;
    stockOwnerId?: string;
    stockStatus?: number;
    reservation?: string;
    processName?: string;
    isEmptyLocations?: boolean;
    isEmptyWithHU?: boolean;
    orderBy?: any;
    features?: any;
}

export const SimilarLocationsV2 = ({
    articleId,
    originalContentId,
    stockOwnerId,
    stockStatus,
    reservation,
    processName,
    isEmptyLocations,
    isEmptyWithHU,
    orderBy,
    features
}: ISimilarLocationsV2Props) => {
    const { t } = useTranslation();
    const [similarLocations, setSimilarLocationsV2Infos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const { parameters } = useAppState();

    const configsParamsCodes = useMemo(() => {
        const findValueByScopeAndCode = (items: any[], scope: string, code: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.code.toLowerCase() === code.toLowerCase()
            )?.value;
        };

        const nbPicking = parseInt(
            findValueByScopeAndCode(
                parameters,
                'similar_locations',
                `${processName}_nb-results-picking`
            )
        );
        console.log('nbPicking', nbPicking);
        const nbStock = parseInt(
            findValueByScopeAndCode(
                parameters,
                'similar_locations',
                `${processName}_nb-results-stock`
            )
        );
        console.log('nbStock', nbStock);
        const cumulativeParam = parseInt(
            findValueByScopeAndCode(parameters, 'similar_locations', `${processName}_cumulative`)
        );
        console.log('cumulativeParam', cumulativeParam);
        const similarFeatures = parseInt(
            findValueByScopeAndCode(
                parameters,
                'similar_locations',
                `${processName}_similar-features`
            )
        );
        console.log('similarFeatures', similarFeatures);
        return {
            nbPicking,
            nbStock,
            cumulativeParam,
            similarFeatures
        };
    }, [parameters]);

    const isFilteredByFeatures = configsParamsCodes.similarFeatures === 1;
    console.log('isFilteredByFeatures:', isFilteredByFeatures, 'features:', features);

    const transformFeatures = (rawFeatures: any) => {
        if (!rawFeatures || !Array.isArray(rawFeatures)) return undefined;
        return rawFeatures.map((feature: any) => ({
            featureCodeId: feature.featureCode?.id,
            value: feature.value
        }));
    };

    const defaultFilter = { articleId: `${articleId}` };
    const stockOwnerFilter = stockOwnerId ? { stockOwnerId: `${stockOwnerId}` } : undefined;
    const stockStatusFilter = stockStatus ? { stockStatus: stockStatus } : undefined;
    const reservationFilter = reservation ? { reservation: reservation } : undefined;
    const cumulativeFilter =
        configsParamsCodes.cumulativeParam === 1 ? { isCumulativeLocations: true } : undefined;
    const emptyLocationsFilter = isEmptyLocations
        ? { isEmptyLocations: isEmptyLocations }
        : undefined;
    const emptyWithHUFilter = isEmptyWithHU ? { isEmptyWithHU: isEmptyWithHU } : undefined;
    const orderByFilter = orderBy ? { orderBy: orderBy } : undefined;
    const featureFilter =
        isFilteredByFeatures && features
            ? { similarFeatures: transformFeatures(features) }
            : undefined;
    const filters = {
        ...defaultFilter,
        ...stockOwnerFilter,
        ...stockStatusFilter,
        ...reservationFilter,
        ...cumulativeFilter,
        ...emptyLocationsFilter,
        ...emptyWithHUFilter,
        ...orderByFilter,
        ...featureFilter
    };

    //bloc
    async function retrieveSimilarLocations() {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'get_locations',
            event: {
                input: {
                    nbResultsPicking: configsParamsCodes.nbPicking,
                    nbResultsStock: configsParamsCodes.nbStock,
                    ...filters,
                    handlingUnitContentIdToExclude: originalContentId
                }
            }
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            return result;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    useEffect(() => {
        async function fetchLocationsData() {
            const result = await retrieveSimilarLocations();
            if (result) {
                if (
                    result.executeFunction.status === 'OK' &&
                    result.executeFunction.output.status === 'KO'
                ) {
                    console.log('Backend_message', result.executeFunction.output.output);
                    setSimilarLocationsV2Infos([]);
                    return;
                }
                setSimilarLocationsV2Infos(result?.executeFunction?.output.response.locations);
            }
        }
        fetchLocationsData();
    }, []);

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
            dataIndex: 'locationCategoryText',
            key: 'locationCategoryText'
        }
    ];

    return (
        <PageTableContentWrapper>
            {similarLocations ? (
                <RadioSimpleTable columns={columns} displayedLocations={similarLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
