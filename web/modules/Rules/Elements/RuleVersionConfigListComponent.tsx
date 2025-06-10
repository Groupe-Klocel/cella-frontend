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
import { useAuth } from 'context/AuthContext';
import { isString } from 'lodash';
import { gql } from 'graphql-request';

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
    triggerPriorityChange?: any;
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
    setRefetchRuleVersion?: any;
}

const RuleVersionConfigListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();

    const { graphqlRequestClient } = useAuth();
    const requestHeader = {
        // 'X-API-fake': 'fake',
        // "X-API-seed": "same",
        authorization: graphqlRequestClient?.requestConfig?.headers?.authorization
    };
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

    const infoDeleteOrder = {
        tableName: 'ruleVersionConfig',
        orderingField: 'order',
        // put '*' if no parentId is needed (ex: for equipement)
        parentId: 'ruleVersionId'
    };

    // #region DELETE MUTATION
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(props.dataModel.endpoints.delete, infoDeleteOrder);

    useEffect(() => {
        if (props.triggerDelete && props.triggerDelete.idToDeleteVersionConfig) {
            callDelete(props.triggerDelete.idToDeleteVersionConfig);
            props.triggerDelete.setIdToDeleteVersionConfig(undefined);
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
            props.setRefetchRuleVersion((prev: boolean) => !prev);
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

    // #region PRIORITY CHANGE MUTATION

    const priorityChangeQuery = async (
        queryName: string,
        resolverName: string,
        fields: any,
        variables: any
    ): Promise<any> => {
        console.log('variables', variables);
        const query = gql`mutation ${queryName}($id: String!, $input: Update${resolverName}Input!) {
        ${queryName}(id: $id, input: $input) {
            ${fields.join('\n')}
        }
    }`;
        const queryInfo = await graphqlRequestClient.request(query, variables).catch((err: any) => {
            console.log('err', err);
            return err;
        });
        return queryInfo;
    };

    const getNextInfo = async (variables: any) => {
        const filtersVariables = {
            filters: variables
        };
        const resolverName = props.dataModel.resolverName;
        const queryName = props.dataModel.endpoints.list;
        const query = gql`
        query ($filters: ${resolverName}SearchFilters) {
            ${queryName}(filters: $filters) {
                results {${listFields.join('\n')}}
            }
        }
    `;
        const queryInfo = await graphqlRequestClient.request(query, filtersVariables);
        return queryInfo[queryName].results[0];
    };

    useEffect(() => {
        const getLastTransactionId = async () => {
            const generateTransactionId = gql`
                mutation {
                    generateTransactionId
                }
            `;
            const transactionIdResponse = await graphqlRequestClient.request(
                generateTransactionId,
                requestHeader
            );
            return transactionIdResponse.generateTransactionId;
        };
        const priorityChangeFun = async (
            setToMinusOne: any,
            SetDataToAdapt: any,
            setDataToUpdate: any
        ) => {
            console.log('setToMinusOne', setToMinusOne);
            console.log('SetDataToAdapt', SetDataToAdapt);
            console.log('setDataToUpdate', setDataToUpdate);

            const transactionId = await getLastTransactionId();
            const rollbackTransaction = gql`
                mutation rollback($transactionId: String!) {
                    rollbackTransaction(transactionId: $transactionId)
                }
            `;
            const rollbackVariable = {
                transactionId: transactionId
            };
            try {
                if (SetDataToAdapt) {
                    const minusOneWithTr = {
                        ...setToMinusOne,
                        input: {
                            ...setToMinusOne.input,
                            lastTransactionId: transactionId
                        }
                    };
                    const dataToAdaptWithTr = {
                        ...SetDataToAdapt,
                        input: {
                            ...SetDataToAdapt.input,
                            lastTransactionId: transactionId
                        }
                    };
                    await priorityChangeQuery(
                        props.dataModel.endpoints.update,
                        props.dataModel.resolverName,
                        listFields,
                        minusOneWithTr
                    );
                    await priorityChangeQuery(
                        props.dataModel.endpoints.update,
                        props.dataModel.resolverName,
                        listFields,
                        dataToAdaptWithTr
                    );
                }
                const dataToUpdateWithTr = {
                    ...setDataToUpdate,
                    input: {
                        ...setDataToUpdate.input,
                        lastTransactionId: transactionId
                    }
                };
                await priorityChangeQuery(
                    props.dataModel.endpoints.update,
                    props.dataModel.resolverName,
                    listFields,
                    dataToUpdateWithTr
                );
                props.triggerPriorityChange.setId({
                    id: '',
                    type: ''
                });
                reloadData();
            } catch (error) {
                console.error('Error during priority change:', error);
                await graphqlRequestClient.request(
                    rollbackTransaction,
                    rollbackVariable,
                    requestHeader
                );
            }
        };
        if (
            props.triggerPriorityChange &&
            props.triggerPriorityChange.id &&
            data?.[props.dataModel.endpoints.list]?.results?.length > 0
        ) {
            const startChangeOrdering = async () => {
                const dataToModifie = data[props.dataModel.endpoints.list].results.find(
                    (item: any) => item.id === props.triggerPriorityChange.id
                );
                const biggestLineNumber = data[props.dataModel.endpoints.list].count;

                let dataToAdapt: any = null;
                if (
                    !dataToModifie ||
                    !dataToModifie[props.triggerPriorityChange.orderingField] ||
                    (dataToModifie[props.triggerPriorityChange.orderingField] <= 1 &&
                        props.triggerPriorityChange.type === 'up') ||
                    (dataToModifie[props.triggerPriorityChange.orderingField] >=
                        biggestLineNumber &&
                        props.triggerPriorityChange.type === 'down')
                ) {
                    return;
                }
                if (
                    props.triggerPriorityChange.type === 'up' &&
                    (pagination.current - 1) * pagination.itemsPerPage + 1 ===
                        dataToModifie[props.triggerPriorityChange.orderingField]
                ) {
                    const variables = {
                        [props.triggerPriorityChange.orderingField]:
                            (pagination.current - 1) * pagination.itemsPerPage
                    };
                    if (props.searchCriteria) {
                        Object.assign(variables, props.searchCriteria);
                    }
                    dataToAdapt = await getNextInfo(variables);
                } else if (
                    props.triggerPriorityChange.type === 'down' &&
                    pagination.current * pagination.itemsPerPage ===
                        dataToModifie[props.triggerPriorityChange.orderingField]
                ) {
                    const variables = {
                        [props.triggerPriorityChange.orderingField]:
                            pagination.current * pagination.itemsPerPage + 1
                    };
                    if (props.searchCriteria) {
                        Object.assign(variables, props.searchCriteria);
                    }
                    dataToAdapt = await getNextInfo(variables);
                } else {
                    dataToAdapt = data[props.dataModel.endpoints.list].results.find(
                        (item: any) =>
                            item[props.triggerPriorityChange.orderingField] ===
                            (props.triggerPriorityChange.type === 'up'
                                ? dataToModifie[props.triggerPriorityChange.orderingField] - 1
                                : dataToModifie[props.triggerPriorityChange.orderingField] + 1)
                    );
                }

                let dataToAdaptUpdated: any;
                let setToMinusOne: any;
                let SetDataToAdapt: any;
                const dataToModifieUpdated: any = {
                    ...dataToModifie,
                    [props.triggerPriorityChange.orderingField]:
                        props.triggerPriorityChange.type === 'up'
                            ? dataToModifie[props.triggerPriorityChange.orderingField] - 1
                            : dataToModifie[props.triggerPriorityChange.orderingField] + 1
                };
                if (dataToAdapt) {
                    dataToAdaptUpdated = {
                        ...dataToAdapt,
                        [props.triggerPriorityChange.orderingField]:
                            props.triggerPriorityChange.type === 'up'
                                ? dataToAdapt[props.triggerPriorityChange.orderingField] + 1
                                : dataToAdapt[props.triggerPriorityChange.orderingField] - 1
                    };
                    setToMinusOne = {
                        id: dataToModifie.id,
                        input: {
                            [props.triggerPriorityChange.orderingField]: -1
                        }
                    };
                    SetDataToAdapt = {
                        id: dataToAdapt.id,
                        input: {
                            [props.triggerPriorityChange.orderingField]:
                                dataToAdaptUpdated[props.triggerPriorityChange.orderingField]
                        }
                    };
                }
                const setDataToUpdate = {
                    id: dataToModifie.id,
                    input: {
                        [props.triggerPriorityChange.orderingField]:
                            dataToModifieUpdated[props.triggerPriorityChange.orderingField]
                    }
                };
                priorityChangeFun(setToMinusOne, SetDataToAdapt, setDataToUpdate);
            };
            startChangeOrdering();
        }
    }, [props.triggerPriorityChange]);

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
                        if (item.ruleLineConfigurationOut) {
                            Object.entries(item.ruleLineConfigurationOut).forEach(
                                ([key, value]: any) => {
                                    item.ruleLineConfigurationOut[key] = {
                                        value: JSON.stringify(value.value)
                                    };
                                }
                            );
                        }
                        if (item.ruleLineConfigurationIn) {
                            Object.entries(item.ruleLineConfigurationIn).forEach(
                                ([key, value]: any) => {
                                    item.ruleLineConfigurationIn[key] = {
                                        value: JSON.stringify(value.value),
                                        operator: value.operator
                                    };
                                }
                            );
                        }
                        console.log(item, 'item');
                        return flatten(item);
                    });

                    let new_column_list: any[] = [
                        {
                            title: 'd:order',
                            dataIndex: 'order',
                            key: 'order',
                            showSorterTooltip: false
                        }
                    ];

                    //Specific for display input/output elements of rule
                    const newListData: any[] = [];

                    listData['results'].map((result: any) => {
                        const newElementListData: any = {};

                        newElementListData['order'] = result['order'];
                        newElementListData['id'] = result['id'];

                        // Input/output rule fields

                        const operatorField: Record<string, any> = {};
                        const valueFields: Record<string, any> = {};

                        Object.keys(result).forEach((field: any) => {
                            const inputFields = field.split('_');
                            const valueType = inputFields[inputFields.length - 1];
                            if (valueType === 'operator') {
                                operatorField[field] = result[field];
                            }
                            if (valueType === 'value') {
                                valueFields[field] = result[field];
                            }
                        });

                        Object.keys(valueFields).forEach((valueField: any) => {
                            const inputFields = valueField.split('_');

                            const typeField = inputFields[0];
                            const value = inputFields.slice(1, inputFields.length - 1).join('_');
                            const operator = operatorField[typeField + '_' + value + '_operator'];
                            // Remove duplicate columns based on dataIndex before pushing new column
                            if (
                                !new_column_list.some(
                                    (col) => col.dataIndex === typeField + '_' + value
                                )
                            ) {
                                new_column_list.push({
                                    title:
                                        value +
                                        ' (' +
                                        ((typeField.endsWith('In') ? t('d:input') : t('d:output')) +
                                            ')'),
                                    dataIndex: typeField + '_' + value,
                                    key: typeField + '_' + value,
                                    showSorterTooltip: false
                                });
                            }

                            function isNotNull(value: any) {
                                if (value === 'null' || value === null || value === undefined) {
                                    return '';
                                } else {
                                    return value;
                                }
                            }

                            if (typeField.endsWith('Out')) {
                                newElementListData[typeField + '_' + value] = isNotNull(
                                    valueFields[valueField]
                                );
                            } else if (typeField.endsWith('In')) {
                                if (operator === '*') {
                                    newElementListData[typeField + '_' + value] =
                                        isNotNull(value) + ' ' + isNotNull(operator);
                                } else {
                                    newElementListData[typeField + '_' + value] =
                                        isNotNull(value) +
                                        ' ' +
                                        isNotNull(operator) +
                                        ' ' +
                                        isNotNull(valueFields[valueField]);
                                }
                            }
                        });

                        newListData.push(newElementListData);
                        console.log(
                            "AXC - RuleVersionConfigListComponent.tsx - listData['results'].map - newElementListData:",
                            newElementListData
                        );
                        return null;
                    });
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
        setSort(orderByFormater(sorter));
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
                                                filter={props.columnFilter}
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
