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
import { AppTableV2, ContentSpin, DraggableItem, HeaderContent } from '@components';
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
    showWarning,
    showInfo,
    showSuccess,
    useDelete,
    useExport,
    useList,
    flatten,
    useSoftDelete,
    useUpdate,
    queryString,
    formatUTCLocaleDateTime,
    isStringDateTime,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ListFilters } from './submodules/ListFiltersV2';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { ExportFormat, ModeEnum } from 'generated/graphql';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import _, { debounce, isString } from 'lodash';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

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
    itemperpage?: number;
    advancedFilters?: any;
    //from here : props used for drag and/or drop handling
    items?: any;
    isDragAndDroppable?: boolean;
    isDragSource?: boolean;
    addRow?: (item: any, index: number) => void;
    moveRow?: (fromIndex: number, toIndex: number) => void;
    removeRow?: (item: any) => void;
    defaultEmptyList?: any;
    setInitialData?: any;
    setAppliedSort?: any;
    isIndependentScrollable?: boolean;
}

export interface newPaginationType {
    current: number;
    itemsPerPage: number;
}

const ListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const state = useAppState();
    const dispatch = useAppDispatch();
    const [switchReloadData, setSwitchReloadData] = useState<boolean>(false);

    let userSettings = state?.userSettings?.find((item: any) => {
        return `${props.dataModel.resolverName}${router.pathname}` === item.code;
    });
    // #region sorter / filter from userSettings

    const savedSorters = userSettings?.valueJson?.sorter
        ? userSettings?.valueJson?.sorter
        : userSettings?.valueJson?.sorter === null
          ? null
          : undefined;

    const sortParameter = Object.entries(props.dataModel.fieldsInfo)
        .filter(([, value]) => value.defaultSort)
        .map(([key, value]) => ({
            field: key.replace(/{/g, '_').replace(/}/g, ''),
            ascending: value.defaultSort === 'ascending'
        }));

    const [sort, setSort] = useState<any>(
        props.triggerPriorityChange
            ? [{ field: props.triggerPriorityChange.orderingField, ascending: true }]
            : savedSorters === null
              ? null
              : (savedSorters ?? props.sortDefault ?? sortParameter)
    );

    //this is to retrieve sort applied any time (used by drag and drop component)
    useEffect(() => {
        if (props.setAppliedSort) {
            props.setAppliedSort(sort);
        }
    }, [sort]);

    // only methode found to get the userSettings from the state inside the function
    const userSettingsRef = useRef(userSettings);
    const stateUserSettingsRef = useRef(state.userSettings);

    useEffect(() => {
        userSettingsRef.current = userSettings;
    }, [userSettings]);

    useEffect(() => {
        stateUserSettingsRef.current = state.userSettings;
    }, [state.userSettings]);

    const updateUserSettings = useCallback(
        //newpagination = {current: number, itemsPerPage: number}
        async (newFilter: any, newSorting: any, newPagination?: newPaginationType) => {
            const currentUserSettings = userSettingsRef.current;
            const currentStateUserSettings = stateUserSettingsRef.current;

            if (newSorting === 'default') {
                newSorting = currentUserSettings?.valueJson?.sorter ?? null;
            }

            if (newSorting === 'mandatorySort') {
                newSorting = currentUserSettings?.valueJson?.sorter ?? props.sortDefault;
            }

            if (newPagination && newPagination.current) {
                newPagination.current = 1;
            }

            const newsSettings = {
                ...currentUserSettings,
                valueJson: {
                    ...currentUserSettings?.valueJson,
                    filter: newFilter ?? currentUserSettings?.valueJson?.filter,
                    sorter: newSorting ?? null,
                    pagination: newPagination ?? currentUserSettings?.valueJson?.pagination
                }
            };
            const updateQuery = gql`
                mutation (
                    $warehouseWorkerSettingsId: String!
                    $input: UpdateWarehouseWorkerSettingInput!
                ) {
                    updateWarehouseWorkerSetting(id: $warehouseWorkerSettingsId, input: $input) {
                        id
                        code
                        valueJson
                    }
                }
            `;
            const updateVariables = {
                warehouseWorkerSettingsId: currentUserSettings.id,
                input: { valueJson: newsSettings.valueJson }
            };
            try {
                const queryInfo: any = await graphqlRequestClient.request(
                    updateQuery,
                    updateVariables
                );
                dispatch({
                    type: 'SWITCH_USER_SETTINGS',
                    userSettings: currentStateUserSettings.map((item: any) => {
                        return item.id === queryInfo?.updateWarehouseWorkerSetting?.id
                            ? queryInfo.updateWarehouseWorkerSetting
                            : item;
                    })
                });
                setSwitchReloadData((prev: boolean) => !prev);
            } catch (error) {
                console.log('queryInfo update listComponent error', error);
                showWarning(t('messages:config-save-error'));
            }
        },
        [graphqlRequestClient, dispatch, sortParameter]
    );

    const createUsersSettings = useCallback(
        async (newFilter: any, newSorting: any, newPagination?: newPaginationType) => {
            const currentUserSettings = userSettingsRef.current;
            const currentStateUserSettings = stateUserSettingsRef.current;

            if (newSorting === 'default') {
                newSorting = currentUserSettings?.valueJson?.sorter ?? null;
            }

            if (newSorting === 'mandatorySort') {
                newSorting = currentUserSettings?.valueJson?.sorter ?? props.sortDefault;
            }

            if (newPagination && newPagination.current) {
                newPagination.current = 1;
            }

            const newsSettings = {
                code: `${props.dataModel.resolverName}${router.pathname}`,
                warehouseWorkerId: state.user.id,
                valueJson: {
                    filter: newFilter,
                    sorter: newSorting,
                    pagination: newPagination
                }
            };
            const createQuery = gql`
                mutation ($input: CreateWarehouseWorkerSettingInput!) {
                    createWarehouseWorkerSetting(input: $input) {
                        id
                        code
                        valueJson
                    }
                }
            `;
            try {
                const queryInfo: any = await graphqlRequestClient.request(createQuery, {
                    input: newsSettings
                });
                dispatch({
                    type: 'SWITCH_USER_SETTINGS',
                    userSettings: [
                        ...currentStateUserSettings,
                        queryInfo.createWarehouseWorkerSetting
                    ]
                });
                setSwitchReloadData((prev: boolean) => !prev);
            } catch (error) {
                console.log('queryInfo create listComponent error', error);
                showWarning(t('messages:config-save-error'));
            }
        },
        [
            props.dataModel.resolverName,
            router.pathname,
            state.user.id,
            graphqlRequestClient,
            dispatch
        ]
    );

    const deleteUserSettings = useCallback(async () => {
        if (!userSettings) {
            return;
        }
        const deleteQuery = gql`
            mutation ($id: String!) {
                deleteWarehouseWorkerSetting(id: $id)
            }
        `;
        const deleteVariables = {
            id: userSettings.id
        };
        await graphqlRequestClient.request(deleteQuery, deleteVariables);
        showWarning(
            t(
                'messages:vos filtres, tri et pagination vont être réinitialisés car une erreur est survenue'
            )
        );
        setTimeout(() => {
            router.reload();
        }, 3000);
    }, [userSettings, graphqlRequestClient, dispatch, state.userSettings]);

    const changeFilter = useCallback(
        (filter: any, sorter: any, pagination?: newPaginationType) => {
            const currentUserSettings = userSettingsRef.current;
            if (currentUserSettings) {
                updateUserSettings(filter, sorter, pagination);
            } else {
                createUsersSettings(filter, sorter, pagination);
            }
        },
        [updateUserSettings, createUsersSettings]
    );

    // #endregion

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
    // SearchForm in cookies
    let searchCriterias: any = {};
    let resetForm = false;
    let showBadge = false;

    searchCriterias = props.searchCriteria;

    const mandatory_Filter = searchCriterias?.scope
        ? `_${searchCriterias.scope}`
        : searchCriterias?.category
          ? `_${searchCriterias.category}`
          : searchCriterias?.orderType
            ? `_${searchCriterias.orderType}`
            : '';
    // #endregion

    // #region extract data from modelV2
    const listFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isListRequested
    );

    const displayedLabels = Object.fromEntries(
        Object.entries(props.dataModel.fieldsInfo)
            .filter(([, value]) => value.displayName !== null)
            .map(([key, value]) => [key.replace(/{/g, '_').replace(/}/g, ''), value.displayName])
    );

    const formatFieldNames = (keys: string[], condition: (key: string) => boolean) =>
        keys.filter(condition).map((key) => key.replace(/{/g, '_').replace(/}/g, ''));

    const sortableFields = formatFieldNames(
        Object.keys(props.dataModel.fieldsInfo),
        (key) => props.dataModel.fieldsInfo[key].isSortable
    );

    const excludedListFields = formatFieldNames(
        Object.keys(props.dataModel.fieldsInfo),
        (key) => props.dataModel.fieldsInfo[key].isExcludedFromList
    );

    const hiddenListFields = formatFieldNames(
        Object.keys(props.dataModel.fieldsInfo),
        (key) => props.dataModel.fieldsInfo[key].isDefaultHiddenList
    );

    let filterFields = Object.entries(props.dataModel.fieldsInfo)
        .filter(([, value]) => value.searchingFormat !== null)
        .map(([key, value]) => ({
            displayName: t(`d:${(value.displayName ?? key).replace(/{/g, '_').replace(/}/g, '')}`),
            name: key.replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`).replace(/}/g, ''),
            type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
            maxLength: value.maxLength ?? undefined,
            config: value.config ?? undefined,
            param: value.param ?? undefined,
            optionTable: value.optionTable ?? undefined,
            isMultipleSearch: value.isMultipleSearch ?? undefined,
            initialValue: undefined
        }));

    // handle cancelled or closed item
    const [retrievedStatuses, setRetrievedStatuses] = useState<any>();
    const [isWithoutClosed, setIsWithoutClosed] = useState<boolean>();

    const statusScope = filterFields.find((obj: any) => obj.name === 'status')?.config ?? null;
    //#region handle scopes list (specific to config and param)
    async function getStatusesList(scope: string) {
        const query = gql`
            query configs(
                $filters: ConfigSearchFilters!
                $advancedFilters: [ConfigAdvancedSearchFilters!]
            ) {
                configs(filters: $filters, advancedFilters: $advancedFilters) {
                    results {
                        value
                        code
                        translation
                    }
                }
            }
        `;
        const variables = {
            filters: { scope: scope },
            advancedFilters: [
                { filter: [{ searchType: 'DIFFERENT', field: { code: 2000 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { code: 1005 } }] }
            ]
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            setRetrievedStatuses(result.configs.results);
            const statusField = filterFields.find((obj: any) => obj.name === 'status');
            if (
                statusField &&
                JSON.stringify(statusField.initialValue) ===
                    JSON.stringify(
                        result.configs.results.map((status: any) => parseInt(status.code))
                    )
            ) {
                setIsWithoutClosed(true);
            }
        } catch (error) {
            console.log('error in retrieving statuses', error);
        }
    }

    useEffect(() => {
        if (statusScope) {
            getStatusesList(statusScope);
        }
    }, []);
    //#endregion

    function addForcedFilter(addFilter: boolean) {
        const currentSavedFilters = userSettings?.valueJson?.filter ?? {};
        const newFilter = { ...currentSavedFilters };
        const initialValues = { ...newFilter, ...props.searchCriteria };

        if (addFilter && retrievedStatuses) {
            newFilter.status = retrievedStatuses.map((status: any) => parseInt(status.code));
            setPagination({
                total: undefined,
                current: DEFAULT_PAGE_NUMBER,
                itemsPerPage: DEFAULT_ITEMS_PER_PAGE
            });
        } else {
            delete newFilter.status;
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
        }
        changeFilter(newFilter, 'default', {
            current: DEFAULT_PAGE_NUMBER,
            itemsPerPage: DEFAULT_ITEMS_PER_PAGE
        });
        showBadge = true;
        setSwitchReloadData((prev: boolean) => !prev);
    }

    const btnName = isWithoutClosed
        ? t('actions:with-closed-cancel-items')
        : t('actions:without-closed-cancel-items');

    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => ({
            link: props.dataModel.fieldsInfo[key].link,
            name: key.replace(/{/g, '_').replace(/}/g, '')
        }));

    // #endregion

    //check if there is something in props.filterFields and if yes, overwrite it in filterFields
    if (props.filterFields) {
        filterFields = filterFields.map((field) => {
            const matchedField = props.filterFields!.find((item) => item.name === field.name);
            return matchedField ? { ...field, ...matchedField } : field;
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

    // #region PRIORITY CHANGE MUTATION

    const priorityChangeQuery = async (
        queryName: string,
        resolverName: string,
        fields: any,
        variables: any
    ): Promise<any> => {
        const query = gql`mutation ${queryName}($id: String!, $input: Update${resolverName}Input!) {
            ${queryName}(id: $id, input: $input) {
                ${fields.join('\n')}
            }
        }`;
        const queryInfo = await graphqlRequestClient.request(query, variables);
        return queryInfo;
    };

    useEffect(() => {
        if (props.triggerPriorityChange?.orderingField) {
            setSort([{ field: props.triggerPriorityChange.orderingField, ascending: true }]);
        }
    }, [props.triggerPriorityChange]);

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

    if (props.searchable) {
        const savedFilters = userSettings?.valueJson?.filter ?? undefined;

        if (savedFilters) {
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

    useEffect(() => {
        if (JSON.stringify(search) !== JSON.stringify(searchCriterias)) {
            setSearch(searchCriterias);
        }
    }, [searchCriterias]);

    //	Search Drawer
    const [formSearch] = Form.useForm();

    const dispatchDrawer = useDrawerDispatch();

    const openSearchDrawer = useCallback(() => {
        return dispatchDrawer({
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
                    allFieldsInitialValue={allFieldsInitialValue ?? undefined}
                />
            ),
            onCancel: () => handleReset(),
            onComfirm: () => handleSubmit()
        });
    }, [dispatchDrawer, filterFields]);

    const closeDrawer = useCallback(
        () => dispatchDrawer({ type: 'CLOSE_DRAWER' }),
        [dispatchDrawer]
    );

    const handleReset = () => {
        changeFilter({}, 'default', {
            current: DEFAULT_PAGE_NUMBER,
            itemsPerPage: DEFAULT_ITEMS_PER_PAGE
        });
        !props.searchCriteria ? setSearch({}) : setSearch({ ...props.searchCriteria });
        setIsWithoutClosed(false);
        allFieldsInitialValue = undefined;
        resetForm = true;
        for (const obj of filterFields) {
            obj.initialValue = undefined;
        }
        closeDrawer();
    };

    let allFieldsInitialValue: any = undefined;

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                const searchValues = formSearch.getFieldsValue(true);

                const newSearchValues = {
                    ...searchValues,
                    ...props.searchCriteria
                };

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

                    if (savedFilters.allFields) {
                        allFieldsInitialValue = savedFilters.allFields;
                    }

                    setPagination({
                        total: undefined,
                        current: DEFAULT_PAGE_NUMBER,
                        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
                    });
                    changeFilter(savedFilters, 'default', {
                        current: DEFAULT_PAGE_NUMBER,
                        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
                    });

                    if (Object.keys(savedFilters).length > 0) {
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
            .catch((err: any) => showError(t('errors:DB-000111')));
    };

    // #endregion

    // #region DATATABLE
    const [rows, setRows] = useState<DataQueryType>();
    const [columns, setColumns] = useState<Array<any>>([]);

    // for sort default value, decided order is : 1-value from cookies, 2-value from Model, 3-value from index.tsx
    let defaultModelSort = null;
    for (const key in props.dataModel.fieldsInfo) {
        if (props.dataModel.fieldsInfo[key].hasOwnProperty('defaultSort')) {
            defaultModelSort = {
                field: key.replace(/{/g, '_').replace(/}/g, ''),
                ascending: props.dataModel.fieldsInfo[key].defaultSort == 'ascending' ? true : false
            };
        }
    }

    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: userSettings?.valueJson?.pagination?.current ?? DEFAULT_PAGE_NUMBER,
        itemsPerPage:
            userSettings?.valueJson?.pagination?.itemsPerPage ??
            props.itemperpage ??
            DEFAULT_ITEMS_PER_PAGE
    });

    //first version of advancedFilters handling is for development purpose only
    const advancedFilters = props.advancedFilters ?? null;

    // #region USELIST

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
        defaultModelSort,
        advancedFilters
    );

    // #endregion

    useEffect(() => {
        // Time delay before reloading data
        const delay = 1000;
        const debouncedReload = debounce(() => {
            reloadData();
        }, delay);

        if (props.isDragAndDroppable) {
            reloadData();
        } else {
            debouncedReload();
        }

        // Cleanup function to cancel the debounce on unmount or dependency change
        return () => {
            debouncedReload.cancel();
        };
    }, [search, props.refetch, router.locale, switchReloadData, advancedFilters]);

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
            changeFilter(null, 'mandatorySort', {
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
            setPagination({
                total: rows?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
            setSwitchReloadData((prev: boolean) => !prev);
        },
        [setPagination, rows]
    );

    // #region arrange data for dynamic display
    useEffect(() => {
        if (data) {
            // if data is refreshed
            let listData: any = data?.[props.dataModel.endpoints.list];
            if (props.isDragAndDroppable && listData && listData['results'].length === 0) {
                listData = {
                    count: 1,
                    itemsPerPage: 10,
                    totalPages: 1,
                    results: props.defaultEmptyList
                };
            }

            if (listData && listData['results']) {
                const result_list: Array<any> = [];
                if (listData['results'].length > 0) {
                    let sort_index = 1;

                    listData['results'] = listData['results'].map((item: any) => {
                        return flatten(item);
                    });
                    if (props.isDragAndDroppable) {
                        if (props.isDragSource) {
                            if (listData['results'].length === 0) {
                                listData['results'] = props.defaultEmptyList;
                            }
                        } else {
                            listData['results'] = listData['results'].map(
                                (item: any, index: number) => {
                                    return { ...item, index };
                                }
                            );
                            if (
                                listData['results'].filter((e: any) => e.id !== 'null').length !== 0
                            ) {
                                listData['results'] = [
                                    ...listData['results'],
                                    ...props.defaultEmptyList
                                ];
                            }
                        }
                    }
                    // iterate over the first result and get list of columns to define table structure
                    listFields.forEach((column_name: any, index: number) => {
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
                        if (
                            sortableFields.length > 0 &&
                            sortableFields.includes(column_name) &&
                            !props.triggerPriorityChange
                        ) {
                            row_data['sorter'] = { multiple: sort_index };
                            row_data['showSorterTooltip'] = false;
                            sort_index++;
                        }

                        //If default sort memorized or passed add defaultSortOrder
                        if (sort) {
                            sort.forEach((sorter: any) => {
                                if (props.isDragAndDroppable) {
                                    if (column_name === 'index') {
                                        row_data['defaultSortOrder'] = 'ascend';
                                    }
                                } else if (sorter.field === column_name) {
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
                //this is to initialize and keep data at a given time on parent component
                if (props.setInitialData) props.setInitialData(listData.results);
                setPagination({
                    ...pagination,
                    total: listData['count']
                });
            }
        } else {
            deleteUserSettings();
        }
    }, [data, router]);

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

        if (
            _pagination.current === pagination.current &&
            _pagination.pageSize === pagination.itemsPerPage
        ) {
            setSort(tmp_array);
            if (tmp_array.length > 0) {
                changeFilter(null, tmp_array);
            }
            if (orderByFormater(sorter) === null) {
                changeFilter(null, null);
            }
        }
    };

    //#region Date formatting
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
    const mergedColumns = [...props.actionColumns, ...props.extraColumns, ...columns];

    //#region Drag and Drop management
    let draggableComponent;
    if (props.isDragAndDroppable) {
        draggableComponent = {
            body: {
                row: (rowprops: any) => {
                    const { 'data-row-key': rowKey, children, ...restProps } = rowprops;
                    const record = props.items?.find((item: any) => item.id === rowKey);
                    if (!record) return <tr {...restProps}>{children}</tr>;
                    return (
                        <DraggableItem
                            key={record.id}
                            record={record}
                            index={record.index}
                            columns={mergedColumns}
                            addRow={props.addRow}
                            moveRow={props.moveRow}
                            removeRow={props.removeRow}
                            {...restProps}
                            isDragSource={props.isDragSource}
                        />
                    );
                }
            }
        };
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
                                onBack={
                                    props.headerData.onBackRoute
                                        ? () => router.push(props.headerData!.onBackRoute!)
                                        : undefined
                                }
                                actionsRight={
                                    <Space>
                                        {statusScope ? (
                                            <Button
                                                onClick={() => {
                                                    addForcedFilter(!isWithoutClosed);
                                                    setIsWithoutClosed(!isWithoutClosed);
                                                }}
                                                style={
                                                    isWithoutClosed
                                                        ? {
                                                              backgroundColor: '#1890ff',
                                                              color: 'white'
                                                          }
                                                        : {}
                                                }
                                            >
                                                {btnName}
                                            </Button>
                                        ) : (
                                            <></>
                                        )}
                                        {props.searchable ? (
                                            <>
                                                {showBadge ? (
                                                    <Badge
                                                        size="default"
                                                        count={
                                                            !mandatory_Filter
                                                                ? Object.keys(search).length
                                                                : Object.keys(search).length - 1
                                                        }
                                                        color="blue"
                                                    >
                                                        <Button
                                                            icon={<SearchOutlined />}
                                                            onClick={() => openSearchDrawer()}
                                                        />
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        icon={<SearchOutlined />}
                                                        onClick={() => openSearchDrawer()}
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
                                                dataModel={props.dataModel}
                                                columns={mergedColumns}
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
                                                isDragAndDroppable={props.isDragAndDroppable}
                                                components={draggableComponent}
                                                items={props.items}
                                                isIndependentScrollable={
                                                    props.isIndependentScrollable
                                                }
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <AppTableV2
                                                dataModel={props.dataModel}
                                                columns={mergedColumns}
                                                data={rows!.results}
                                                pagination={pagination}
                                                isLoading={isLoading}
                                                setPagination={onChangePagination}
                                                stickyActions={stickyActions}
                                                onChange={handleTableChange}
                                                hiddenColumns={hiddenListFields}
                                                linkFields={linkFields}
                                                filter={props.columnFilter}
                                                isDragAndDroppable={props.isDragAndDroppable}
                                                components={draggableComponent}
                                                items={props.items}
                                                isIndependentScrollable={
                                                    props.isIndependentScrollable
                                                }
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

ListComponent.displayName = 'ListWithFilter';
export { ListComponent };
