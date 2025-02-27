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
import { NextRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import {
    GetAllBlocksQuery,
    ModeEnum,
    Table,
    useGetAllBlocksQuery,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions, showError, showSuccess, useLocationIds } from '@helpers';
import { Alert, Button, Card, Col, Divider, Layout, Row } from 'antd';
import { ContentSpin, DetailsList, HeaderContent } from '@components';
import { styled } from 'styled-components';
import { patternPathsRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { PatternPathLocationInputModelV2 as inputModel } from 'models/PatternPathLocationInputModelV2';
import { PatternPathLocationOutputModelV2 as outputModel } from 'models/PatternPathLocationOutputModelV2';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { gql } from 'graphql-request';
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons';
import FiltersTable from 'components/common/smart/DragAndDrop/FiltersTable';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface IManagePatternPathLocationProps {
    id: string | any;
    name: string | any;
    patternName: string | any;
    router: NextRouter;
}
interface Filters {
    category: string | undefined | null;
    blockId: string | undefined | null;
    aisle: string | undefined | null;
    column: string | undefined | null;
    level: string | undefined | null;
    position: string | undefined | null;
}
export const ManagePatternPathLocation: FC<IManagePatternPathLocationProps> = ({
    id,
    name,
    patternName,
    router
}: IManagePatternPathLocationProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PatternPathLocation);
    const { graphqlRequestClient } = useAuth();
    const [patternPath, setPatternPath] = useState<any>();
    const [locationsList, setLocationsList] = useState<any>();
    const [patternPathLocationsList, setPatternPathLocationsList] = useState<any>();
    const [initialPatternPathLocations, setInitialPatternPathLocations] = useState<any>(null);
    const [refetchPatternPathLocations, setRefetchPatternPathLocations] = useState(false);
    const [categoriesTexts, setCategoriesTexts] = useState<any>();
    const [blockList, setBlockList] = useState<any>();
    const [filters, setFilters] = useState<Filters>({
        category: undefined,
        blockId: undefined,
        aisle: undefined,
        column: undefined,
        level: undefined,
        position: undefined
    });
    const [appliedSort, setAppliedSort] = useState<any>();

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
        setPatternPath({
            name: name,
            pattern: patternName
        });
    }, [patternName]);

    //#region LIST For FILTER component
    const categoriesTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'location_category',
        language: router.locale
    });
    useEffect(() => {
        if (categoriesTextList) {
            setCategoriesTexts(categoriesTextList?.data?.listConfigsForAScope);
        }
    }, [categoriesTextList.data]);

    const blockListQuery = useGetAllBlocksQuery<Partial<GetAllBlocksQuery>, Error>(
        graphqlRequestClient,
        {
            orderBy: null,
            page: 1,
            itemsPerPage: 1000
        }
    );
    useEffect(() => {
        if (blockListQuery) {
            setBlockList(blockListQuery?.data?.blocks?.results);
        }
    }, [blockListQuery.data]);

    //We need to separately query locations data to retrieve relevant aisles, columns,...
    const [aislesList, setAislesList] = useState<any>([]);
    const [columnsList, setColumnsList] = useState<any>([]);
    const [levelsList, setLevelsList] = useState<any>([]);
    const [positionsList, setPositionsList] = useState<any>([]);
    // const { data: fullLocationsData } = useLocationIds(search, 1, 1000000, null);
    useEffect(() => {
        const fetchLocations = async () => {
            const locationsQuery = gql`
                query locations(
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
                        results {
                            id
                            aisle
                            column
                            level
                            position
                        }
                    }
                }
            `;
            const variables = {
                filters: { blockId: filters.blockId! },
                undefined,
                page: 1,
                itemsPerPage: 1000000
            };
            const locationsFullList = await graphqlRequestClient.request(locationsQuery, variables);

            setAislesList(
                Array.from(
                    new Set(
                        locationsFullList?.locations?.results
                            ?.map((loc: any) => loc.aisle)
                            .filter(Boolean)
                    )
                ).sort()
            );

            setColumnsList(
                Array.from(
                    new Set(
                        locationsFullList?.locations?.results
                            ?.map((loc: any) => loc.column)
                            .filter(Boolean)
                    )
                ).sort()
            );

            setLevelsList(
                Array.from(
                    new Set(
                        locationsFullList?.locations?.results
                            ?.map((loc: any) => loc.level)
                            .filter(Boolean)
                    )
                ).sort()
            );

            setPositionsList(
                Array.from(
                    new Set(
                        locationsFullList?.locations?.results
                            ?.map((loc: any) => loc.position)
                            .filter(Boolean)
                    )
                ).sort()
            );
        };
        if (filters.blockId) {
            fetchLocations();
        }
    }, [filters.blockId]);

    const handleClearFilter = (filterKey: any) => {
        setFilters((prevFilters) => {
            const newFilters = { ...prevFilters, [filterKey]: undefined };
            if (filterKey === 'blockId') {
                newFilters.aisle = undefined;
                newFilters.column = undefined;
                newFilters.level = undefined;
                newFilters.position = undefined;
            } else if (filterKey === 'aisle') {
                newFilters.column = undefined;
                newFilters.level = undefined;
                newFilters.position = undefined;
            } else if (filterKey === 'column') {
                newFilters.level = undefined;
                newFilters.position = undefined;
            } else if (filterKey === 'level') {
                newFilters.position = undefined;
            }

            return newFilters;
        });
    };

    const filterConfig = [
        { label: 'Catégorie', value: 'category', list: categoriesTexts, width: '25%' },
        { label: 'Bloc', value: 'blockId', list: blockList, width: '25%' },
        {
            label: 'Allée',
            value: 'aisle',
            list: aislesList,
            disabled: !filters.blockId
        },
        {
            label: 'Colonne',
            value: 'column',
            list: columnsList,
            disabled: !filters.blockId
        },
        {
            label: 'Niveau',
            value: 'level',
            list: levelsList,
            disabled: !filters.blockId
        },
        {
            label: 'Position',
            value: 'position',
            list: positionsList,
            disabled: !filters.blockId
        }
    ];

    //"Drop here" object that is needed to be droppable when list is empty
    const emptyPatternLocationsList = [
        {
            id: 'null',
            locationId: 'null',
            location_name: t('actions:drop_here')
        }
    ];

    const emptyLocationsList = [
        {
            id: 'null',
            name: t('actions:drop_here'),
            index: 0
        }
    ];

    //#region Handledrag and drop functions
    const handleDropToTarget = (item: any, toIndex: number) => {
        setPatternPathLocationsList((prev: any) => {
            if (!prev.some((e: any) => e.locationId === item.id)) {
                let counter = 1;
                const tmpIds = prev
                    .filter((e: any) => e?.id?.startsWith('tmp_id'))
                    .map((e: any) => parseInt(e.id?.slice(6)));

                if (tmpIds.length > 0) {
                    counter = Math.max(...tmpIds) + 1;
                }

                const newItem = {
                    id: `tmp_id${counter}`,
                    patternPathId: id,
                    locationId: item.id,
                    location_name: item.name
                };
                const updatedItems = [...prev];
                updatedItems.splice(toIndex ?? updatedItems.length - 1, 0, newItem);

                return (
                    updatedItems
                        // .filter((e: any) => e.id !== 'null')
                        .map((e, index) => ({
                            ...e,
                            order: e.id === 'null' ? null : index + 1,
                            index
                        }))
                );
            }
            return prev;
        });
    };

    const handleDropBack = (item: any) => {
        if (item.id === 'null') return;
        setPatternPathLocationsList((prev: any) => {
            const updated = prev.filter((e: any) => e.locationId !== item.locationId);
            if (updated.length === 0) {
                return emptyPatternLocationsList;
            }

            return updated.map((e: any, index: number) => ({
                ...e,
                order: e.id === 'null' ? null : index + 1
            }));
        });
    };

    const moveRow = (fromIndex: number, toIndex: number) => {
        if (
            fromIndex === undefined ||
            fromIndex === null ||
            toIndex === undefined ||
            toIndex === null
        )
            return;

        const updatedItems = [...patternPathLocationsList];
        const [movedItem] = updatedItems.splice(fromIndex, 1);

        updatedItems.splice(toIndex, 0, movedItem);

        const updatedItemsWithIndex = updatedItems.map((e, index) => ({
            ...e,
            order: e.id === 'null' ? null : index + 1,
            index: e.id === 'null' ? null : index
        }));
        setPatternPathLocationsList(updatedItemsWithIndex);
    };

    //#region handle move all functions
    const moveAllToTarget = async () => {
        //retrieve all current displaed data first
        const query = gql`
            query locations(
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
                        category
                        categoryText
                        blockId
                        block {
                            name
                        }
                        name
                        aisle
                        column
                        level
                        position
                    }
                }
            }
        `;
        const variables = {
            filters,
            orderBy: appliedSort,
            page: 1,
            itemsPerPage: 20000
        };
        const locationsFullList = await graphqlRequestClient.request(query, variables);

        if (locationsFullList.locations.results) {
            locationsFullList.locations.results.forEach((item: any, index: number) => {
                handleDropToTarget(
                    item,
                    patternPathLocationsList.filter((e: any) => e.id !== 'null').length + index
                );
            });
        }
    };

    const moveAllToBack = async () => {
        if (patternPathLocationsList) {
            patternPathLocationsList.forEach((item: any) => {
                handleDropBack(item);
            });
        }
    };

    //This is to relaunch locations query removing locations already selected in patttern_path_locations
    const [idsToRemove, setIdsToRemove] = useState<any>();
    useEffect(() => {
        if (patternPathLocationsList) {
            const ids = patternPathLocationsList.map((ppl: any) => ({
                filter: {
                    field: { id: ppl.locationId },
                    searchType: 'DIFFERENT'
                }
            }));

            if (ids.length > 0) {
                setIdsToRemove(ids);
            }
        }
    }, [patternPathLocationsList]);

    //#region ON FINISH
    const [isCreationLoading, setIsCreationLoading] = useState(false);
    const onFinish = async () => {
        setIsCreationLoading(true);
        const generateTransactionId = gql`
            mutation {
                generateTransactionId
            }
        `;
        const transactionIdResponse = await graphqlRequestClient.request(generateTransactionId);
        const lastTransactionId = transactionIdResponse.generateTransactionId;

        const rollbackTransaction = gql`
            mutation rollback($transactionId: String!) {
                rollbackTransaction(transactionId: $transactionId)
            }
        `;
        const rollbackVariable = {
            transactionId: lastTransactionId
        };

        try {
            const deletePatternPathLocs = gql`
                mutation deletePatternPathLocs($ids: [String!]!) {
                    deletePatternPathLocations(ids: $ids)
                }
            `;

            const patternPathLocsIds = {
                ids: initialPatternPathLocations
                    .map((e: any) => e.id)
                    .filter((e: any) => e !== 'null'),
                lastTransactionId
            };

            try {
                const deletePatternPathLocationsResponse = await graphqlRequestClient.request(
                    deletePatternPathLocs,
                    patternPathLocsIds
                );

                if (patternPathLocationsList.filter((e: any) => e.id !== 'null').length > 0) {
                    if (deletePatternPathLocationsResponse) {
                        const inputs = patternPathLocationsList
                            .filter((e: any) => e.id !== 'null')
                            .map((e: any) => ({
                                patternPathId: e.patternPathId,
                                locationId: e.locationId,
                                order: e.order,
                                lastTransactionId: lastTransactionId
                            }));

                        const createPatternPathLocs = gql`
                            mutation createPatternPathLocations(
                                $inputs: [CreatePatternPathLocationInput!]!
                            ) {
                                createPatternPathLocations(inputs: $inputs)
                            }
                        `;

                        const patternPathLocsVariables = {
                            inputs
                        };

                        try {
                            await graphqlRequestClient.request(
                                createPatternPathLocs,
                                patternPathLocsVariables
                            );
                        } catch (error) {
                            console.log('Error on creation:', error);
                        }
                    }
                }
                setRefetchPatternPathLocations(!refetchPatternPathLocations);
            } catch (error) {
                console.log('Error on delete:', error);
                throw error;
            }

            showSuccess(t('messages:success-updated'));
            setIsCreationLoading(false);
        } catch (error) {
            showError(t('messages:error-update-data'));
            console.log(error);
            await graphqlRequestClient.request(rollbackTransaction, rollbackVariable);
            setIsCreationLoading(false);
        }
    };

    //#region RETURN
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
                            <Col span={12}>
                                <FiltersTable
                                    filters={filters}
                                    setFilters={setFilters}
                                    filterConfig={filterConfig}
                                    handleClear={handleClearFilter}
                                />
                            </Col>
                            <Row gutter={19}>
                                <Col span={12}>
                                    <Card
                                        type="inner"
                                        title={t('common:pattern-path-locations-free')}
                                        extra={
                                            <Button
                                                type="primary"
                                                onClick={moveAllToTarget}
                                                disabled={
                                                    locationsList?.filter(
                                                        (e: any) => e.id !== 'null'
                                                    ).length === 0
                                                }
                                            >
                                                {t('actions:send-all')} <DoubleRightOutlined />
                                            </Button>
                                        }
                                    >
                                        <ListComponent
                                            searchCriteria={filters}
                                            itemperpage={10}
                                            dataModel={inputModel}
                                            triggerDelete={null}
                                            triggerSoftDelete={null}
                                            columnFilter={false}
                                            items={locationsList}
                                            isDragAndDroppable={true}
                                            isDragSource={true}
                                            removeRow={handleDropBack}
                                            setData={setLocationsList}
                                            advancedFilters={idsToRemove}
                                            defaultEmptyList={emptyLocationsList}
                                            setAppliedSort={setAppliedSort}
                                        />
                                    </Card>
                                </Col>
                                <Col span={12}>
                                    <Card
                                        type="inner"
                                        title={t('common:pattern-path-locations-set')}
                                        extra={
                                            <Button
                                                type="primary"
                                                onClick={moveAllToBack}
                                                disabled={
                                                    patternPathLocationsList?.filter(
                                                        (e: any) => e.id !== 'null'
                                                    ).length === 0
                                                }
                                            >
                                                <DoubleLeftOutlined /> {t('actions:remove-all')}
                                            </Button>
                                        }
                                    >
                                        <div style={{ textAlign: 'center' }}>
                                            <Button
                                                type="primary"
                                                loading={isCreationLoading}
                                                onClick={onFinish}
                                                disabled={
                                                    patternPathLocationsList ===
                                                    initialPatternPathLocations
                                                }
                                            >
                                                {t('actions:submit')}
                                            </Button>
                                        </div>
                                        <ListComponent
                                            searchCriteria={{ patternPathId: id }}
                                            sortDefault={[{ field: 'order', ascending: true }]}
                                            itemperpage={1000000}
                                            dataModel={outputModel}
                                            triggerDelete={null}
                                            triggerSoftDelete={null}
                                            columnFilter={false}
                                            refetch={refetchPatternPathLocations}
                                            items={patternPathLocationsList}
                                            isDragAndDroppable={true}
                                            addRow={handleDropToTarget}
                                            moveRow={moveRow}
                                            setData={setPatternPathLocationsList}
                                            setInitialData={setInitialPatternPathLocations}
                                            defaultEmptyList={emptyPatternLocationsList}
                                            isIndependentScrollable={true}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};
