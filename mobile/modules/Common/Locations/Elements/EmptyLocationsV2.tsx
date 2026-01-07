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
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { Select } from 'antd';
import styled from 'styled-components';
import { useAppState } from 'context/AppContext';

export interface IEmptyLocationsV2Props {
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

export const EmptyLocationsV2 = ({ withAvailableHU }: IEmptyLocationsV2Props) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { parameters } = useAppState();
    const [locationsData, setLocationsData] = useState<any>();
    const [block, setBlock] = useState<string | undefined>(undefined);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const findValueByScopeAndCode = (items: any[], scope: string, code: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.code.toLowerCase() === code.toLowerCase()
            )?.value;
        };

        const isWithBlockFilter = parseInt(
            findCodeByScope(parameters, 'radio', 'EMPTY_LOCATIONS_SHOW_BLOCK_FILTER')
        );
        const nbPicking = parseInt(
            findValueByScopeAndCode(
                parameters,
                'empty_locations',
                'movement-to-process_nb-results-picking'
            )
        );
        const nbStock = parseInt(
            findValueByScopeAndCode(
                parameters,
                'empty_locations',
                'movement-to-process_nb-results-stock'
            )
        );

        return {
            isWithBlockFilter,
            nbPicking,
            nbStock
        };
    }, [parameters]);

    const withBlockFilter = configsParamsCodes?.isWithBlockFilter === 1;

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

    async function retrieveEmptyLocations() {
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
                    isEmptyLocations: true,
                    isEmptyWithHu: withAvailableHU,
                    nbResultsPicking: configsParamsCodes.nbPicking,
                    nbResultsStock: configsParamsCodes.nbStock,
                    blockId: block ?? undefined
                }
            }
        };
        try {
            const emptyLocations = await graphqlRequestClient.request(query, variables);
            return emptyLocations;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    useEffect(() => {
        async function fetchLocationsData() {
            const result = await retrieveEmptyLocations();

            if (result) {
                if (
                    result.executeFunction.status === 'OK' &&
                    result.executeFunction.output.status === 'KO'
                ) {
                    console.log('Backend_message', result.executeFunction.output.output);
                    setLocationsData([]);
                    return;
                }
                setLocationsData(result.executeFunction.output.response.locations);
            }
        }
        fetchLocationsData();
    }, [block]);

    const columns = [
        {
            title: t('common:locations-empty_abbr'),
            dataIndex: 'locationName',
            key: 'location'
        },
        {
            title: t('common:type'),
            dataIndex: 'locationCategoryText',
            key: 'locationCategoryText'
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
                <RadioSimpleTable columns={columns} displayedLocations={locationsData} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
