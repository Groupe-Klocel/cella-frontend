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
import {
    PageTableContentWrapper,
    ContentSpin,
    RadioSimpleTable,
    StyledFormItem,
    StyledForm
} from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { Select } from 'antd';
import styled from 'styled-components';

export interface IEmptyLocationsProps {
    withAvailableHU?: boolean;
}

const SmallSelect = styled(Select)`
    &.ant-select {
        font-size: 13px;
        width: 100%;
    }

    .ant-select-selector {
        height: 22px !important;
        min-height: 22px !important;
        padding: 0 8px !important;
        font-size: 13px;
        display: flex;
        align-items: center;
    }

    .ant-select-arrow,
    .ant-select-clear {
        top: 50%;
        transform: translateY(-50%);
    }

    .ant-select-selection-search {
        display: flex;
        align-items: center;
    }
    .ant-select-dropdown {
        font-size: 12px;
    }

    .ant-select-item {
        font-size: 12px;
    }
`;

export const EmptyLocations = ({ withAvailableHU }: IEmptyLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const [withBlockFilter, setWithBlockFilter] = useState<boolean>(false);
    const [emptyLocations, setEmptyLocationsInfos] = useState<any>();
    const [locationsData, setLocationsData] = useState<any>();
    const [block, setBlock] = useState<string | undefined>(undefined);

    const getEmptyLocationsParameters = async (): Promise<{ [key: string]: any } | undefined> => {
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
                code: ['EMPTY_LOCATIONS_NUMBER', 'EMPTY_LOCATIONS_SHOW_BLOCK_FILTER']
            }
        };
        const locationsParameters = await graphqlRequestClient.request(query, variables);
        return locationsParameters;
    };

    useEffect(() => {
        async function fetchData() {
            const locationsParameters = await getEmptyLocationsParameters();
            if (locationsParameters) {
                const locationsParametersResults = locationsParameters.parameters.results;
                const locationNumber = locationsParametersResults.find(
                    (param: any) => param.code === 'EMPTY_LOCATIONS_NUMBER'
                )?.value;
                if (locationNumber) {
                    setNbMaxLocations(parseInt(locationNumber));
                }
                const withBlockFilter = locationsParametersResults.find(
                    (param: any) => param.code === 'EMPTY_LOCATIONS_SHOW_BLOCK_FILTER'
                )?.value;
                if (withBlockFilter) {
                    setWithBlockFilter(withBlockFilter == 1);
                }
            }
        }
        fetchData();
    }, []);

    const getBlocks = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query blocks(
                $filters: BlockSearchFilters
                $orderBy: [BlockOrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
            ) {
                blocks(
                    filters: $filters
                    orderBy: $orderBy
                    page: $page
                    itemsPerPage: $itemsPerPage
                ) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        name
                    }
                }
            }
        `;
        const variables = {
            filters: {},
            orderBy: {
                field: 'name',
                ascending: true
            },
            page: 1,
            itemsPerPage: 1000
        };
        const blockInfos = await graphqlRequestClient.request(query, variables);
        return blockInfos;
    };

    const [blocksList, setBlocksList] = useState<Array<any>>([]);
    useEffect(() => {
        if (withBlockFilter) {
            getBlocks()
                .then((blocks) => {
                    setBlocksList(blocks?.blocks?.results || []);
                })
                .catch((error) => {
                    console.error('Error fetching blocks:', error);
                    setBlocksList([]);
                });
        }
    }, [withBlockFilter]);

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
                status: configs.LOCATION_STATUS_AVAILABLE,
                blockId: block ?? undefined
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
                status: configs.LOCATION_STATUS_AVAILABLE,
                location_BlockId: block ?? undefined
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
    }, [block]);

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
        <PageTableContentWrapper
            style={{
                border: '1px solid rgb(255, 228, 149)',
                borderRadius: '5px',
                paddingBottom: '10px',
                width: '97%'
            }}
        >
            {withBlockFilter ? (
                <StyledForm>
                    <StyledFormItem
                        label={
                            <span style={{ fontSize: '12px' }}>{t('common:filter-on-block')}</span>
                        }
                        name="blocks"
                        style={{ marginBottom: '5px', width: '95%' }}
                    >
                        <SmallSelect
                            showSearch
                            filterOption={(inputValue, option) =>
                                option!.props.children
                                    .toUpperCase()
                                    .indexOf(inputValue.toUpperCase()) !== -1
                            }
                            allowClear
                            onSelect={(option: any) => {
                                setBlock(option);
                            }}
                            onClear={() => {
                                setBlock(undefined);
                            }}
                        >
                            {blocksList?.map((option: any) => (
                                <Select.Option key={option.id} value={option.id}>
                                    {option.name}
                                </Select.Option>
                            ))}
                        </SmallSelect>
                    </StyledFormItem>
                </StyledForm>
            ) : (
                <></>
            )}
            {locationsData ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
