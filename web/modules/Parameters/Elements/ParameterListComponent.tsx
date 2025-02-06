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
import { DeleteOutlined, EditTwoTone } from '@ant-design/icons';
import { AppTableV2, ContentSpin, HeaderContent, LinkButton } from '@components';
import { Space, Button, Empty, Alert, Modal, Divider } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import {
    DataQueryType,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    getModesFromPermissions,
    orderByFormater,
    PaginationType,
    showError,
    showInfo,
    showSuccess,
    useDelete,
    useExport,
    useList,
    flatten,
    cookie,
    queryString,
    pathParamsFromDictionary
} from '@helpers';
import { useCallback, useEffect, useState, useRef } from 'react';
import { FilterFieldType, ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import { ExportFormat, ModeEnum } from 'generated/graphql';
import { useRouter } from 'next/router';
import { parametersRoutes as itemRoutes } from 'modules/Parameters/Static/ParametersRoutes';
import { ParameterExtrasModelV2 as model } from 'models/ParameterExtrasModelV2';

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
};
export type ActionButtons = {
    actionsComponent: any;
};
export interface IListProps {
    dataModel: ModelType;
    triggerDelete: any;
    triggerSoftDelete: any;
    extraColumns?: any;
    actionColumns?: any;
    headerData?: HeaderData;
    routeDetailPage?: string;
    routeUpdatePage?: string;
    searchable?: boolean;
    searchCriteria?: any;
    setData?: any;
    refresh?: any;
    sortDefault?: any;
    filterFields?: Array<FilterFieldType>;
    checkbox?: boolean;
    actionButtons?: ActionButtons;
    rowSelection?: any;
    mode?: string;
    refetch?: boolean;
    parameterFields: Array<any>;
    parameterId: string;
    details: any;
    url?: string;
}

const ParameterListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const { t } = useTranslation();
    const router = useRouter();
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const id = props.parameterId;

    const extraDataRef = useRef<string | undefined>();
    const [refetchAfterDelete, setRefetchAfterDelete] = useState<boolean>(false);

    const newRowsRef = useRef<Array<any>>([]);

    const headerData: HeaderData = {
        title: t('d:extras'),
        routes: [],
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:add')}
                        type="primary"
                        path={pathParamsFromDictionary(`${rootPath}/extras/add`, {
                            id: id,
                            parameterName: props.details.name,
                            parameterExtra: extraDataRef.current,
                            url: props.url,
                            scope: props.details.scope
                        })}
                    />
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [
            {
                title: 'actions:actions',
                key: 'actions',
                render: (record: { id: string; status: number; index: number; key: string }) => (
                    <Space>
                        {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                            <LinkButton
                                icon={<EditTwoTone />}
                                path={pathParamsFromDictionary(`${rootPath}/extras/edit/[id]`, {
                                    id: id,
                                    parameterName: props.details.name,
                                    extras: extraDataRef.current,
                                    extras_key: newRowsRef.current[record.index]?.key,
                                    extras_value: newRowsRef.current[record.index]?.value,
                                    url: props.url
                                })}
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isDeletable ? (
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                onClick={() =>
                                    confirmDelete(
                                        id,
                                        newRowsRef.current[record.index]['key'],
                                        newRowsRef.current[record.index]['value']
                                    )()
                                }
                            ></Button>
                        ) : (
                            <></>
                        )}
                    </Space>
                )
            }
        ]
    };
    props = { ...defaultProps, ...props };
    // #endregion
    // #region extract data from modelV2
    const listFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isListRequested
    );

    const sortableFields =
        Object.keys(props.dataModel.fieldsInfo).filter(
            (key) => props.dataModel.fieldsInfo[key].isSortable
        ) || [];

    const displayedLabels = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].displayName !== null)
        .reduce((obj: any, key) => {
            obj[key] = props.dataModel.fieldsInfo[key].displayName;
            return obj;
        }, {});
    const excludedListFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isExcludedFromList
    );
    const hiddenListFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDefaultHiddenList
    );

    // // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => ({
            link: props.dataModel.fieldsInfo[key].link,
            name: key.replace('{', '_').replace('}', '')
        }));
    const sortParameter = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].defaultSort)
        .map((key) => ({
            field: key,
            ascending: props.dataModel.fieldsInfo[key].defaultSort === 'ascending' ? true : false
        }));
    // // #endregion

    // //retrieve saved sorters from cookies if any
    const savedSorters = cookie.get(`${props.dataModel.resolverName}SavedSorters`)
        ? JSON.parse(cookie.get(`${props.dataModel.resolverName}SavedSorters`)!)
        : undefined;

    // #region DELETE MUTATION
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(props.dataModel.endpoints.delete);

    useEffect(() => {
        if (props.triggerDelete && props.triggerDelete.idToDelete) {
            callDelete(props.triggerDelete.idToDelete);
            props.triggerDelete.setIdToDelete(undefined);
        }
    }, [props.triggerDelete]);

    useEffect(() => {
        if (deleteLoading) {
            showInfo(t('messages:info-delete-wip'));
        }
    }, [deleteLoading]);

    useEffect(() => {
        if (!(deleteResult && deleteResult.data)) return;

        if (deleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            reloadData();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResult]);
    // #endregion

    // #region SEARCH OPERATIONS

    // SearchForm in cookies
    let searchCriterias: any = {};
    searchCriterias = props.searchCriteria;

    const [search, setSearch] = useState(searchCriterias);

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const confirmDelete = (id: string, extKey: string, extValue: string) => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: async () => {
                    const res = await fetch(`/api/parameters/deleteExtra`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id,
                            extras: extraDataRef.current,
                            extKey,
                            extValue
                        })
                    });

                    const response = await res.json();

                    if (!res.ok) {
                        if (response.error.is_error) {
                            // specific error
                            showError(t(`errors:${response.error.code}`));
                        } else {
                            // generic error
                            showError(t('messages:error-deleting-data'));
                        }
                    } else {
                        setRefetchAfterDelete((prev) => !prev);
                        showSuccess(t('messages:success-deleted'));
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    // #endregion

    // #region DATATABLE
    const [rows, setRows] = useState<DataQueryType>();
    const [columns, setColumns] = useState<Array<any>>([]);
    // for sort default value, decided order is : 1-value from cookies, 2-value from Model, 3-value from index.tsx
    const [sort, setSort] = useState<any>(savedSorters || sortParameter || props.sortDefault);
    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

    let defaultModelSort = null;
    for (const key in props.dataModel.fieldsInfo) {
        if (props.dataModel.fieldsInfo[key].hasOwnProperty('defaultSort')) {
            defaultModelSort = {
                field: key,
                ascending: props.dataModel.fieldsInfo[key].defaultSort == 'ascending' ? true : false
            };
        }
    }

    const {
        isLoading,
        data,
        reload: reloadData
    } = useList(
        model.resolverName,
        model.endpoints.list,
        listFields,
        search,
        pagination.current,
        pagination.itemsPerPage,
        sort,
        router.locale,
        defaultModelSort
    );
    console.log('LPI data', data);

    useEffect(() => {
        reloadData();
    }, [
        search,
        props.refetch,
        pagination.current,
        pagination.itemsPerPage,
        sort,
        router.locale,
        refetchAfterDelete
    ]);

    // #region EXPORT DATA
    const exportFields = Object.keys(props.dataModel.fieldsInfo).filter((key) => {
        const fieldInfo = props.dataModel.fieldsInfo[key];

        return fieldInfo.isListRequested && !fieldInfo.isExcludedFromList;
    });
    const exportQueryString = queryString(
        props.dataModel.endpoints.list,
        exportFields,
        search,
        pagination.current,
        pagination.itemsPerPage,
        sort,
        router.locale,
        defaultModelSort
    );

    const columnNames: any = {};

    listFields.forEach((field: any) => {
        const matchText = field.match(/(.+)Text$/);
        if (matchText) {
            const originalField = matchText[1];
            columnNames[field] = originalField;
        }
    });

    exportFields.forEach((field: any) => {
        const matchRelationship = field.match(/(.+){(.+)}/);
        if (matchRelationship) {
            const baseWord = matchRelationship[1];
            const additionalWord = matchRelationship[2];
            const newColumnName = `${baseWord}_${additionalWord}`;
            columnNames[newColumnName] = field.replace(`{${additionalWord}}`, ` ${additionalWord}`);
        }
    });

    const { isLoading: exportLoading, result: exportResult, mutate } = useExport();

    const exportData = () => {
        const base64QueryString = Buffer.from(exportQueryString, 'binary').toString('base64');
        mutate({
            graphqlRequest: base64QueryString,
            format: ExportFormat.Xlsx,
            separator: ';',
            columnNames
            // compression
        });
    };

    useEffect(() => {
        if (exportLoading) {
            showInfo(t('messages:info-export-wip'));
        }
    }, [exportLoading]);

    useEffect(() => {
        if (!(exportResult && exportResult.data)) return;
        if (exportResult.success && exportResult?.data.exportData?.url) {
            showSuccess(t('messages:success-exported'));
            const newWindow = window.open(exportResult?.data.exportData?.url, '_blank');
        } else {
            showError(t('messages:error-exporting-data'));
        }
    }, [exportResult]);

    // #endregion

    // #region TABLE ACTIONS
    const stickyActions = {
        export: {
            active: props.dataModel.endpoints.export ? true : false,
            function: () => exportData()
        }
    };

    // make wrapper function to give child
    const onChangePagination = useCallback(
        (currentPage: number, itemsPerPage: number) => {
            // Re fetch data for new current page or items per page
            setPagination({
                total: rows?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        },
        [setPagination, rows]
    );

    // For pagination
    useEffect(() => {
        if (data) {
            // if data is refreshed
            const listData: any = data?.[props.dataModel.endpoints.list];
            console.log(listData);
            if (listData && listData['results']) {
                const result_list: Array<any> = [];
                if (listData['results'].length > 0) {
                    let sort_index = 1;

                    // Specific to record_history
                    // modelName property MUST BE existing in ParameterExtrasModelV2
                    let source = props.dataModel.fieldsInfo;
                    if (
                        props.dataModel.modelName &&
                        props.dataModel.modelName === 'ParameterExtras'
                    ) {
                        source = listData['results'][0];
                    }
                    Object.keys(source).forEach((column_name: any) => {
                        // Customize title name
                        let title = `d:${column_name}`;
                        if (displayedLabels && column_name in displayedLabels) {
                            title = `d:${displayedLabels[column_name]}`;
                        }

                        const row_data: any = {
                            title: title,
                            dataIndex: column_name,
                            key: column_name,
                            showSorterTooltip: false
                        };

                        // if column is in sortable list add sorter property
                        if (sortableFields.length > 0 && sortableFields.includes(column_name)) {
                            row_data['sorter'] = { multiple: sort_index };
                            row_data['showSorterTooltip'] = false;
                            sort_index++;
                        }

                        //If default sort memorized or passed add defaultSortOrder
                        if (sort) {
                            sort.forEach((sorter: any) => {
                                if (sorter.field === column_name) {
                                    row_data['defaultSortOrder'] = sorter.ascending
                                        ? 'ascend'
                                        : 'descend';
                                }
                            });
                        }

                        // Hide fields if there is any hidden selected.
                        if (!excludedListFields || !excludedListFields.includes(row_data.key)) {
                            result_list.push(row_data);
                        }
                    });
                }

                // set columns to use in table
                setColumns(result_list);
                // set data for the table
                setRows(listData);
                if (props.setData) props.setData(listData.results);
                setPagination({
                    ...pagination,
                    total: listData['count']
                });
            }
        }
        //re-build rows
        const jsonData: any = [];
        console.log('LPI jsonData', jsonData);
        const rowsCopy = Object.assign({}, data?.[props.dataModel.endpoints.list]?.results);

        if (Object.entries(rowsCopy).length !== 0) {
            let i = 0;
            let stringJsonData = '';
            for (const [key, value] of Object.entries(rowsCopy[0]?.extras)) {
                jsonData.push({ index: `${i}`, key: `${key}`, value: `${value}` });
                stringJsonData += key + '=' + value + '///';
                i++;
            }
            extraDataRef.current = stringJsonData;
        }

        const newColumns = [
            { title: t('d:index'), dataIndex: 'index', key: 'index', showSorterTooltip: false },
            { title: t('d:key'), dataIndex: 'key', key: 'key', showSorterTooltip: false },
            { title: t('d:value'), dataIndex: 'value', key: 'value', showSorterTooltip: false }
        ];
        setColumns(newColumns);

        newRowsRef.current = jsonData;
    }, [data, router, sort]);

    const handleTableChange = async (_pagination: any, _filter: any, sorter: any) => {
        const newSorter = orderByFormater(sorter);

        let tmp_array: any[] = [];
        //retrieve values from existing memorized sorters
        if (savedSorters) {
            tmp_array.push(...savedSorters);
        }
        if (newSorter) {
            //update dynamically sorters when clicked
            newSorter.forEach((sorterItem) => {
                const existingIndex = tmp_array.findIndex(
                    (item) => item.field === sorterItem.field
                );
                if (existingIndex !== -1) {
                    tmp_array[existingIndex] = sorterItem;
                } else {
                    tmp_array.push(sorterItem);
                }
            });

            tmp_array = tmp_array.filter((tmpItem) =>
                newSorter.some((sorterItem) => sorterItem.field === tmpItem.field)
            );
        } else {
            // empty table when no more sorters are applied
            tmp_array.length = 0;
        }

        setSort(tmp_array);
        if (tmp_array.length > 0) {
            cookie.set(`${props.dataModel.resolverName}SavedSorters`, JSON.stringify(tmp_array));
        }
        if (orderByFormater(sorter) === null) {
            cookie.remove(`${props.dataModel.resolverName}SavedSorters`);
        }
    };
    // #endregion

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
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
                            title={headerData.title}
                            routes={headerData.routes}
                            actionsRight={
                                <Space>
                                    {headerData.actionsComponent != null ? (
                                        headerData.actionsComponent
                                    ) : (
                                        <></>
                                    )}
                                </Space>
                            }
                        />
                        {rows?.results ? (
                            rows?.results && rows?.results.length > 0 ? (
                                <>
                                    <AppTableV2
                                        dataModel={props.dataModel}
                                        columns={props.actionColumns.concat(columns)}
                                        data={newRowsRef.current}
                                        pagination={pagination}
                                        isLoading={isLoading}
                                        setPagination={onChangePagination}
                                        stickyActions={stickyActions}
                                        onChange={handleTableChange}
                                        hiddenColumns={hiddenListFields}
                                        linkFields={linkFields}
                                    />
                                    <Divider />
                                </>
                            ) : (
                                <Empty description={<span>{t('messages:no-data')}</span>} />
                            )
                        ) : (
                            <ContentSpin />
                        )}
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

ParameterListComponent.displayName = 'ListWithFilter';
export { ParameterListComponent };
