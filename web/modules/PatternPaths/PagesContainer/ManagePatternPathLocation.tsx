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
import { Alert, Button, Col, Divider, Input, Layout, List, Row } from 'antd';
import { ContentSpin, DetailsList, HeaderContent, LinkButton } from '@components';
import { patternPathsRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import useTranslation from 'next-translate/useTranslation';

import styled from 'styled-components';
import { NextRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import {
    BulkCreatePatternPathLocationsMutation,
    BulkCreatePatternPathLocationsMutationVariables,
    BulkDeletePatternPathLocationsMutation,
    BulkDeletePatternPathLocationsMutationVariables,
    ModeEnum,
    Table,
    useBulkCreatePatternPathLocationsMutation,
    useBulkDeletePatternPathLocationsMutation
} from 'generated/graphql';
import {
    showError,
    usePatternPathLocations,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    showSuccess,
    getModesFromPermissions
} from '@helpers';
import Title from 'antd/lib/typography/Title';
import { useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface IManagePatternPathLocationProps {
    id: string | any;
    name: string | any;
    patternName: string | any;
    stockOwnerName: string | any;
    router: NextRouter;
}

interface LocationRow {
    value: string;
    id: string;
}

export const ManagePatternPathLocation: FC<IManagePatternPathLocationProps> = ({
    id,
    name,
    patternName,
    stockOwnerName,
    router
}: IManagePatternPathLocationProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [patternPath, setPatternPath] = useState<any>();

    useEffect(() => {
        setPatternPath({
            name: name,
            stockOwner: stockOwnerName,
            pattern: patternName
        });
    }, [patternName, stockOwnerName]);

    const [selectedLocations, setSelectedLocations] = useState<Array<LocationRow>>([]);
    const [otherLocations, setOtherLocations] = useState<Array<LocationRow>>([]);
    const [locationFilter, setLocationFilter] = useState<string>('');
    const [dataLocations, setDataLocations] = useState<any>();

    const { isLoading, data, error } = usePatternPathLocations(
        { patternPathId: id },
        DEFAULT_PAGE_NUMBER,
        DEFAULT_ITEMS_PER_PAGE,
        {
            field: 'order',
            ascending: false
        }
    );

    async function getLocations(
        locationFilter: string
    ): Promise<{ [key: string]: any } | undefined> {
        const query = gql`
            query GetAllLocations(
                $filters: LocationSearchFilters
                $orderBy: [LocationOrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
            ) {
                locations(
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
                    }
                }
            }
        `;
        const variables = {
            filters: { name: `${locationFilter}%` },
            page: DEFAULT_PAGE_NUMBER,
            itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
            orderBy: null
        };
        const dataLocations = await graphqlRequestClient.request(query, variables);

        return dataLocations;
    }

    useEffect(() => {
        async function fetchData() {
            const dataLocations = await getLocations(locationFilter);
            const result = await dataLocations;
            if (result) setDataLocations(result);
        }
        fetchData();
    }, [locationFilter]);

    const createNameString = (item: any) => {
        return `${item.name}`;
    };

    useEffect(() => {
        const newLocations: Array<LocationRow> = [];
        if (data && data?.patternPathLocations?.results) {
            data.patternPathLocations.results.forEach((element) => {
                newLocations.push({
                    id: element.location?.id,
                    value: createNameString(element.location)
                });
            });
            setSelectedLocations(newLocations);
        }
    }, [data]);

    useEffect(() => {
        const newLocations: Array<LocationRow> = [];
        if (dataLocations && dataLocations?.locations?.results) {
            dataLocations.locations.results.forEach((element: any) => {
                newLocations.push({ id: element.id!, value: createNameString(element) });
            });
            setOtherLocations(newLocations);
        }
    }, [dataLocations]);

    const selectLocation = (id: string) => {
        const item = otherLocations.find((el) => {
            return el.id == id;
        });
        if (item) {
            setOtherLocations(otherLocations.filter((e) => e.id != id));
            const newLocations = selectedLocations;
            newLocations.push(item);
            setSelectedLocations(newLocations);
        }
    };
    const deselectLocation = (id: string) => {
        const item = selectedLocations.find((el) => {
            return el.id == id;
        });
        if (item) {
            setSelectedLocations(selectedLocations.filter((e) => e.id != id));
            if (!otherLocations.some((e) => e.id == id)) {
                const newLocations = otherLocations;
                newLocations.push(item);
                setOtherLocations(newLocations);
            }
        }
    };

    const patternPathBreadCrumb = [
        ...patternPathsRoutes,
        {
            breadcrumbName: `${name}`
        }
    ];
    const breadCrumb = [
        ...patternPathBreadCrumb,
        {
            breadcrumbName: `${t('d:manage-locations')} `
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { mutate: createLocations, isPending: createLoading } =
        useBulkCreatePatternPathLocationsMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: BulkCreatePatternPathLocationsMutation,
                _variables: BulkCreatePatternPathLocationsMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        });
    const { mutate: deleteLocations, isPending: deleteLoading } =
        useBulkDeletePatternPathLocationsMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: BulkDeletePatternPathLocationsMutation,
                _variables: BulkDeletePatternPathLocationsMutationVariables,
                _context: unknown
            ) => {
                // Save new locations list.
                const inputData = selectedLocations.map((item, i) => {
                    return { locationId: item.id, extras: {}, order: selectedLocations.length - i };
                });
                createLocations({ patternPathId: id, inputs: inputData });
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        });

    const saveLocations = () => {
        deleteLocations({ patternPathId: id });
        router.back();
    };

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PatternPathLocation);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Create) || !modes.includes(ModeEnum.Delete) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={`${t('common:pattern-path')} ${name} - ${t(
                                'd:manage-locations'
                            )}`}
                            routes={breadCrumb}
                            onBack={() => router.push(`/pattern-paths/${id}`)}
                        />
                        <StyledPageContent>
                            <DetailsList details={patternPath} />
                            <Divider />
                            <Row gutter={19}>
                                <Col span={12}>
                                    <List
                                        size="small"
                                        header={
                                            <Title level={5}>
                                                {t('common:pattern-path-locations-set')}
                                            </Title>
                                        }
                                        bordered
                                        dataSource={selectedLocations}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <Button
                                                    type="text"
                                                    onClick={() => deselectLocation(item.id)}
                                                >
                                                    {item.value}
                                                </Button>
                                            </List.Item>
                                        )}
                                    />
                                </Col>
                                <Col span={12}>
                                    <List
                                        size="small"
                                        header={
                                            <>
                                                <Title level={5}>
                                                    {t('common:pattern-path-locations-free')}
                                                </Title>
                                                <Input
                                                    onChange={(e: any) => {
                                                        setLocationFilter(e.target.value);
                                                    }}
                                                    placeholder={t('common:filter')}
                                                />
                                            </>
                                        }
                                        bordered
                                        dataSource={otherLocations.filter((item) => {
                                            return (
                                                !selectedLocations.some((e) => e.id == item.id) &&
                                                item.value.startsWith(locationFilter)
                                            );
                                        })}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <Button
                                                    type="text"
                                                    onClick={() => selectLocation(item.id)}
                                                >
                                                    {item.value}
                                                </Button>
                                            </List.Item>
                                        )}
                                    />
                                </Col>
                            </Row>

                            <Button
                                type="primary"
                                loading={createLoading || deleteLoading}
                                onClick={saveLocations}
                            >
                                {t('actions:submit')}
                            </Button>
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};
