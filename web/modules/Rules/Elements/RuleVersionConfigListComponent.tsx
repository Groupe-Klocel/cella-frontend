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
import {
    ExportFormat,
    ModeEnum,
    UpdateRuleVersionConfigMutation,
    UpdateRuleVersionConfigMutationVariables,
    useUpdateRuleVersionConfigMutation
} from 'generated/graphql';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
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
    triggerOrderUp: any;
    triggerOrderDown: any;
}

const RuleVersionConfigListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();

    const { graphqlRequestClient } = useAuth();

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
        if (props.triggerDelete && props.triggerDelete.idToDeleteVersionConfig) {
            callDelete(props.triggerDelete.idToDeleteVersionConfig);
            props.triggerDelete.setIdToDeleteVersionConfig(undefined);
        }
    }, [props.triggerDelete]);

    //Order up and down management
    const { mutate: ruleVersionConfigMutate, isPending: updatedLoading } =
        useUpdateRuleVersionConfigMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdateRuleVersionConfigMutation,
                _variables: UpdateRuleVersionConfigMutationVariables,
                _context: any
            ) => {
                reloadData();
                props.triggerOrderUp.setarrowClicked('false');
            },
            onError: () => {
                showError(t('messages:error-update-data'));
                props.triggerOrderUp.setarrowClicked('false');
            }
        });

    const updateRuleVersionConfig = ({ id, input }: UpdateRuleVersionConfigMutationVariables) => {
        ruleVersionConfigMutate({ id, input });
    };

    useEffect(() => {
        if (props.triggerOrderUp && props.triggerOrderUp.idToOrderUp) {
            const currentRuleVersionConfig = data?.ruleVersionConfigs?.results.find(
                (e: any) => e.id == props.triggerOrderUp.idToOrderUp
            );
            const currentOrder = currentRuleVersionConfig?.order;
            const minusOneOrder = currentOrder ? currentOrder - 1 : undefined;

            if (minusOneOrder && minusOneOrder > 0) {
                updateRuleVersionConfig({
                    id: props.triggerOrderUp.idToOrderUp,
                    input: { order: minusOneOrder as any }
                });
            }
        }
    }, [props.triggerOrderUp]);

    useEffect(() => {
        const currentRuleVersionConfig = data?.ruleVersionConfigs?.results.find(
            (e: any) => e.id == props.triggerOrderDown.idToOrderDown
        );
        const currentOrder = currentRuleVersionConfig?.order;
        const plusOneOrder = currentOrder ? currentOrder + 1 : undefined;

        if (plusOneOrder) {
            updateRuleVersionConfig({
                id: props.triggerOrderDown.idToOrderDown,
                input: { order: plusOneOrder }
            });
        }
    }, [props.triggerOrderDown]);

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
        if (data?.ruleVersionConfigs?.results.length > 0) {
            // if data is refreshed
            let resElement = 0;
            const listData: any = data?.[props.dataModel.endpoints.list];

            if (listData && listData['results']) {
                if (listData['results'].length > 0) {
                    listData['results'] = listData['results'].map((item: any) => {
                        return flatten(item);
                    });

                    const new_column_list: any[] = [];
                    let column_element: any = {};

                    //Specific for display input/output elements of rule
                    const newListData: any[] = [];
                    let titleDetail: String;

                    for (resElement = 0; resElement < listData['results'].length; resElement++) {
                        const newElementListData: any = {};

                        newElementListData['order'] = listData['results'][resElement]['order'];
                        newElementListData['id'] = listData['results'][resElement]['id'];

                        if (resElement === 0) {
                            column_element['title'] = 'd:order';
                            column_element['dataIndex'] = 'order';
                            column_element['key'] = 'order';
                            column_element['showSorterTooltip'] = false;

                            new_column_list.push(column_element);
                        }

                        // Input/output rule fields

                        let fieldToSearch: any;
                        let cpt_column: number;
                        Object.keys(listData['results'][resElement]).forEach((field: any) => {
                            if (
                                field.startsWith('ruleLineConfigurationIn') ||
                                field.startsWith('ruleLineConfigurationOut')
                            ) {
                                const inputFields = field.split('_');

                                if (
                                    !newElementListData.hasOwnProperty(
                                        inputFields[0] + '_' + inputFields[1]
                                    )
                                ) {
                                    if (inputFields[0].endsWith('In')) {
                                        newElementListData[inputFields[0] + '_' + inputFields[1]] =
                                            inputFields[1];
                                    }

                                    fieldToSearch =
                                        inputFields[0] + '_' + inputFields[1] + '_operator';

                                    if (listData['results'][resElement][fieldToSearch] === '*') {
                                        newElementListData[inputFields[0] + '_' + inputFields[1]] +=
                                            ' = ';
                                    }
                                    if (listData['results'][resElement][fieldToSearch]) {
                                        newElementListData[inputFields[0] + '_' + inputFields[1]] +=
                                            ' ' +
                                            listData['results'][resElement][fieldToSearch] +
                                            ' ';
                                    }

                                    fieldToSearch =
                                        inputFields[0] + '_' + inputFields[1] + '_value';

                                    if (inputFields[0].endsWith('In')) {
                                        if (listData['results'][resElement][fieldToSearch]) {
                                            newElementListData[
                                                inputFields[0] + '_' + inputFields[1]
                                            ] +=
                                                ' ' +
                                                listData['results'][resElement][fieldToSearch] +
                                                ' ';
                                        }
                                    } else {
                                        if (listData['results'][resElement][fieldToSearch]) {
                                            newElementListData[
                                                inputFields[0] + '_' + inputFields[1]
                                            ] =
                                                ' ' +
                                                listData['results'][resElement][fieldToSearch] +
                                                ' ';
                                        }
                                    }

                                    for (
                                        cpt_column = 0;
                                        cpt_column < new_column_list.length;
                                        cpt_column++
                                    ) {
                                        if (
                                            new_column_list[cpt_column]['key'] ===
                                            inputFields[0] + '_' + inputFields[1]
                                        ) {
                                            break;
                                        }
                                    }

                                    if (
                                        new_column_list.length === 0 ||
                                        cpt_column === new_column_list.length
                                    ) {
                                        column_element = {};

                                        if (inputFields[0].endsWith('In')) {
                                            titleDetail = t('d:input');
                                        } else {
                                            titleDetail = t('d:output');
                                        }

                                        column_element['title'] =
                                            inputFields[1] + ' (' + titleDetail + ')';
                                        column_element['dataIndex'] =
                                            inputFields[0] + '_' + inputFields[1];
                                        column_element['key'] =
                                            inputFields[0] + '_' + inputFields[1];
                                        column_element['showSorterTooltip'] = false;

                                        new_column_list.push(column_element);
                                    }
                                }
                            }
                        });
                        newListData.push(newElementListData);
                    }

                    listData.results = newListData;

                    setRows(listData);
                    setColumns(new_column_list);
                }

                if (props.setData) props.setData(listData.results);
                setPagination({
                    ...pagination,
                    total: listData['count']
                });
            }
        } else {
            const listData: any = [];
            setRows(listData);
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
                        {!isLoading && rows ? (
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

RuleVersionConfigListComponent.displayName = 'ListWithFilter';
export { RuleVersionConfigListComponent };
