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
    CheckCircleOutlined,
    CloseSquareOutlined,
    FileExcelOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined
} from '@ant-design/icons';
import {
    TableFilter,
    ContentSpin,
    DraggableItem,
    HeaderContent,
    DrawerItems,
    PageTableContentWrapper,
    WrapperStickyActions
} from '@components';
import { Space, Form, Button, Empty, Alert, Badge, Tag, Spin, Table, Typography } from 'antd';
import { isNumeric, useTranslationWithFallback as useTranslation } from '@helpers';
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
import _, { debounce, filter, isString, set } from 'lodash';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { log } from 'console';

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
    cumulSearchInfos?: any;
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
    functions?: any;
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
    isCreateAMovement?: boolean;
    dataToCreateMovement?: any;
    setSuccessDeleteResult?: any;
}

export interface newPaginationType {
    current: number;
    itemsPerPage: number;
}

const { Column } = Table;
const { Link } = Typography;

const ListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const filterLanguage = router.locale;
    const state = useAppState();
    const configs = state?.configs;
    const parameters = state?.parameters;
    const dispatch = useAppDispatch();
    const [firstLoad, setFirstLoad] = useState<boolean>(true);
    const [rows, setRows] = useState<DataQueryType>();
    const [selectCase, setSelectCase] = useState<string[]>([]);
    const [selectJoker, setSelectJoker] = useState<string[]>([]);
    const [advancedFilters, setAdvancedFilters] = useState<any>(
        props.advancedFilters
            ? Array.isArray(props.advancedFilters)
                ? props.advancedFilters
                : [props.advancedFilters]
            : []
    );
    const resolverName = props.dataModel.moreInfos
        ? `${props.dataModel.resolverName}${props.dataModel.moreInfos}`
        : props.dataModel.resolverName;
    const [userSettings, setUserSettings] = useState<any>(
        state?.userSettings?.find((item: any) => {
            return `${resolverName}${router.pathname}` === item.code;
        })
    );

    let initialState = userSettings?.valueJson?.allColumnsInfos;
    const [allColumns, setAllColumns] = useState<any[]>(initialState);
    const [initialAllColumns, setInitialAllColumns] = useState<any[]>(initialState);

    // Define pageName to retrieve screen permissions
    const pageName = router.pathname.split('/').filter(Boolean)[0];
    const permissionTableName = 'wm_' + pageName;

    // manage empty props
    const defaultProps = {
        searchable: props.isDragAndDroppable ? false : true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [],
        columnFilter: true
    };
    props = { ...defaultProps, ...props };
    // SearchForm in cookies
    const searchCriterias: any = Object.keys(props.searchCriteria).reduce(
        (acc: any, key: string) => {
            if (props.searchCriteria[key] !== undefined && props.searchCriteria[key] !== null) {
                acc[key] =
                    !Array.isArray(props.searchCriteria[key]) &&
                    props.searchCriteria[key] !== 'String'
                        ? [props.searchCriteria[key]]
                        : props.searchCriteria[key];
            }
            return acc;
        },
        {}
    );
    let resetForm = false;
    let showBadge = false;

    // #region sorter / pagination

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

    const defaultPagination: newPaginationType = {
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage:
            userSettings?.valueJson?.pagination?.itemsPerPage ??
            props.itemperpage ??
            DEFAULT_ITEMS_PER_PAGE
    };

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

    const adjustedPagination =
        props.isDragSource &&
        (pagination?.total ?? 1) / pagination?.itemsPerPage === pagination?.current - 1
            ? pagination?.current > 1
                ? pagination.current - 1
                : pagination?.current
            : pagination?.current;

    //this is to retrieve sort applied any time (used by drag and drop component)
    useEffect(() => {
        if (props.setAppliedSort) {
            props.setAppliedSort(sort);
        }
    }, [sort]);

    // #endregion

    // #region create / update and delete user settings

    async function updateUserSettings(
        newFilter: any,
        newSorting: any,
        newPagination?: newPaginationType,
        newAdvancedFilters?: any,
        selectCase?: string[],
        selectJoker?: string[],
        newSubOptions?: any,
        newAllColumnsInfos?: any,
        newColumnWidths?: any,
        newState?: any
    ) {
        const settings =
            newState?.userSettings?.find((item: any) => {
                return `${resolverName}${router.pathname}` === item.code;
            }) ?? userSettings; // use latest from state

        const newsSettings = {
            ...settings,
            valueJson: {
                ...settings?.valueJson,
                filter: newFilter ?? settings?.valueJson?.filter,
                advancedFilters: newAdvancedFilters ?? advancedFilters,
                filterParameters: {
                    selectCase: selectCase,
                    selectJoker: selectJoker
                },
                sorter: newSorting ?? settings?.valueJson?.sorter ?? props.sortDefault ?? null,
                pagination: newPagination ?? defaultPagination,
                subOptions: newSubOptions ?? settings?.valueJson?.subOptions ?? undefined,
                allColumnsInfos: newAllColumnsInfos ?? settings?.valueJson?.allColumnsInfos ?? null,
                columnsWidth: newColumnWidths ?? settings?.valueJson?.columnsWidth ?? null
            }
        };
        delete newsSettings.valueJson.visibleColumns;

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
            warehouseWorkerSettingsId: settings.id,
            input: { valueJson: newsSettings.valueJson }
        };
        try {
            const queryInfo: any = await graphqlRequestClient.request(updateQuery, updateVariables);
            dispatch({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: newState?.userSettings.map((item: any) => {
                    return item.id === queryInfo?.updateWarehouseWorkerSetting?.id
                        ? queryInfo.updateWarehouseWorkerSetting
                        : item;
                })
            });
            setUserSettings(queryInfo.updateWarehouseWorkerSetting);
            setPagination({
                ...pagination,
                current: newPagination?.current ?? pagination.current,
                itemsPerPage: newPagination?.itemsPerPage ?? pagination.itemsPerPage
            });
        } catch (error) {
            console.log('queryInfo update listComponent error', error);
            showWarning(t('messages:config-save-error'));
        }
    }

    async function createUsersSettings(
        newFilter: any,
        newSorting: any,
        newPagination?: newPaginationType,
        newAdvancedFilters?: any,
        selectCase?: string[],
        selectJoker?: string[],
        newSubOptions?: any,
        newAllColumnsInfos?: any,
        newColumnWidths?: any,
        newState?: any
    ) {
        if (newPagination && newPagination.current) {
            newPagination.current = 1;
        }
        const newsSettings = {
            code: `${resolverName}${router.pathname}`,
            warehouseWorkerId: state.user.id,
            valueJson: {
                filter: newFilter,
                advancedFilters: newAdvancedFilters ?? advancedFilters,
                filterParameters: {
                    selectCase: selectCase,
                    selectJoker: selectJoker
                },
                sorter: newSorting ?? props.sortDefault ?? null,
                pagination: newPagination ?? defaultPagination,
                subOptions: newSubOptions ?? undefined,
                allColumnsInfos: newAllColumnsInfos ?? allColumns ?? undefined,
                columnsWidth: newColumnWidths ?? {}
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
                userSettings: [...newState?.userSettings, queryInfo.createWarehouseWorkerSetting]
            });
            setUserSettings(queryInfo.createWarehouseWorkerSetting);
            setPagination({
                ...pagination,
                current: newPagination?.current ?? pagination.current,
                itemsPerPage: newPagination?.itemsPerPage ?? pagination.itemsPerPage
            });
        } catch (error) {
            console.log('queryInfo create listComponent error', error);
            showWarning(t('messages:config-save-error'));
        }
    }

    async function deleteUserSettings() {
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
    }

    const debouncedUpdateUserSettings = useRef(
        debounce(
            (
                newFilter: any,
                newSorting: any,
                newPagination?: newPaginationType,
                advancedFilters?: any,
                selectCase?: string[],
                selectJoker?: string[],
                newSubOptions?: any,
                newAllColumnsInfos?: any,
                newColumnWidths?: any,
                newState?: any
            ) => {
                updateUserSettings(
                    newFilter,
                    newSorting,
                    newPagination,
                    advancedFilters,
                    selectCase,
                    selectJoker,
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    newState
                );
            },
            500 // ms, adjust as needed
        )
    ).current;

    const debouncedCreateUsersSettings = useRef(
        debounce(
            (
                newFilter: any,
                newSorting: any,
                newPagination?: newPaginationType,
                advancedFilters?: any,
                selectCase?: string[],
                selectJoker?: string[],
                newSubOptions?: any,
                newAllColumnsInfos?: any,
                newColumnWidths?: any,
                newState?: any
            ) => {
                createUsersSettings(
                    newFilter,
                    newSorting,
                    newPagination,
                    advancedFilters,
                    selectCase,
                    selectJoker,
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    newState
                );
            },
            500
        )
    ).current;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateUserSettings.cancel();
            debouncedCreateUsersSettings.cancel();
        };
    }, []);

    const handleUserSettings = useCallback(
        (
            newFilter: any = null,
            newSorter: any = null,
            newPagination?: newPaginationType,
            newAdvancedFilters?: any,
            newSelectCase?: string[],
            newSelectJoker?: string[],
            newSubOptions?: any,
            newAllColumnsInfos?: any,
            newColumnWidths?: any
        ) => {
            // Always use the latest userSettings from state
            if (userSettings) {
                debouncedUpdateUserSettings(
                    newFilter,
                    newSorter,
                    newPagination,
                    newAdvancedFilters ?? advancedFilters,
                    newSelectCase ?? selectCase,
                    newSelectJoker ?? selectJoker,
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    state // always use latest
                );
            } else {
                debouncedCreateUsersSettings(
                    newFilter,
                    newSorter,
                    pagination,
                    newAdvancedFilters,
                    newSelectCase,
                    newSelectJoker,
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    state // always use latest
                );
            }
        },
        [
            userSettings,
            state,
            debouncedUpdateUserSettings,
            debouncedCreateUsersSettings,
            advancedFilters,
            selectCase,
            selectJoker,
            pagination
        ]
    );

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

    const [filterFields, setFilterFields] = useState<any>(() =>
        Object.entries(props.dataModel.fieldsInfo)
            .filter(
                ([key, value]) =>
                    value.searchingFormat !== null ||
                    Object.keys(props.searchCriteria).includes(key)
            )
            .map(([key, value]) => ({
                displayName: t(
                    `d:${(value.displayName ?? key).replace(/{/g, '_').replace(/}/g, '')}`
                ),
                name: key.replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`).replace(/}/g, ''),
                type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
                maxLength: value.maxLength ?? undefined,
                config: value.config ?? undefined,
                configList: configs.filter((config: any) => config.scope === value.config),
                param: value.param ?? undefined,
                paramList: parameters.filter((param: any) => param.scope === value.param),
                optionTable: value.optionTable ?? undefined,
                isMultipleSearch: value.isMultipleSearch ?? undefined,
                initialValue: undefined
            }))
    );
    // Update filterFields if props.filterFields changes
    useEffect(() => {
        let updatedFilterFields = Object.entries(props.dataModel.fieldsInfo)
            .filter(
                ([key, value]) =>
                    value.searchingFormat !== null ||
                    Object.keys(props.searchCriteria).includes(key)
            )
            .map(([key, value]) => ({
                displayName: t(
                    `d:${(value.displayName ?? key).replace(/{/g, '_').replace(/}/g, '')}`
                ),
                name: key.replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`).replace(/}/g, ''),
                type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
                maxLength: value.maxLength ?? undefined,
                config: value.config ?? undefined,
                configList: configs.filter((config: any) => config.scope === value.config),
                param: value.param ?? undefined,
                paramList: parameters.filter((param: any) => param.scope === value.param),
                optionTable: value.optionTable ?? undefined,
                isMultipleSearch: value.isMultipleSearch ?? undefined,
                initialValue: undefined
            }));
        if (props.filterFields) {
            updatedFilterFields = updatedFilterFields.map((field) => {
                const matchedField = props.filterFields!.find((item) => item.name === field.name);
                // Remove duplicate objects from subOptions array if present
                const matchedFieldFiltered = {
                    ...matchedField,
                    subOptions: matchedField?.subOptions
                        ? matchedField.subOptions.filter(
                              (option: any, idx: number, arr: any[]) =>
                                  arr.findIndex(
                                      (o) => JSON.stringify(o) === JSON.stringify(option)
                                  ) === idx
                          )
                        : undefined
                };
                return matchedFieldFiltered ? { ...field, ...matchedFieldFiltered } : field;
            });
        }
        if (props.cumulSearchInfos) {
            updatedFilterFields.push(props.cumulSearchInfos.filters);
        }
        const savedFilters = userSettings?.valueJson?.filter ?? undefined;

        const newSearchCriterias = {
            ...savedFilters,
            ...searchCriterias
        };

        updatedFilterFields = updatedFilterFields.map((item: any) => {
            if (item.name in newSearchCriterias) {
                return {
                    ...item,
                    initialValue: newSearchCriterias[item.name]
                };
            } else {
                return item;
            }
        });

        updatedFilterFields.unshift({
            name: 'allFields',
            displayName: t('d:all-fields-search'),
            type: FormDataType.String,
            initialValue: newSearchCriterias.allFields ?? undefined,
            config: undefined,
            configList: [],
            param: undefined,
            paramList: [],
            optionTable: undefined,
            isMultipleSearch: false,
            maxLength: undefined
        });

        setFilterFields(updatedFilterFields);
    }, [userSettings, props.cumulSearchInfos, props.filterFields]);
    // handle cancelled or closed item

    const statusScope = filterFields.find((obj: any) => obj.name === 'status')?.config ?? null;

    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => ({
            link: props.dataModel.fieldsInfo[key].link,
            name: key.replace(/{/g, '_').replace(/}/g, '')
        }));
    //#endregion

    // #region links generation
    const renderLink = (text: string, record: any, dataIndex: string) => {
        // retrieve the column data index
        const linkObject = linkFields.find((item: any) => item.name === dataIndex);
        if (!linkObject?.link) return text;
        const suffix = linkObject.link.substring(linkObject.link.lastIndexOf('/') + 1);
        //handle case where the suffix is at the end of a chain of characters
        const recordKey = Object.keys(record).find((key) => key.endsWith(suffix));
        const link = `${linkObject.link.replace(`/${suffix}`, '')}/${record[recordKey!]}`;
        const completeLink = `${process.env.NEXT_PUBLIC_WMS_URL}/${
            router.locale !== 'en-US' ? router.locale + '/' : ''
        }${link}`;
        if (linkObject) {
            return <Link href={completeLink}>{text}</Link>;
        }
        return text;
    };

    const columnWithLinks = allColumns?.map((e: any) => {
        // if the column is in linkFields.name too, do the following
        const linkObject = linkFields.find((item: any) => item.name === e.dataIndex);

        return linkObject
            ? {
                  ...e,
                  render: (text: any, record: any) => renderLink(text, record, e.dataIndex),
                  dataIndex: e.dataIndex
              }
            : e;
    });

    const render = (text: any) =>
        text === true ? (
            <CheckCircleOutlined style={{ color: 'green' }} />
        ) : text === false ? (
            <CloseSquareOutlined style={{ color: 'red' }} />
        ) : isString(text) && isStringDateTime(text) ? (
            formatUTCLocaleDateTime(text, router.locale)
        ) : isString(text) && isStringDate(text) ? (
            formatUTCLocaleDate(text, router.locale)
        ) : (
            text
        );
    const newTableColumns = columnWithLinks?.map((e: any) =>
        e.render ? e : (e = { ...e, render: render })
    );

    // #endregion

    // #region WITHOUT CLOSED ITEMS
    const [isWithoutClosed, setIsWithoutClosed] = useState<boolean>(false);
    const btnName = t('actions:without-closed-cancel-items');

    function addForcedFilter() {
        setAdvancedFilters((prev: any) => {
            if (
                prev
                    .map((item: any) => item.filter[0].field.status)
                    .some((status: any) => status === 2000 || status === 1005 || status === 1600)
            ) {
                const newAdvancedFilters = prev.filter(
                    (item: any) =>
                        item.filter[0].field.status !== 2000 &&
                        item.filter[0].field.status !== 1005 &&
                        item.filter[0].field.status !== 1600
                );
                handleUserSettings(
                    null,
                    null,
                    defaultPagination,
                    newAdvancedFilters,
                    selectCase,
                    selectJoker,
                    null
                );
                setIsWithoutClosed(false);
                return newAdvancedFilters;
            } else {
                const newAdvancedFilters = [
                    ...prev,
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 2000 } }] },
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 1005 } }] },
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 1600 } }] }
                ];
                handleUserSettings(
                    null,
                    null,
                    defaultPagination,
                    newAdvancedFilters,
                    selectCase,
                    selectJoker,
                    null
                );
                setIsWithoutClosed(true);
                return newAdvancedFilters;
            }
        });
    }

    // #endregion

    // #region DELETE MUTATION
    const createMovement = async (dataToCreateMovement: any) => {
        const executeFunctionQuery = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        let executeFunctionVariables = {
            functionName: 'create_movements',
            event: {
                input: {
                    content: dataToCreateMovement.content,
                    type: 'delete',
                    lastTransactionId: deleteResult.transactionId
                }
            }
        };

        const executeFunctionResult = await graphqlRequestClient.request(
            executeFunctionQuery,
            executeFunctionVariables
        );
    };
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(props.dataModel.endpoints.delete, null, props.isCreateAMovement);

    useEffect(() => {
        if (props.triggerDelete && props.triggerDelete.idToDelete) {
            const deletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Delete
            );
            if (!deletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callDelete(props.triggerDelete.idToDelete);
                props.triggerDelete.setIdToDelete(undefined);
            }
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
            if (props.setSuccessDeleteResult) props.setSuccessDeleteResult(deleteResult);
            if (props.isCreateAMovement) {
                try {
                    createMovement(props.dataToCreateMovement);
                } catch (error) {
                    console.error('Error creating movement:', error);
                    showError(t('messages:error-creating-movement'));
                }
            }
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
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callSoftDelete(props.triggerSoftDelete.idToDisable);
                props.triggerSoftDelete.setIdToDisable(undefined);
            }
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
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callReopen({
                    id: props.triggerReopen.reopenInfo.id,
                    input: { status: props.triggerReopen.reopenInfo.status }
                });
                props.triggerReopen.setReopenInfo(undefined);
            }
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

    // #region PRIORITY CHANGE MUTATION

    useEffect(() => {
        if (props.triggerPriorityChange?.orderingField) {
            setSort([{ field: props.triggerPriorityChange.orderingField, ascending: true }]);
        }
    }, [props.triggerPriorityChange]);

    useEffect(() => {
        if (
            props.triggerPriorityChange &&
            props.triggerPriorityChange.id &&
            data?.[props.dataModel.endpoints.list]?.results?.length > 0
        ) {
            const updateWithOrder = gql`
                mutation executeFunction($id: String!) {
                    executeFunction(
                        functionName: "reorder_priority"
                        event: {
                            input: {
                                ids: $id
                                tableName: "${props.dataModel.resolverName.charAt(0).toLowerCase() + props.dataModel.resolverName.slice(1)}"
                                orderingField: "${props.triggerPriorityChange.orderingField}"
                                operation: "update"
                                parentId: "${props.triggerPriorityChange.parentId}"
                                newOrder: ${props.triggerPriorityChange.newOrder}
                            }
                        }
                    ) {
                        status
                        output
                    }
                }
            `;
            graphqlRequestClient
                .request(updateWithOrder, {
                    id: props.triggerPriorityChange.id
                })
                .then((result: any) => {
                    if (result.executeFunction.status === 'ERROR') {
                        showError(result.executeFunction.output);
                    } else if (
                        result.executeFunction.status === 'OK' &&
                        result.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${result.executeFunction.output.output.code}`));
                        console.log('Backend_message', result.executeFunction.output.output);
                    } else {
                        console.log('Priority change successful');
                        reloadData();
                    }
                    props.triggerPriorityChange.setId({
                        id: null,
                        newOrder: null
                    });
                })
                .catch((error: any) => {
                    console.error('Error during priority change:', error);
                    showError(t('messages:error-priority-change'));
                    props.triggerPriorityChange.setId({
                        id: null,
                        newOrder: null
                    });
                });
        }
    }, [props.triggerPriorityChange]);

    // #endregion

    // #region SEARCH OPERATIONS

    if (props.searchable) {
        useEffect(() => {
            if (userSettings && userSettings.valueJson?.filterParameters) {
                setSelectCase(userSettings.valueJson.filterParameters.selectCase ?? []);
                setSelectJoker(userSettings.valueJson.filterParameters.selectJoker ?? []);
            }
            if (userSettings && userSettings.valueJson?.advancedFilters) {
                setAdvancedFilters(userSettings.valueJson.advancedFilters ?? []);
                if (
                    userSettings.valueJson.advancedFilters
                        .map((item: any) => item.filter[0].field.status)
                        .some(
                            (status: any) => status === 2000 || status === 1005 || status === 1600
                        )
                ) {
                    setIsWithoutClosed(true);
                }
            }
            if (userSettings && userSettings.valueJson?.subOptions) {
                setAllSubOptions(userSettings.valueJson.subOptions ?? {});
            }
        }, []);
        showBadge = true;
    }

    const [search, setSearch] = useState(searchCriterias);
    const [searchWithParams, setSearchWithParams] = useState<any>({});
    const [allSubOptions, setAllSubOptions] = useState<any>([]);

    useEffect(() => {
        if (filterFields.length === 0) {
            return;
        }
        if (filterFields.length > 0 && !resetForm) {
            const newSearchCriterias: any = searchCriterias ?? {};
            filterFields.forEach((field: any) => {
                if (field.initialValue !== undefined && field.initialValue !== null) {
                    if (field.isMultipleSearch) {
                        newSearchCriterias[field.name] = Array.isArray(field.initialValue)
                            ? field.initialValue
                            : [field.initialValue];
                    } else {
                        newSearchCriterias[field.name] = field.initialValue;
                    }
                }
            });
            setSearch(newSearchCriterias);
        }
    }, [filterFields]);

    // Transform some search fields for better display in the CumulSearch screen
    if (props.cumulSearchInfos && 'handlingUnit_Category' in search) {
        const HUCParameters = parameters?.filter(
            (param: any) => param.scope === 'handling_unit_category'
        );

        const paramTexts = search?.handlingUnit_Category?.map((key: any) => {
            const found = HUCParameters?.find(
                (param: any) => parseInt(param.code) === parseInt(key)
            );
            return found.translation[`${filterLanguage}`] || found.value;
        });

        const transformed = {
            handlingUnit_Category: Array.isArray(paramTexts) ? paramTexts.join(' / ') : paramTexts
        };
        props.cumulSearchInfos.data = transformed;
    }

    // #endregion

    // #region Search Drawer

    useEffect(() => {
        let searchWithParamsInfos: { [key: string]: any } = {};

        Object.entries(search).forEach(([key, value]) => {
            let filterParams = '';
            if (selectCase.includes(key)) {
                filterParams = filterParams + '^';
            }
            if (selectJoker.includes(key)) {
                filterParams = filterParams + '%';
            }
            if (filterParams !== '') {
                searchWithParamsInfos[key] = [filterParams, value];
            } else {
                searchWithParamsInfos[key] =
                    Array.isArray(value) && value.length === 1 ? value[0] : value;
            }
        });

        setSearchWithParams(searchWithParamsInfos);
    }, [search, selectCase, selectJoker]);

    const [formSearch] = Form.useForm();
    const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);
    let allFieldsInitialValue: any = userSettings?.valueJson?.filter?.allFields ?? undefined;

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                const searchValues = formSearch.getFieldsValue(true);
                const newSearchValues = {
                    ...searchValues,
                    ...searchCriterias
                };

                showBadge = false;
                let savedFilters: any = {};
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
                    const allSubOptionsFiltered = allSubOptions
                        .map((item: any) => {
                            const itemKey = Object.keys(item)[0];
                            if (savedFilters[itemKey] && item[itemKey]) {
                                return {
                                    ...item,
                                    [itemKey]: item[itemKey].filter((option: any) =>
                                        savedFilters[itemKey].includes(option.key)
                                    )
                                };
                            }
                            return null;
                        })
                        .filter(Boolean);

                    handleUserSettings(
                        savedFilters,
                        null,
                        defaultPagination,
                        [],
                        selectCase,
                        selectJoker,
                        allSubOptionsFiltered
                    );
                    if (Object.keys(savedFilters).length > 0) {
                        showBadge = true;
                    }
                }
                setIsSearchDrawerOpen(false);
            })
            .catch((err: any) => {
                console.log('Error validating form:', err);
                showError(t('errors:DB-000111'));
            });
    };

    function isSelectCaseExptions() {
        // because they are not in the resolver of the dictionary manageur
        if (router.pathname.includes('roles') || router.pathname.includes('warehouse-workers')) {
            return true;
        } else {
            return false;
        }
    }

    function drawerProps() {
        return {
            size: 450,
            isOpen: isSearchDrawerOpen,
            setIsOpen: setIsSearchDrawerOpen,
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
                    setAllSubOptions={setAllSubOptions}
                    handleSubmit={handleSubmit}
                    resetForm={resetForm}
                    allFieldsInitialValue={allFieldsInitialValue ?? undefined}
                    selectCase={!isSelectCaseExptions() ? selectCase : undefined}
                    setSelectCase={!isSelectCaseExptions() ? setSelectCase : undefined}
                    selectJoker={!isSelectCaseExptions() ? selectJoker : undefined}
                    setSelectJoker={!isSelectCaseExptions() ? setSelectJoker : undefined}
                />
            ),
            onCancel: () => handleReset(),
            onComfirm: () => handleSubmit()
        };
    }

    const handleReset = () => {
        console.log('handleReset called');
        handleUserSettings({}, null, defaultPagination, [], [], [], []);
        setIsWithoutClosed(false);
        setAdvancedFilters([]);
        setSelectCase([]);
        setSelectJoker([]);
        formSearch.resetFields();
        // Reset search criteria to empty object if no search criteria is provided
        !searchCriterias ? setSearch({}) : setSearch({ ...searchCriterias });
        allFieldsInitialValue = undefined;
        resetForm = true;
        for (const obj of filterFields) {
            obj.initialValue = undefined;
        }
        setIsSearchDrawerOpen(false);
    };

    // #endregion

    // #region Columns Drawer

    const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState<boolean>(false);

    const handleColumnReset = () => {
        setAllColumns(initialAllColumns);
        handleUserSettings(
            null,
            null,
            pagination,
            null,
            undefined,
            undefined,
            null,
            initialAllColumns,
            null
        );
        setIsColumnDrawerOpen(false);
    };

    const handleColumnSave = () => {
        handleUserSettings(
            null,
            null,
            pagination,
            null,
            undefined,
            undefined,
            null,
            allColumns,
            null
        );
        setIsColumnDrawerOpen(false);
    };

    function columnDrawerProps() {
        return {
            size: 700,
            isOpen: isColumnDrawerOpen,
            setIsOpen: setIsColumnDrawerOpen,
            type: 'OPEN_DRAWER',
            title: 'actions:filter',
            cancelButtonTitle: 'actions:reset',
            cancelButton: true,
            comfirmButtonTitle: 'actions:save',
            comfirmButton: true,
            content: (
                <TableFilter allColumnsInfos={allColumns} setAllColumnsInfos={setAllColumns} />
            ),
            onComfirm: () => handleColumnSave(),
            onCancel: () => handleColumnReset()
        } as any;
    }

    // #endregion

    // #region USELIST
    const functions = props.functions ?? null;
    const {
        isLoading,
        data,
        reload: reloadData
    } = useList(
        props.dataModel.resolverName,
        props.dataModel.endpoints.list,
        listFields,
        searchWithParams,
        adjustedPagination,
        pagination.itemsPerPage,
        sort,
        router.locale,
        defaultModelSort,
        advancedFilters,
        functions
    );

    useEffect(() => {
        // Time delay before reloading data
        const delay = 1000;
        const debouncedReload = debounce(() => {
            reloadData();
        }, delay);

        debouncedReload();

        // Cleanup function to cancel the debounce on unmount or dependency change
        return () => {
            debouncedReload.cancel();
        };
    }, [searchWithParams, props.refetch, router.locale]);

    // #endregion

    // #region EXPORT DATA

    const { isLoading: exportLoading, result: exportResult, mutate } = useExport();

    const exportData = () => {
        const exportFields = [
            ...props.extraColumns,
            ...(newTableColumns?.filter((col) => col.key !== 'actions') || [])
        ]
            .filter((col) => col.hidden !== true)
            .map((col) => {
                if (!col?.dataIndex?.includes('_')) {
                    return col?.dataIndex;
                }
                return (
                    col?.dataIndex?.split('_').join('{') +
                    '}'.repeat(col?.dataIndex?.split('_').slice(1).length || 0)
                );
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

        // Creation of columnNames for export
        let columnNames: any = {};
        const titleIndexMap: Record<string, number> = {};

        // Base from allColumns
        allColumns.forEach((col, index) => {
            const translatedTitle = t(col.title);
            columnNames[index] = {
                title: translatedTitle,
                keys: [col.dataIndex]
            };
            titleIndexMap[translatedTitle] = index;
        });

        // Add keys from rows
        if (rows && rows.results && rows.results.length > 0) {
            rows.results.forEach((result) => {
                Object.keys(result).forEach((key) => {
                    let title = `d:${key}`;
                    if (displayedLabels && key in displayedLabels) {
                        title = `d:${displayedLabels[key]}`;
                    }
                    const translatedTitle = t(title);

                    // If the value is an array, we skip it for now
                    if (!Array.isArray(result[key])) {
                        // If the key is similar to an existing columnName, we add it to that column keys
                        const similarColumns: any[] = Object.values(columnNames).filter(
                            (column: any) =>
                                column.keys.some((cnKey: any) => cnKey.startsWith(key + '_'))
                        );

                        if (similarColumns.length > 0) {
                            for (const col of similarColumns) {
                                col.keys.push(key);
                            }
                        }
                        // If title does not exist in allColumns, we create it
                        else {
                            const newIndex = Object.keys(columnNames).length;
                            columnNames[newIndex] = { title: translatedTitle, keys: [key] };
                            titleIndexMap[translatedTitle] = newIndex;
                        }
                    }
                });
            });
        }

        // Sort by index if needed
        const orderedColumns = Object.keys(columnNames)
            .sort((a, b) => Number(a) - Number(b))
            .map((idx) => columnNames[Number(idx)]);

        columnNames = orderedColumns;

        const base64QueryString = Buffer.from(exportQueryString, 'binary').toString('base64');
        mutate({
            graphqlRequest: base64QueryString,
            format: ExportFormat.Xlsx,
            separator: ';',
            columnNames
            // compression
        });
    };

    const stickyActions = {
        export: {
            active: props.dataModel.endpoints.export ? true : false,
            function: () => exportData()
        }
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

    // #region onChangePagination
    const onChangePagination = useCallback(
        (currentPage: number, itemsPerPage: number) => {
            // Re fetch data for new current page or items per page
            handleUserSettings(null, null, {
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
            setPagination({
                total: rows?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        },
        [setPagination, rows]
    );

    // #endregion

    // #region arrange data for dynamic display
    useEffect(() => {
        if (data) {
            // if data is refreshed
            let listData: any = data?.[props.dataModel.endpoints.list];
            if (props.isDragAndDroppable && listData && listData['results'].length === 0) {
                if (listData.count === 0) {
                    listData = {
                        count: 1,
                        itemsPerPage: 10,
                        totalPages: 1,
                        results: props.defaultEmptyList
                    };
                }
            }
            if (props.cumulSearchInfos && listData && listData['results']) {
                listData.results = listData?.results.map((item: any) => ({
                    ...item,
                    ...(props.cumulSearchInfos.data || {})
                }));
            }
            if (listData && listData['results']) {
                const result_list: Array<any> = [];
                switch (props.dataModel.modelName) {
                    case 'RecordHistoryDetail':
                        if (listData['results'].length > 0) {
                            let sort_index = 1;

                            listData['results'] = listData['results'].map((item: any) => {
                                return flatten(item);
                            });

                            let source = listData['results'][0];
                            Object.keys(source).forEach((column_name: any) => {
                                // Customize title name
                                let title = `d:${column_name}`;
                                if (displayedLabels && column_name in displayedLabels) {
                                    title = `d:${displayedLabels[column_name]}`;
                                }

                                // Specific to record_history
                                const prefixesToCheck = ['d:objectAfter_', 'd:objectBefore_'];
                                // Check if the title starts with any of the prefixes
                                for (const prefix of prefixesToCheck) {
                                    if (title.startsWith(prefix)) {
                                        title = title.slice(prefix.length);
                                        break;
                                    }
                                }

                                const isHidden =
                                    hiddenListFields.includes(column_name) ||
                                    excludedListFields.includes(column_name);

                                const row_data: any = {
                                    title: title,
                                    dataIndex: column_name,
                                    key: column_name,
                                    showSorterTooltip: false,
                                    hidden: isHidden,
                                    fixed: false
                                };

                                // if column is in sortable list add sorter property
                                if (
                                    sortableFields.length > 0 &&
                                    sortableFields.includes(column_name)
                                ) {
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
                                if (
                                    !excludedListFields ||
                                    !excludedListFields.includes(row_data.key)
                                ) {
                                    result_list.push(row_data);
                                }
                            });
                        }

                        // set columns to use in table
                        setAllColumns(initialState ?? result_list);
                        setInitialAllColumns(result_list);
                        if (props.setData) props.setData(listData.results);
                        //this is to initialize and keep data at a given time on parent component
                        if (props.setInitialData) props.setInitialData(listData.results);
                        if (
                            !listData?.results[0]?.objectBefore_id &&
                            !listData?.results[0]?.objectAfter_id
                        ) {
                            setRows({
                                ...rows,
                                results: [],
                                count: rows?.count ?? 0,
                                itemsPerPage: rows?.itemsPerPage ?? 10,
                                totalPages: rows?.totalPages ?? 1
                            });
                        } else {
                            setRows(listData);
                        }

                        setPagination({
                            ...pagination,
                            current: adjustedPagination,
                            total: listData['count']
                        });

                        break;
                    case 'RuleVersionConfigDetail':
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
                                const flatItem = flatten(item);
                                return { ...flatItem, listDataCount: listData.count };
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
                                newElementListData['listDataCount'] = result['listDataCount'];

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
                                    const value = inputFields
                                        .slice(1, inputFields.length - 1)
                                        .join('_');
                                    const operator =
                                        operatorField[typeField + '_' + value + '_operator'];
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
                                                ((typeField.endsWith('In')
                                                    ? t('d:input')
                                                    : t('d:output')) +
                                                    ')'),
                                            dataIndex: typeField + '_' + value,
                                            key: typeField + '_' + value,
                                            showSorterTooltip: false
                                        });
                                    }

                                    function isNotNull(value: any) {
                                        if (
                                            value === 'null' ||
                                            value === null ||
                                            value === undefined
                                        ) {
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
                                return null;
                            });
                            listData.results = newListData;
                            setRows(listData);
                            setAllColumns(initialState ?? new_column_list);
                            setInitialAllColumns(result_list);
                        }

                        if (props.setData) props.setData(listData.results);
                        setPagination({
                            ...pagination,
                            total: listData['count']
                        });

                        break;
                    case 'RuleVersionDetailIn':
                    case 'RuleVersionDetailOut':
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

                                const isHidden =
                                    hiddenListFields.includes(column_name) ||
                                    excludedListFields.includes(column_name);

                                const row_data: any = {
                                    title: title,
                                    dataIndex: column_name,
                                    key: column_name,
                                    showSorterTooltip: false,
                                    hidden: isHidden,
                                    fixed: false
                                };

                                // if column is in sortable list add sorter property
                                if (
                                    sortableFields.length > 0 &&
                                    sortableFields.includes(column_name)
                                ) {
                                    row_data['sorter'] = { multiple: sort_index };
                                    row_data['showSorterTooltip'] = false;
                                    sort_index++;
                                }

                                // Hide fields if there is any hidden selected.
                                if (
                                    !excludedListFields ||
                                    !excludedListFields.includes(row_data.key)
                                ) {
                                    result_list.push(row_data);
                                }
                            });
                        }

                        // Specific to display columns for input/output parameters of json fields
                        const new_result_list: any[] = [
                            {
                                title: 'd:parameterName',
                                dataIndex: 'parameterName',
                                key: 'parameterName',
                                showSorterTooltip: false
                            },
                            {
                                title: 'd:description',
                                dataIndex: 'description',
                                key: 'description',
                                showSorterTooltip: false
                            },
                            {
                                title: 'd:type',
                                dataIndex: 'type',
                                key: 'type',
                                showSorterTooltip: false
                            },
                            {
                                title: 'd:validationRule',
                                dataIndex: 'validationRule',
                                key: 'validationRule',
                                showSorterTooltip: false
                            }
                        ];

                        // set columns to use in table
                        setAllColumns(initialState ?? new_result_list);
                        setInitialAllColumns(new_result_list);
                        // Specific to display columns for input/output parameters of json fields
                        let newElementListData: any = {};
                        const newListData: any[] = [];

                        if (
                            listData &&
                            result_list[0].dataIndex !== 'ruleConfigurationIn' &&
                            result_list[0].dataIndex !== 'ruleConfigurationOut'
                        ) {
                            Object.keys(listData.results[0]).forEach((key: any) => {
                                newElementListData = {};
                                const subKeys = key.split('_');
                                const keyWithoutPrefixAndSuffix = subKeys.slice(1, -1).join('_');
                                const lastElement =
                                    newListData.length > 0
                                        ? newListData[newListData.length - 1]
                                        : null;

                                if (
                                    lastElement &&
                                    lastElement['parameterName'] === keyWithoutPrefixAndSuffix
                                ) {
                                    lastElement[subKeys[subKeys.length - 1]] =
                                        listData.results[0][key];
                                } else {
                                    newElementListData['parameterName'] = keyWithoutPrefixAndSuffix;
                                    newElementListData[subKeys[subKeys.length - 1]] =
                                        listData.results[0][key];
                                    newListData.push(newElementListData);
                                }
                            });
                            listData.results = newListData;
                        }

                        // set data for the table
                        setRows(listData);
                        if (props.setData) props.setData(listData.results);
                        setPagination({
                            ...pagination,
                            total: listData['count']
                        });

                        break;
                    default:
                        let sort_index = 1;
                        if (listData['results'].length > 0) {
                            listData['results'] = listData['results'].map((item: any) => {
                                const flatItem = flatten(item);
                                Object.keys(flatItem).map((key: string) => {
                                    if (key.startsWith('functionSum')) {
                                        const newKey = key.split('_');
                                        Object.assign(flatItem, {
                                            [newKey[0]]: flatItem[key]
                                        });
                                        delete flatItem[key];
                                    }
                                });
                                return { ...flatItem, listDataCount: listData.count };
                            });
                            if (props.isDragAndDroppable && !props.isDragSource) {
                                listData['results'] = listData['results'].map(
                                    (item: any, index: number) => {
                                        return { ...item, index };
                                    }
                                );
                                if (
                                    listData['results'].filter((e: any) => e.id !== 'null')
                                        .length !== 0
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

                            const isHidden =
                                hiddenListFields.includes(column_name) ||
                                excludedListFields.includes(column_name);

                            const row_data: any = {
                                title: title,
                                dataIndex: column_name,
                                key: column_name,
                                showSorterTooltip: false,
                                hidden: isHidden,
                                fixed: false
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

                        // set columns to use in table
                        setAllColumns(initialState ?? result_list);
                        setInitialAllColumns(result_list);

                        // set data for the table
                        setRows(listData);
                        if (props.setData) props.setData(listData.results);
                        //this is to initialize and keep data at a given time on parent component
                        if (props.setInitialData) props.setInitialData(listData.results);

                        setPagination({
                            ...pagination,
                            current: adjustedPagination,
                            total: listData['count']
                        });

                        break;
                }
            }
            setFirstLoad(false);
        } else {
            deleteUserSettings();
        }
    }, [
        data,
        userSettings,
        props.dataModel.endpoints.list,
        props?.cumulSearchInfos?.columns,
        props.isDragAndDroppable,
        props.isDragSource
    ]);

    // #endregion

    // #region TABLE CHANGE HANDLER (sort)

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
            setAllColumns((prevColumns: any) => {
                const updatedColumns = prevColumns.map((col: any) => {
                    const sorterForCol = tmp_array.find((s) => s.field === col.dataIndex);
                    if (sorterForCol) {
                        return {
                            ...col,
                            defaultSortOrder: sorterForCol.ascending ? 'ascend' : 'descend'
                        };
                    } else {
                        const { defaultSortOrder, ...rest } = col;
                        return rest;
                    }
                });
                handleUserSettings(
                    null,
                    tmp_array,
                    pagination,
                    null,
                    selectCase,
                    selectJoker,
                    null,
                    updatedColumns
                );
                return updatedColumns;
            });
        }
    };

    const badgeCount = filterFields.reduce((count: number, field: any) => {
        if (field.type && field.initialValue) {
            return count + 1; // Count all fields with a type
        }
        return count;
    }, 0);

    // #endregion

    // #region Date formatting
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

    // #region merge columns

    const mergedColumns = [
        ...props.actionColumns,
        ...props.extraColumns,
        ...(newTableColumns?.filter((col) => col.key !== 'actions') || []),
        ...(props?.cumulSearchInfos?.columns ? props.cumulSearchInfos.columns : [])
    ];

    useEffect(() => {
        if (initialAllColumns && initialAllColumns.length > allColumns.length) {
            setAllColumns((prevColumns) => {
                const updatedColumns = [...prevColumns];
                initialAllColumns.forEach((initialCol) => {
                    if (!prevColumns.some((col) => col.key === initialCol.key)) {
                        updatedColumns.push(initialCol);
                    }
                });
                return updatedColumns;
            });
        }
    }, [initialAllColumns]);

    // #endregion

    // #region TAGS

    function tagFormatter(searchForTags: any) {
        const filterInfos = Object.keys(searchForTags)
            .map((key) => {
                if (
                    searchForTags[key] === undefined ||
                    searchForTags[key] === null ||
                    Object.keys(searchCriterias).includes(key)
                ) {
                    return null;
                }
                if (filterFields.find((field: any) => field.name === key)?.config) {
                    const listOfConfig = filterFields.find(
                        (field: any) => field.name === key
                    )?.configList;

                    const textDisplay =
                        listOfConfig
                            ?.filter((item: any) =>
                                searchForTags[key]?.includes(
                                    isNumeric(item.code) ? parseInt(item.code) : item.code
                                )
                            )
                            .map((item: any) => {
                                return {
                                    text: item?.translation?.[`${filterLanguage}`] || item.value,
                                    code: item.code
                                };
                            }) || searchForTags[key];
                    return { [key]: textDisplay };
                }
                if (filterFields.find((field: any) => field.name === key)?.param) {
                    const listOfParam = filterFields.find(
                        (field: any) => field.name === key
                    )?.paramList;

                    const textDisplay =
                        listOfParam
                            ?.filter((item: any) =>
                                searchForTags[key]?.includes(parseInt(item.code))
                            )
                            .map((item: any) => {
                                return {
                                    text: item?.translation?.[`${filterLanguage}`] || item.value,
                                    code: item.code
                                };
                            }) || searchForTags[key];
                    return { [key]: textDisplay };
                }
                if (
                    allSubOptions?.find(
                        (item: any) =>
                            item[filterFields.find((field: any) => field.name === key)?.name]
                    )
                ) {
                    const textDisplay = allSubOptions
                        ?.find(
                            (item: any) =>
                                item[filterFields.find((field: any) => field.name === key)?.name]
                        )
                        ?.[
                            filterFields.find((field: any) => field.name === key)?.name
                        ].filter((item: any) => searchForTags[key].includes(item.key));
                    return { [key]: textDisplay };
                }
                if (filterFields.find((field: any) => field.name === key)?.type === 7) {
                    // if type is 7, it means it is a date field
                    return {
                        [key]: searchForTags[key].map((date: any) => ({
                            text: date ? new Date(date).toLocaleString(router.locale) : '*',
                            code: date
                        }))
                    };
                }
                return { [key]: searchForTags[key] };
            })
            .filter(Boolean);

        function findDisplayNameForKey(key: string) {
            const field = filterFields.find((field: any) => field.name === key);
            return field.displayName || field.name;
        }

        let allTags: any[] = [];
        filterInfos.forEach((item: any) => {
            Object.keys(item).forEach((key) => {
                if (
                    item[key] !== undefined &&
                    item[key] !== null &&
                    Array.isArray(item[key]) &&
                    filterFields.find((field: any) => field.name === key)?.type !== 7
                ) {
                    item[key].forEach((value: any) => {
                        if (value !== undefined && value !== null) {
                            allTags.push({
                                key: findDisplayNameForKey(key),
                                value: value,
                                originalKey: key
                            });
                        }
                    });
                } else if (
                    item[key] !== undefined &&
                    item[key] !== null &&
                    Array.isArray(item[key]) &&
                    filterFields.find((field: any) => field.name === key)?.type === 7
                ) {
                    allTags.push({
                        key: findDisplayNameForKey(key),
                        value: {
                            text: (item[key][0]?.text ?? '-') + ' -> ' + (item[key][1]?.text ?? '-')
                        },
                        originalKey: key
                    });
                } else if (item[key] !== undefined && item[key] !== null) {
                    allTags.push({
                        key: findDisplayNameForKey(key),
                        value: { text: item[key] },
                        originalKey: key
                    });
                }
            });
        });
        return allTags;
    }

    let tagColor: any = [];
    const palette = [
        'blue',
        'green',
        'orange',
        'purple',
        'red',
        'cyan',
        'magenta',
        'gold',
        'lime',
        'volcano'
    ];
    tagFormatter(search).map((info, index) => {
        if (tagColor.some((color: string) => Object.keys(color)[0] === info.key)) {
            return tagColor.find((color: string) => Object.keys(color)[0] === info.key)[info.key];
        } else {
            tagColor.push({
                [info.key]: palette[tagColor.length]
            });
            return palette[tagColor.length];
        }
    });

    function onTagClose(e: any, info: any) {
        e.preventDefault();
        let newSearch = { ...search };
        if (
            Array.isArray(search[info.originalKey]) &&
            filterFields.find((field: any) => field.name === info.originalKey)?.type !== 7
        ) {
            newSearch[info.originalKey] = search[info.originalKey].filter((item: any) => {
                let infoToCompare = info.value.code ?? info.value.key ?? info.value;
                if (typeof infoToCompare !== 'string') {
                    infoToCompare = JSON.stringify(infoToCompare);
                }
                if (typeof item !== 'string') {
                    item = JSON.stringify(item);
                }
                return item !== infoToCompare;
            });
            if (newSearch[info.originalKey].length === 0) {
                delete newSearch[info.originalKey];
            }
            formSearch.setFieldsValue({
                [info.originalKey]: newSearch[info.originalKey]
            });
        } else {
            delete newSearch[info.originalKey];
            formSearch.setFieldsValue({
                [info.originalKey]: null
            });
        }
        handleUserSettings(newSearch, null, defaultPagination, null, selectCase, selectJoker, null);
    }

    // #endregion

    // #region Drag and Drop management
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

    // #region adjust columns for resizable

    const dataSource = props.isDragAndDroppable
        ? props.items!.map((item: any, index: number) => ({
              ...item,
              key: item.id,
              index
          }))
        : (rows?.results ?? []);

    const insideScroll = { x: '100%', y: 400 };
    const insideScrollPagination = { pageSize: dataSource.length, showSizeChanger: false };

    // 1. Add state for column widths
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        setColumnWidths(() =>
            mergedColumns?.reduce(
                (acc, col) => {
                    Object.keys(userSettings?.valueJson?.columnsWidth ?? {}).forEach((key) => {
                        if (key === col.key) {
                            acc[col.key] = userSettings.valueJson.columnsWidth[key];
                        }
                    });
                    if (!acc[col.key]) {
                        acc[col.key] = typeof col.width === 'number' ? col.width : 160;
                    }
                    return acc;
                },
                {} as { [key: string]: number }
            )
        );
    }, [allColumns]); // Reset column widths when userSettings or dataModel changes
    // 2. Custom header cell for resizing
    const ResizableTitle = (props: any) => {
        const { onResize, width, ...restProps } = props;
        return (
            <th
                {...restProps}
                style={{
                    ...restProps.style,
                    width,
                    position: 'relative' // Ensure relative positioning for the resizer
                }}
            >
                {restProps.children}
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        cursor: 'col-resize',
                        userSelect: 'none',
                        zIndex: 1,
                        background: 'transparent'
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startWidth = width;
                        const onMouseMove = (moveEvent: MouseEvent) => {
                            const newWidth = Math.max(startWidth + moveEvent.clientX - startX, 50);
                            onResize(newWidth);
                        };
                        const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    }}
                />
            </th>
        );
    };

    // 3. Update columns with resizable header
    const resizableColumns = mergedColumns.map((col: any) => ({
        ...col,
        width: columnWidths[col.key], // width is a number
        onHeaderCell: (column: any) => ({
            width: columnWidths[col.key],
            onResize: (newWidth: number) => {
                setColumnWidths((prev) => ({
                    ...prev,
                    [col.key]: Math.max(newWidth, 80) // minimum width
                }));
                handleUserSettings(
                    null,
                    null,
                    pagination,
                    null,
                    undefined,
                    undefined,
                    null,
                    allColumns,
                    {
                        ...columnWidths,
                        [col.key]: Math.max(newWidth, 80)
                    }
                );
            }
        })
    }));

    // 4. Add custom components for header cell
    const tableComponents = {
        ...draggableComponent,
        header: {
            cell: ResizableTitle
        }
    };

    // Ensure scroll.x is always set for fixed table layout
    const tableScroll = props.isIndependentScrollable ? insideScroll : { x: '100%' };

    // #endregion

    // #region return
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
                        <DrawerItems {...drawerProps()} />
                        <DrawerItems {...columnDrawerProps()} />
                        {props.headerData ? (
                            <HeaderContent
                                title={props.headerData.title}
                                routes={props.headerData.routes}
                                onBack={
                                    props.headerData.onBackRoute
                                        ? () => router.push(props.headerData!.onBackRoute!)
                                        : undefined
                                }
                                tags={
                                    !firstLoad && rows?.results ? (
                                        props.searchable && (
                                            <>
                                                {tagFormatter(search).map((info, index) => {
                                                    return (
                                                        <Tag
                                                            key={info.key + index}
                                                            style={{ margin: '2px' }}
                                                            color={(() => {
                                                                return tagColor.find(
                                                                    (color: string) =>
                                                                        Object.keys(color)[0] ===
                                                                        info.key
                                                                )[info.key];
                                                            })()}
                                                            closable
                                                            onClose={(e) => onTagClose(e, info)}
                                                        >
                                                            {`${info.key}: ${info.value.text ?? info.value}`}
                                                        </Tag>
                                                    );
                                                })}
                                            </>
                                        )
                                    ) : (
                                        <Spin />
                                    )
                                }
                                actionsRight={
                                    <Space>
                                        {statusScope ? (
                                            <Button
                                                onClick={() => {
                                                    addForcedFilter();
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
                                                        count={badgeCount}
                                                        color="blue"
                                                    >
                                                        <Button
                                                            icon={<SearchOutlined />}
                                                            onClick={() => {
                                                                setIsSearchDrawerOpen(true);
                                                            }}
                                                        />
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        icon={<SearchOutlined />}
                                                        onClick={() => {
                                                            setIsSearchDrawerOpen(true);
                                                        }}
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
                            <>
                                {props.searchable &&
                                    (showBadge ? (
                                        <div
                                            style={{
                                                float: 'right',
                                                marginTop: -120,
                                                marginRight: 20
                                            }}
                                        >
                                            <Badge size="default" count={badgeCount} color="blue">
                                                <Button
                                                    icon={<SearchOutlined />}
                                                    onClick={() => {
                                                        formSearch.resetFields();
                                                        setIsSearchDrawerOpen(true);
                                                    }}
                                                />
                                            </Badge>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                float: 'right',
                                                marginRight: 20,
                                                marginTop: -120
                                            }}
                                        >
                                            <Button
                                                icon={<SearchOutlined />}
                                                onClick={() => {
                                                    formSearch.resetFields();
                                                    setIsSearchDrawerOpen(true);
                                                }}
                                            />
                                        </div>
                                    ))}
                            </>
                        )}
                        {!firstLoad && rows?.results ? (
                            <>
                                {props.actionButtons?.actionsComponent}
                                <PageTableContentWrapper>
                                    <DrawerItems {...drawerProps()} />
                                    <WrapperStickyActions>
                                        <Space direction="vertical">
                                            {props.columnFilter && (
                                                <Button
                                                    type="primary"
                                                    icon={<SettingOutlined />}
                                                    onClick={() => setIsColumnDrawerOpen(true)}
                                                />
                                            )}
                                            {stickyActions?.export.active && (
                                                <Button
                                                    icon={<FileExcelOutlined />}
                                                    onClick={stickyActions?.export.function}
                                                />
                                            )}
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={() => {
                                                    reloadData();
                                                }}
                                            />
                                        </Space>
                                    </WrapperStickyActions>
                                    <Table
                                        rowKey="id"
                                        dataSource={dataSource}
                                        scroll={tableScroll}
                                        size="small"
                                        loading={isLoading}
                                        onChange={handleTableChange}
                                        pagination={
                                            props.isIndependentScrollable
                                                ? insideScrollPagination
                                                : pagination && {
                                                      position: ['bottomRight'],
                                                      total: pagination.total,
                                                      current: pagination.current,
                                                      pageSize: pagination.itemsPerPage,
                                                      showSizeChanger: true,
                                                      showTotal: (total, range) =>
                                                          `${range[0]}-${range[1]} sur ${total} éléments`,
                                                      onChange: (page, pageSize) => {
                                                          onChangePagination(page, pageSize);
                                                      }
                                                  }
                                        }
                                        locale={{
                                            emptyText: !isLoading ? (
                                                <Empty
                                                    description={
                                                        <span>{t('messages:no-data')}</span>
                                                    }
                                                />
                                            ) : null
                                        }}
                                        rowSelection={
                                            props.checkbox ? props.rowSelection : undefined
                                        }
                                        components={tableComponents}
                                        tableLayout="fixed"
                                    >
                                        {resizableColumns.map((c) => {
                                            return (
                                                <Column
                                                    hidden={c.hidden}
                                                    title={() => {
                                                        return (
                                                            <>
                                                                {typeof c.title === 'string'
                                                                    ? t(c.title)
                                                                    : c.title}
                                                                {sort && (
                                                                    <span
                                                                        style={{
                                                                            position: 'absolute',
                                                                            right: 0,
                                                                            top: 0,
                                                                            transform:
                                                                                'translateY(-10px) translateX(22.5px)',
                                                                            color: '#1677ff',
                                                                            opacity: 0.5,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            height: '100%'
                                                                        }}
                                                                    >
                                                                        {
                                                                            sort
                                                                                .map(
                                                                                    (
                                                                                        sortInfo: any,
                                                                                        index: number
                                                                                    ) => {
                                                                                        if (
                                                                                            sortInfo.field ===
                                                                                            c.key
                                                                                        ) {
                                                                                            return `${index + 1}`;
                                                                                        }
                                                                                        return null;
                                                                                    }
                                                                                )
                                                                                .filter(
                                                                                    (item: any) =>
                                                                                        item !==
                                                                                        null
                                                                                )[0]
                                                                        }
                                                                    </span>
                                                                )}
                                                            </>
                                                        );
                                                    }}
                                                    dataIndex={c.dataIndex}
                                                    key={c.key}
                                                    fixed={c.fixed}
                                                    width={c.width} // width is a number
                                                    sorter={c.sorter}
                                                    showSorterTooltip={c.showSorterTooltip}
                                                    render={c.render}
                                                    defaultSortOrder={c.defaultSortOrder}
                                                    onHeaderCell={c.onHeaderCell}
                                                />
                                            );
                                        })}
                                    </Table>
                                </PageTableContentWrapper>
                            </>
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
    // #endregion
};

ListComponent.displayName = 'ListWithFilter';
export { ListComponent };
