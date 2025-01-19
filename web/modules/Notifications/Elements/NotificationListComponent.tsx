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
import { SearchOutlined } from '@ant-design/icons';
import { AppTableV2, ContentSpin, HeaderContent, LinkButton } from '@components';
import { Space, Form, Button, Empty, Alert, Badge } from 'antd';
import { EyeTwoTone } from '@ant-design/icons';
import { useDrawerDispatch } from 'context/DrawerContext';
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
    useSoftDelete,
    cookie,
    queryString,
    isStringDateTime,
    formatUTCLocaleDateTime,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useCallback, useEffect, useState } from 'react';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import { ExportFormat, ModeEnum } from 'generated/graphql';
import { useRouter } from 'next/router';
import { ListFilters } from 'modules/Crud/submodules/ListFiltersV2';
import { isString } from 'lodash';

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
}

const NotificationListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();

    // #region DEFAULT PROPS
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [
            {
                title: 'actions:actions',
                key: 'actions',
                render: (record: { id: string }) => (
                    <Space>
                        <LinkButton
                            icon={<EyeTwoTone />}
                            path={(props.routeDetailPage || '').replace(':id', record.id)}
                        />
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
    let filterFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].searchingFormat !== null)
        .map((key) => ({
            displayName: t(`d:${props.dataModel.fieldsInfo[key].displayName ?? key}`),
            name: key,
            type: FormDataType[
                props.dataModel.fieldsInfo[key].searchingFormat as keyof typeof FormDataType
            ],
            maxLength: props.dataModel.fieldsInfo[key].maxLength ?? undefined,
            config: props.dataModel.fieldsInfo[key].config ?? undefined,
            param: props.dataModel.fieldsInfo[key].param ?? undefined,
            optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined,
            isMultipleSearch: props.dataModel.fieldsInfo[key].isMultipleSearch ?? undefined,
            initialValue: undefined
        }));
    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
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
    // #endregion

    //retrieve saved sorters from cookies if any
    const savedSorters = cookie.get(`${props.dataModel.resolverName}SavedSorters`)
        ? JSON.parse(cookie.get(`${props.dataModel.resolverName}SavedSorters`)!)
        : undefined;

    //check if there is something in props.filterFields and if yes, overwrite it in filterFields
    if (props.filterFields) {
        props.filterFields.forEach((item: any) => {
            const index = filterFields.findIndex((x) => x.name === item.name);
            if (index !== -1) {
                filterFields[index] = item;
            }
        });
    }

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

    // #region SOFT DELETE MUTATION
    const {
        isLoading: softDeleteLoading,
        result: softDeleteResult,
        mutate: callSoftDelete
    } = useSoftDelete(props.dataModel.endpoints.softDelete!);

    useEffect(() => {
        if (props.triggerSoftDelete && props.triggerSoftDelete.idToDisable) {
            callSoftDelete(props.triggerSoftDelete.idToDisable);
            props.triggerSoftDelete.setIdToDisable(undefined);
        }
    }, [props.triggerSoftDelete]);

    useEffect(() => {
        if (softDeleteLoading) {
            showInfo(t('messages:info-delete-wip'));
        }
    }, [softDeleteLoading]);

    useEffect(() => {
        if (!(softDeleteResult && softDeleteResult.data)) return;

        if (softDeleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            reloadData();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [softDeleteResult]);
    // #endregion

    // #region SEARCH OPERATIONS
    // SearchForm in cookies
    let searchCriterias: any = {};
    let resetForm = false;
    let showBadge = false;

    searchCriterias = props.searchCriteria;

    if (props.searchable) {
        if (cookie.get(`${props.dataModel.resolverName}SavedFilters`)) {
            const savedFilters = JSON.parse(
                cookie.get(`${props.dataModel.resolverName}SavedFilters`)!
            );

            searchCriterias = { ...savedFilters, ...props.searchCriteria };
            const initialValues = searchCriterias;

            filterFields = filterFields.map((item) => {
                if (item.name in initialValues) {
                    return {
                        ...item,
                        initialValue: initialValues[item.name]
                    };
                } else {
                    return item;
                }
            });
            showBadge = true;
        } else {
            searchCriterias = props.searchCriteria;
            showBadge = false;
        }
    }

    const [search, setSearch] = useState(searchCriterias);

    //	Search Drawer
    const [formSearch] = Form.useForm();

    const dispatchDrawer = useDrawerDispatch();

    const openSearchDrawer = useCallback(
        (filterFields: Array<FilterFieldType>) =>
            dispatchDrawer({
                size: 450,
                type: 'OPEN_DRAWER',
                title: 'actions:search',
                comfirmButtonTitle: 'actions:search',
                comfirmButton: true,
                cancelButtonTitle: 'actions:reset',
                cancelButton: true,
                submit: true,
                content: (
                    <ListFilters form={formSearch} columns={filterFields} resetForm={resetForm} />
                ),
                onCancel: () => handleReset(),
                onComfirm: () => handleSubmit()
            }),
        [dispatchDrawer]
    );

    const closeDrawer = useCallback(
        () => dispatchDrawer({ type: 'CLOSE_DRAWER' }),
        [dispatchDrawer]
    );

    const handleReset = () => {
        cookie.remove(`${props.dataModel.resolverName}SavedFilters`);
        setSearch({});
        resetForm = true;
        for (const obj of filterFields) {
            obj.initialValue = undefined;
        }
        closeDrawer();
    };

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                const searchValues = formSearch.getFieldsValue(true);

                const newSearchValues = {
                    ...searchValues
                };

                cookie.remove(`${props.dataModel.resolverName}SavedFilters`);
                showBadge = false;
                const savedFilters: any = {};

                if (newSearchValues) {
                    for (const [key, value] of Object.entries(newSearchValues)) {
                        if (
                            value !== undefined &&
                            value !== null &&
                            (Array.isArray(value) ? value.length > 0 : true)
                        ) {
                            savedFilters[key] = value;
                        }
                    }

                    if (Object.keys(savedFilters).length > 0) {
                        cookie.set(
                            `${props.dataModel.resolverName}SavedFilters`,
                            JSON.stringify(savedFilters)
                        );
                        showBadge = true;
                    }

                    filterFields = filterFields.map((item) => {
                        if (item.name in searchCriterias) {
                            return {
                                ...item,
                                initialValue: searchCriterias[item.name]
                            };
                        } else {
                            return item;
                        }
                    });
                }

                setSearch(savedFilters);
                closeDrawer();
            })
            .catch((err) => showError(t('errors:DB-000111')));
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
        props.dataModel.resolverName,
        props.dataModel.endpoints.list,
        listFields,
        search,
        pagination.current,
        pagination.itemsPerPage,
        sort,
        router.locale,
        defaultModelSort
    );

    useEffect(() => {
        reloadData();
    }, [search, props.refetch, pagination.current, pagination.itemsPerPage, sort, router.locale]);

    // #endregion

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

            if (listData && listData['results']) {
                const result_list: Array<any> = [];
                if (listData['results'].length > 0) {
                    let sort_index = 1;

                    listData['results'] = listData['results'].map((item: any) => {
                        return flatten(item);
                    });
                    listFields.forEach((column_name: any) => {
                        if (column_name.includes('{')) {
                            column_name = column_name.replaceAll('{', '_').replaceAll('}', '');
                        }
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
                            //Specific to Notifications
                            if (column_name === 'argument') {
                                result_list.push({
                                    title: 'd:argument_id',
                                    dataIndex: 'argument_id',
                                    key: 'argument_id',
                                    showSorterTooltip: false
                                });
                                result_list.push({
                                    title: 'd:argument_sequenceId',
                                    dataIndex: 'argument_sequenceId',
                                    key: 'argument_sequenceId',
                                    showSorterTooltip: false
                                });
                            } else {
                                result_list.push(row_data);
                            }
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
    }, [data, router, sort]);

    //TODO: Usage to be checked
    // useEffect(() => {
    //     reloadData(); //children function of interest
    // }, [props.refresh]);

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

        await setSort(tmp_array);
        if (tmp_array.length > 0) {
            cookie.set(`${props.dataModel.resolverName}SavedSorters`, JSON.stringify(tmp_array));
        }
        if (orderByFormater(sorter) === null) {
            cookie.remove(`${props.dataModel.resolverName}SavedSorters`);
        }
    };

    // date formatting
    if (rows?.results && rows?.results.length > 0) {
        rows.results.forEach((row: any) => {
            Object.keys(row).forEach((key) => {
                if (isString(row[key]) && isStringDateTime(row[key])) {
                    if (
                        !(
                            key === 'value' &&
                            'featureCode_dateType' in row &&
                            !row['featureCode_dateType']
                        )
                    ) {
                        row[key] = formatUTCLocaleDateTime(row[key], router.locale);
                    }
                }
                if (isString(row[key]) && isStringDate(row[key])) {
                    if (
                        !(
                            key === 'value' &&
                            'featureCode_dateType' in row &&
                            !row['featureCode_dateType']
                        )
                    ) {
                        row[key] = formatUTCLocaleDate(row[key], router.locale);
                    }
                }
            });
        });
    }

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
                        {props.headerData ? (
                            <HeaderContent
                                title={props.headerData.title}
                                routes={props.headerData.routes}
                                actionsRight={
                                    <Space>
                                        {props.searchable ? (
                                            <>
                                                {showBadge ? (
                                                    <Badge
                                                        size="default"
                                                        count={Object.keys(search).length}
                                                        color="blue"
                                                    >
                                                        <Button
                                                            icon={<SearchOutlined />}
                                                            onClick={() =>
                                                                openSearchDrawer(filterFields || [])
                                                            }
                                                        />
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        icon={<SearchOutlined />}
                                                        onClick={() =>
                                                            openSearchDrawer(filterFields || [])
                                                        }
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {props.headerData.actionsComponent != null ? (
                                            props.headerData.actionsComponent
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                }
                            />
                        ) : (
                            <></>
                        )}
                        {!isLoading && rows?.results ? (
                            rows?.results && rows?.results.length > 0 ? (
                                props.dataModel.modelName === 'NotificationDetail' &&
                                !rows?.results[0].objectBefore_id &&
                                !rows?.results[0].objectAfter_id ? (
                                    <Empty description={<span>{t('messages:no-data')}</span>} />
                                ) : (
                                    <>
                                        {props.checkbox ? (
                                            <>
                                                {props.actionButtons ? (
                                                    props.actionButtons.actionsComponent
                                                ) : (
                                                    <></>
                                                )}
                                                <AppTableV2
                                                    dataModel={props.dataModel}
                                                    columns={props.actionColumns
                                                        .concat(props.extraColumns)
                                                        .concat(columns)}
                                                    data={rows!.results}
                                                    pagination={pagination}
                                                    isLoading={isLoading}
                                                    setPagination={onChangePagination}
                                                    stickyActions={stickyActions}
                                                    onChange={handleTableChange}
                                                    hiddenColumns={hiddenListFields}
                                                    rowSelection={props.rowSelection}
                                                    linkFields={linkFields}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <AppTableV2
                                                    dataModel={props.dataModel}
                                                    columns={props.actionColumns
                                                        .concat(props.extraColumns)
                                                        .concat(columns)}
                                                    data={rows!.results}
                                                    pagination={pagination}
                                                    isLoading={isLoading}
                                                    setPagination={onChangePagination}
                                                    stickyActions={stickyActions}
                                                    onChange={handleTableChange}
                                                    hiddenColumns={hiddenListFields}
                                                    linkFields={linkFields}
                                                />
                                            </>
                                        )}
                                    </>
                                )
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

NotificationListComponent.displayName = 'ListWithFilter';
export { NotificationListComponent };
