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
import { AppTableV2, ContentSpin, HeaderContent } from '@components';
import { Space, Form, Button, Empty, Alert, Badge } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import useTranslation from 'next-translate/useTranslation';
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
    useUpdate,
    isStringDateTime,
    formatUTCLocaleDateTime,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useCallback, useEffect, useState } from 'react';
import { ListFilters } from '../../Crud/submodules/ListFiltersV2';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import { ExportFormat, ModeEnum } from 'generated/graphql';
import { useRouter } from 'next/router';
import { isString } from 'lodash';

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
    onBackRoute?: string;
};
export type ActionButtons = {
    actionsComponent: any;
};
export interface IListProps {
    dataModel: ModelType;
    triggerDelete: any;
    triggerSoftDelete: any;
    triggerReopen?: any;
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
    columnFilter?: boolean;
}

const RuleVersionListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();

    // #region DEFAULT PROPS
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [],
        columnFilter: true
    };
    props = { ...defaultProps, ...props };
    // #endregion

    // #region extract data from modelV2
    const listFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isListRequested
    );

    const sortableFields =
        Object.keys(props.dataModel.fieldsInfo)
            .filter((key) => props.dataModel.fieldsInfo[key].isSortable)
            .map((obj) => {
                if (obj.includes('{')) {
                    obj = obj.replaceAll('{', '_').replaceAll('}', '');
                }
                return obj;
            }) || [];
    const displayedLabels = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].displayName !== null)
        .reduce((obj: any, key) => {
            let newKey = key;
            if (key.includes('{')) {
                newKey = key.replaceAll('{', '_').replaceAll('}', '');
            }
            obj[newKey] = props.dataModel.fieldsInfo[key].displayName;
            return obj;
        }, {});

    const excludedListFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].isExcludedFromList)
        .map((obj) => {
            if (obj.includes('{')) {
                obj = obj.replaceAll('{', '_').replaceAll('}', '');
            }
            return obj;
        });

    const hiddenListFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].isDefaultHiddenList)
        .map((obj) => {
            if (obj.includes('{')) {
                obj = obj.replaceAll('{', '_').replaceAll('}', '');
            }
            return obj;
        });

    let filterFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].searchingFormat !== null)
        .map((key) => {
            // handle uppercase for fields with {}
            let name = key;
            if (name.includes('{')) {
                name = name
                    .replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`)
                    .replaceAll('}', '');
            }
            return {
                displayName: t(
                    `d:${(props.dataModel.fieldsInfo[key].displayName ?? key)
                        .replaceAll('{', '_')
                        .replaceAll('}', '')}`
                ),
                name: name,
                type: FormDataType[
                    props.dataModel.fieldsInfo[key].searchingFormat as keyof typeof FormDataType
                ],
                maxLength: props.dataModel.fieldsInfo[key].maxLength ?? undefined,
                config: props.dataModel.fieldsInfo[key].config ?? undefined,
                param: props.dataModel.fieldsInfo[key].param ?? undefined,
                optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined,
                isMultipleSearch: props.dataModel.fieldsInfo[key].isMultipleSearch ?? undefined,
                initialValue: undefined
            };
        });

    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => ({
            link: props.dataModel.fieldsInfo[key].link,
            name: key.replaceAll('{', '_').replaceAll('}', '')
        }));
    const sortParameter = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].defaultSort)
        .map((key) => ({
            field: key.includes('{') ? key.replaceAll('{', '_').replaceAll('}', '') : key,
            ascending: props.dataModel.fieldsInfo[key].defaultSort === 'ascending' ? true : false
        }));

    // #endregion

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
            showInfo(t('messages:info-disabling-wip'));
        }
    }, [softDeleteLoading]);

    useEffect(() => {
        if (!(softDeleteResult && softDeleteResult.data)) return;

        if (softDeleteResult.success) {
            showSuccess(t('messages:success-disabled'));
            reloadData();
        } else {
            showError(t('messages:error-disabling-element'));
        }
    }, [softDeleteResult]);
    // #endregion

    // #region Enable (Re-Open)

    const {
        isLoading: enableLoading,
        result: enableResult,
        mutate: callReopen
    } = useUpdate(props.dataModel.resolverName, props.dataModel.endpoints.update, listFields);

    useEffect(() => {
        if (props.triggerReopen && props.triggerReopen.reopenInfo) {
            callReopen({
                id: props.triggerReopen.reopenInfo.id,
                input: { status: props.triggerReopen.reopenInfo.status }
            });
            props.triggerReopen.setReopenInfo(undefined);
        }
    }, [props.triggerReopen]);

    useEffect(() => {
        if (enableLoading) {
            showInfo(t('messages:info-enabling-wip'));
        }
    }, [enableLoading]);

    useEffect(() => {
        if (!(enableResult && enableResult.data)) return;

        if (enableResult.success) {
            showSuccess(t('messages:success-enabled'));
            reloadData();
        } else {
            showError(t('messages:error-enabling-element'));
        }
    }, [enableResult]);
    // #end region

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
                    <ListFilters
                        form={formSearch}
                        columns={filterFields}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                    />
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

                for (const i in newSearchValues) {
                    if (newSearchValues.hasOwnProperty(i)) {
                        if (typeof newSearchValues[i] === 'string') {
                            newSearchValues[i] += '%';
                        }
                    }
                }

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
    // for sort default value, decided order is : 1-value from Model, 2-value from index.tsx

    let defaultModelSort = null;
    for (const key in props.dataModel.fieldsInfo) {
        if (props.dataModel.fieldsInfo[key].hasOwnProperty('defaultSort')) {
            defaultModelSort = {
                field: key,
                ascending: props.dataModel.fieldsInfo[key].defaultSort == 'ascending' ? true : false
            };
        }
    }

    const [sort, setSort] = useState<any>(sortParameter ? sortParameter : props.sortDefault);
    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

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
    const { isLoading: exportLoading, result: exportResult, mutate } = useExport();

    const exportData = () => {
        mutate({
            format: ExportFormat.Csv,
            compression: null,
            separator: ',',
            orderBy: sort,
            filters: search
        });
    };

    useEffect(() => {
        if (exportLoading) {
            showInfo(t('messages:info-export-wip'));
        }
    }, [exportLoading]);

    useEffect(() => {
        if (!(exportResult && exportResult.data)) return;

        if (exportResult.success) {
            showSuccess(t('messages:success-exported'));
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
        (currentPage: any, itemsPerPage: any) => {
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

                    // Specific to rule_version
                    // iterate over the first result and get list of columns to define table structure
                    Object.keys(listData['results'][0]).forEach((column_name: any) => {
                        // Customize title name

                        let title = `d:${column_name}`;
                        if (displayedLabels && column_name in displayedLabels) {
                            title = `d:${displayedLabels[column_name]}`;
                        }

                        // Specific to record_history
                        const prefixesToCheck = [
                            'd:ruleConfigurationIn_',
                            'd:ruleConfigurationOut_'
                        ];
                        const suffixesToCheck = ['_description', '_type', '_validationRule'];
                        // Check if the title starts with any of the prefixes
                        for (const prefix of prefixesToCheck) {
                            if (title.startsWith(prefix)) {
                                for (const suffix of suffixesToCheck) {
                                    if (title.endsWith(suffix)) {
                                        const subTitle = title.split('_');
                                        title = subTitle[2];
                                    }
                                }
                            }
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

                        // Hide fields if there is any hidden selected.
                        if (!excludedListFields || !excludedListFields.includes(row_data.key)) {
                            result_list.push(row_data);
                        }
                    });
                }

                // Specific to display columns for input/output parameters of json fields

                if (result_list) {
                    result_list.splice(3, 10);
                }

                const new_result_list: any[] = [];

                const first_column_element: any = {};

                if (
                    result_list[0].dataIndex === 'ruleConfigurationIn' ||
                    result_list[0].dataIndex === 'ruleConfigurationOut'
                ) {
                    <></>;
                } else {
                    first_column_element['title'] = 'd:parameterName';
                    first_column_element['dataIndex'] = 'parameterName';
                    first_column_element['key'] = 'parameterName';
                    first_column_element['showSorterTooltip'] = false;

                    new_result_list.push(first_column_element);

                    for (const oneColumnElement of result_list) {
                        const new_column_element: any = {};
                        Object.keys(oneColumnElement).forEach((key: any) => {
                            if (key === 'dataIndex' || key === 'key') {
                                const subValues = oneColumnElement[key].split('_');

                                if (subValues.length > 0) {
                                    new_column_element[key] = subValues[2];
                                }
                            } else if (key === 'title') {
                                new_column_element[key] = 'd:' + oneColumnElement[key];
                            } else {
                                new_column_element[key] = oneColumnElement[key];
                            }
                        });

                        new_result_list.push(new_column_element);
                    }
                }

                // set columns to use in table
                setColumns(new_result_list);

                // Specific to display columns for input/output parameters of json fields
                let newElementListData: any = {};
                const newListData: any[] = [];

                if (
                    listData &&
                    result_list[0].dataIndex !== 'ruleConfigurationIn' &&
                    result_list[0].dataIndex !== 'ruleConfigurationOut'
                ) {
                    Object.keys(listData.results[0]).forEach((key: any) => {
                        const subKeys = key.split('_');

                        if (key.endsWith('_description')) {
                            if (Object.keys(newElementListData).length > 0) {
                                newListData.push(newElementListData);
                            }

                            newElementListData = {};

                            newElementListData['parameterName'] = subKeys[1];
                            newElementListData[subKeys[2]] = listData.results[0][key];
                        } else {
                            newElementListData[subKeys[2]] = listData.results[0][key];
                        }
                    });

                    if (Object.keys(newElementListData).length > 0) {
                        newListData.push(newElementListData);
                    }

                    listData.results = newListData;
                }

                // set data for the table
                setRows(listData);

                if (props.setData) props.setData(listData.results);
                setPagination({
                    ...pagination,
                    total: listData['count']
                });
            }
        }
    }, [data, router]);

    //TODO: Usage to be checked
    // useEffect(() => {
    //     reloadData(); //children function of interest
    // }, [props.refresh]);

    const handleTableChange = async (_pagination: any, _filter: any, sorter: any) => {
        await setSort(orderByFormater(sorter));
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
                                <>
                                    {props.checkbox ? (
                                        <>
                                            {props.actionButtons ? (
                                                props.actionButtons.actionsComponent
                                            ) : (
                                                <></>
                                            )}
                                            <AppTableV2
                                                type={props.dataModel.endpoints.list}
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
                                                filter={props.columnFilter}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <AppTableV2
                                                type={props.dataModel.endpoints.list}
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
                                                filter={props.columnFilter}
                                            />
                                        </>
                                    )}
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

RuleVersionListComponent.displayName = 'ListWithFilter';
export { RuleVersionListComponent };
