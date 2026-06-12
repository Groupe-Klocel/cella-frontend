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
    SettingOutlined,
    UploadOutlined
} from '@ant-design/icons';
import {
    TableFilter,
    ContentSpin,
    DraggableItem,
    HeaderContent,
    DrawerItems,
    PageTableContentWrapper,
    WrapperStickyActions,
    StyledTooltip
} from '@components';
import { useExportData } from './listComponentSubModule/export';
import { useListRequests } from './listComponentSubModule/requests';
import type { InputRef, TableProps, TableColumnType } from 'antd';
import {
    Space,
    Form,
    Button,
    Empty,
    Alert,
    Badge,
    Tag,
    Spin,
    Table,
    Typography,
    Input
} from 'antd';
import { isNumeric, useTranslationWithFallback as useTranslation } from '@helpers';
import dayjs from 'dayjs';
import {
    DataQueryType,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    getLanguageCode,
    getModesFromPermissions,
    orderByFormater,
    PaginationType,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    useList,
    flatten,
    queryString,
    formatUTCLocaleDateTime,
    isStringDateTime,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListFilters } from './submodules/ListFiltersV2';
import { FormDataType, ModelType } from 'models/ModelsV2';
import { ExportFormat, ModeEnum, Table as tableList } from 'generated/graphql';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import _, { debounce, isString } from 'lodash';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAiContextStore } from 'context/CellaBotContext';
import { FilterDropdownProps } from 'antd/es/table/interface';
import StringInput from 'components/common/smart/Form/MainInputs/StringInput';
import { FormGroupV3 } from './submodules/FormGroupV3';
import { AdvancedFilters, AdvancedFilterTags } from './listComponentSubModule/AdvancedFilters';
import { useImportData } from './listComponentSubModule/import';
import {
    RANGE_PRESET_TODAY,
    RANGE_PRESET_TOMORROW
} from 'components/common/smart/Form/MainInputs/RangePickerInput';

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
    defaultSubOptions?: any;
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
    noDBSave?: boolean;
    excelImport?: {
        functionName: string;
        titleLabel?: any;
    };
}

export interface newPaginationType {
    current?: number;
    itemsPerPage: number;
}

interface Item {
    key: string;
    language: string;
    type: string;
    category: string;
    code: string;
    value: string;
    id?: string | null;
}

type DataIndex = keyof Item;

interface DataType {
    id: string;
    language: string;
    type: string;
    category: string;
    code: string;
    value: string;
    warehouseId?: string | null;
    created?: any;
    createdBy?: string;
    modified?: any;
    modifiedBy?: string;
    warehouse?: {
        id: string;
        name: string;
    };
}

const { Column } = Table;
const { Link } = Typography;

const ListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const filteredLanguage = getLanguageCode(router);
    const state = useAppState();
    const resolverName = props.dataModel.moreInfos
        ? `${props.dataModel.resolverName}${props.dataModel.moreInfos}`
        : props.dataModel.resolverName;
    const userSettings = state?.userSettings?.find((item: any) => {
        return (
            `${resolverName}${router.pathname}` === item.code ||
            `${resolverName}${router.pathname}/${props.headerData?.title}` === item.code
        );
    });
    const configs = state?.configs;
    const parameters = state?.parameters;
    const dispatch = useAppDispatch();

    const [firstLoad, setFirstLoad] = useState<boolean>(true);
    const [rows, setRows] = useState<DataQueryType>();
    const [advancedFilters, setAdvancedFilters] = useState<any>([
        ...(userSettings?.valueJson?.advancedFilters ?? []),
        ...(props?.advancedFilters ?? [])
    ]);
    const [editingAdvFilter, setEditingAdvFilter] = useState<any>(null);
    useEffect(() => {
        setAdvancedFilters([
            ...(userSettings?.valueJson?.advancedFilters ?? []),
            ...(props?.advancedFilters ?? [])
        ]);
    }, [props.advancedFilters, userSettings]);

    // Tell the AI assistant (CellaBot) what this list shows: entity, active filters and the
    // current row selection (selection is best-effort — owned by the page via props.rowSelection).
    // Skip when this list is a sub-list embedded on a detail/edit page (route contains "[id]"):
    // there the ItemDetailComponent owns the primary entity, and a sub-list (e.g. articleLuBarcode
    // on an article detail) must not overwrite it. Using router.pathname (not query.id) avoids the
    // initial render race where query.id is not yet populated.
    const isEmbeddedSubList = router.pathname.includes('[id]');
    const { patchAiContext } = useAiContextStore();
    useEffect(() => {
        if (isEmbeddedSubList) return;
        patchAiContext({
            entityType: props.dataModel.tableName,
            filters: advancedFilters,
            selection: props.rowSelection?.selectedRowKeys ?? undefined
        });
    }, [
        isEmbeddedSubList,
        advancedFilters,
        props.rowSelection?.selectedRowKeys,
        props.dataModel.tableName,
        patchAiContext
    ]);

    let initialState = userSettings?.valueJson?.allColumnsInfos;
    const [allColumns, setAllColumns] = useState<any[]>(initialState);
    const [initialAllColumns, setInitialAllColumns] = useState<any[]>(initialState);
    const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState<boolean>(false);

    // Function to convert plural words to singular based on Table enum keys
    const convertTableNamePluralToSingular = (text: string): string => {
        // Get table enum keys
        const tableEnumKeys = new Set(
            Object.keys(tableList).map((key) => {
                // Convert PascalCase to camelCase
                return key.charAt(0).toLowerCase() + key.slice(1);
            })
        );

        return text.replace(/\b(\w+)s\b/g, (match, word) => {
            // Check if the word without 's' exists in our table enum keys
            if (tableEnumKeys.has(word)) {
                return word;
            }
            return match;
        });
    };

    // manage empty props
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [],
        columnFilter: true
    };
    props = { ...defaultProps, ...props };
    // SearchForm in cookies
    const searchCriterias: any = {
        ...(userSettings?.valueJson?.filter ?? undefined),
        ...props.searchCriteria
    };

    function resolveDynamicDateFilters(filters: any): any {
        if (!filters) return filters;
        const result: any = {};
        for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value) && value.length === 2) {
                const [start] = value as any[];
                if (start === RANGE_PRESET_TODAY) {
                    result[key] = [
                        dayjs().startOf('day').toISOString(),
                        dayjs().endOf('day').toISOString()
                    ];
                } else if (start === RANGE_PRESET_TOMORROW) {
                    result[key] = [
                        dayjs().add(1, 'day').startOf('day').toISOString(),
                        dayjs().add(1, 'day').endOf('day').toISOString()
                    ];
                } else {
                    result[key] = value;
                }
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    const resolvedSearchCriterias = resolveDynamicDateFilters(searchCriterias);

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

    // #endregion

    // #region create / update and delete user settings

    async function updateUserSettings(
        newFilter: any,
        newSorting: any,
        newPagination?: newPaginationType,
        newAdvancedFilters?: any,
        newSubOptions?: any,
        newAllColumnsInfos?: any,
        newColumnWidths?: any,
        newState?: any
    ) {
        const settings =
            newState?.userSettings?.find((item: any) => {
                return (
                    `${resolverName}${router.pathname}` === item.code ||
                    `${resolverName}${router.pathname}/${props.headerData?.title}` === item.code
                );
            }) ?? userSettings; // use latest from state

        const propAdvFiltersSet = new Set(
            (props.advancedFilters ?? []).map((f: any) => JSON.stringify(f))
        );
        const filtersToSave = (newAdvancedFilters ?? advancedFilters).filter(
            (f: any) => !propAdvFiltersSet.has(JSON.stringify(f))
        );

        const newsSettings = {
            ...settings,
            code: `${resolverName}${router.pathname}/${props.headerData?.title}`,
            valueJson: {
                ...settings?.valueJson,
                filter: newFilter ?? settings?.valueJson?.filter,
                advancedFilters: filtersToSave,
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
            input: { code: newsSettings.code, valueJson: newsSettings.valueJson }
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
        newSubOptions?: any,
        newAllColumnsInfos?: any,
        newColumnWidths?: any,
        newState?: any
    ) {
        if (newPagination && newPagination.current) {
            newPagination.current = 1;
        }
        const newsSettings = {
            code: `${resolverName}${router.pathname}/${props.headerData?.title}`,
            warehouseWorkerId: state.user.id,
            valueJson: {
                filter: newFilter,
                advancedFilters: (newAdvancedFilters ?? advancedFilters).filter(
                    (f: any) =>
                        !(props.advancedFilters ?? []).some(
                            (pf: any) => JSON.stringify(pf) === JSON.stringify(f)
                        )
                ),
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
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    newState
                );
            },
            100 // ms, adjust as needed
        )
    ).current;

    const debouncedCreateUsersSettings = useRef(
        debounce(
            (
                newFilter: any,
                newSorting: any,
                newPagination?: newPaginationType,
                advancedFilters?: any,
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
                    newSubOptions,
                    newAllColumnsInfos,
                    newColumnWidths,
                    newState
                );
            },
            100
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
            newSubOptions?: any,
            newAllColumnsInfos?: any,
            newColumnWidths?: any
        ) => {
            if (props.noDBSave) {
                // If noDBSave is true, we only update the local state without saving to DB
                dispatch({
                    type: 'SWITCH_USER_SETTINGS',
                    userSettings: [
                        ...state?.userSettings.filter((item: any) => {
                            return (
                                `${resolverName}${router.pathname}` !== item.code &&
                                `${resolverName}${router.pathname}/${props.headerData?.title}` !==
                                    item.code
                            );
                        }),
                        {
                            code: `${resolverName}${router.pathname}/${props.headerData?.title}`,
                            valueJson: {
                                filter: newFilter,
                                advancedFilters: newAdvancedFilters ?? advancedFilters,
                                sorter: newSorter ?? props.sortDefault ?? null,
                                pagination: newPagination ?? defaultPagination,
                                subOptions: newSubOptions ?? undefined,
                                allColumnsInfos: newAllColumnsInfos ?? allColumns ?? undefined,
                                columnsWidth: newColumnWidths ?? {}
                            }
                        } as any
                    ]
                });
                return;
            }
            // Always use the latest userSettings from state
            if (userSettings) {
                debouncedUpdateUserSettings(
                    newFilter,
                    newSorter,
                    newPagination,
                    newAdvancedFilters ?? advancedFilters,
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
    const filterFields: any = useMemo(() => {
        const fields = Object.entries(props.dataModel.fieldsInfo)
            .filter(
                ([key, value]) =>
                    value.searchingFormat !== null ||
                    Object.keys(props.searchCriteria).includes(key)
            )
            .map(([key, value]) => ({
                displayName: t(
                    `d:${(value.displayName ?? key).replace(/{/g, '_').replace(/}/g, '')}`
                ),
                name: convertTableNamePluralToSingular(key)
                    .replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`)
                    .replace(/}/g, ''),
                type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
                maxLength: value.maxLength ?? undefined,
                config: value.config ?? undefined,
                configList: configs.filter((config: any) => config.scope === value.config),
                param: value.param ?? undefined,
                paramList: parameters.filter((param: any) => param.scope === value.param),
                optionTable: value.optionTable ? JSON.parse(value.optionTable) : undefined,
                initialValue:
                    searchCriterias[
                        key
                            .replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`)
                            .replace(/}/g, '')
                    ] ?? undefined
            }));

        fields.unshift({
            name: 'allFields',
            displayName: t('d:all-fields-search'),
            type: FormDataType.String,
            initialValue: searchCriterias.allFields ?? undefined,
            config: undefined,
            configList: [],
            param: undefined,
            paramList: [],
            optionTable: undefined,
            maxLength: undefined
        });

        return fields;
    }, [userSettings]);

    const statusScope = filterFields.find((obj: any) => obj.name === 'status')?.config ?? null;

    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => ({
            link: props.dataModel.fieldsInfo[key].link,
            name: key.replace(/{/g, '_').replace(/}/g, '')
        }));

    const fieldsToHighlight = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].highlight !== undefined)
        .map((key) => ({
            highlightCondition: props.dataModel.fieldsInfo[key].highlight,
            name: key.replace(/{/g, '_').replace(/}/g, '')
        }));

    //#endregion

    // #region links generation
    const renderLink = (text: string, record: any, dataIndex: string) => {
        let shouldHighlight = false;
        let tooltipText = t('messages:field-requires-attention');

        // Check if field should be highlighted
        if (fieldsToHighlight.map((field) => field.name).includes(dataIndex)) {
            const highlightField = fieldsToHighlight.find(
                (field) => field.name === dataIndex
            )?.highlightCondition;
            if (highlightField) {
                const grossRecord = data?.[props.dataModel.endpoints.list].results.find(
                    (item: any) => {
                        return item.id === record.id;
                    }
                );

                // Check if grossRecord exists before executing the condition
                if (grossRecord) {
                    try {
                        // Expect object format with condition and optional tooltip
                        const condition = highlightField.condition;
                        if (highlightField.tooltip) {
                            tooltipText = t(`messages:${highlightField.tooltip}`);
                        }

                        // Use Function constructor to create a function from the string condition
                        const conditionFunction = new Function(
                            'grossRecord',
                            `return ${condition};`
                        );
                        // Execute the function with the current record
                        shouldHighlight = conditionFunction(grossRecord);
                    } catch (error) {
                        console.error('Error evaluating highlight condition:', error);
                    }
                }
            }
        }

        // retrieve the column data index for link
        const linkObject = linkFields.find((item: any) => item.name === dataIndex);

        if (linkObject?.link) {
            const suffix = linkObject.link.substring(linkObject.link.lastIndexOf('/') + 1);
            //handle case where the suffix is at the end of a chain of characters
            const recordKey = Object.keys(record).find((key) => key.endsWith(suffix));
            const link = `${linkObject.link.replace(`/${suffix}`, '')}/${record[recordKey!]}`;
            const completeLink = `${process.env.NEXT_PUBLIC_WMS_URL}/${
                router.locale !== 'en-US' ? router.locale + '/' : ''
            }${link}`;

            // Return link with or without highlight tag
            if (shouldHighlight) {
                return (
                    <Link href={completeLink}>
                        <StyledTooltip title={tooltipText}>
                            <Tag color="red">{text}</Tag>
                        </StyledTooltip>
                    </Link>
                );
            } else {
                return <Link href={completeLink}>{text}</Link>;
            }
        }

        // No link but should highlight
        if (shouldHighlight) {
            return (
                <StyledTooltip title={tooltipText}>
                    <Tag color="red">{text}</Tag>
                </StyledTooltip>
            );
        }

        // Default return
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
            : {
                  ...e,
                  render: (text: any) =>
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
                      )
              };
    });

    // #endregion

    // #region WITHOUT CLOSED ITEMS
    const [isWithoutClosed, setIsWithoutClosed] = useState<boolean>(
        userSettings?.valueJson?.advancedFilters
            .map((item: any) => item.filter[0].field.status)
            .some((status: any) => status === 2000 || status === 1005 || status === 1600) ?? false
    );
    const btnName = t('actions:without-closed-cancel-items');

    function addForcedFilter() {
        if (
            advancedFilters
                .map((item: any) => item.filter[0].field.status)
                .some((status: any) => status === 2000 || status === 1005 || status === 1600)
        ) {
            const newAdvancedFilters = advancedFilters.filter(
                (item: any) =>
                    item.filter[0].field.status !== 2000 &&
                    item.filter[0].field.status !== 1005 &&
                    item.filter[0].field.status !== 1600
            );
            handleUserSettings(null, null, defaultPagination, newAdvancedFilters, null);
            setIsWithoutClosed(false);
            return newAdvancedFilters;
        } else {
            const newAdvancedFilters = [
                ...advancedFilters,
                { filter: [{ searchType: 'DIFFERENT', field: { status: 2000 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { status: 1005 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { status: 1600 } }] }
            ];
            handleUserSettings(null, null, defaultPagination, newAdvancedFilters, null);
            setIsWithoutClosed(true);
            return newAdvancedFilters;
        }
    }

    // #endregion

    // #region SEARCH OPERATIONS
    const allSubOptionsRef = useRef<any>(userSettings?.valueJson?.subOptions ?? []);
    const allSubOptions = allSubOptionsRef.current;

    function setAllSubOptions(newSubOptions: any) {
        // Support both direct values and callback functions like setState
        // Using a ref avoids re-renders (which close column filter dropdowns) while
        // still making the latest value available on the next render triggered by state changes.
        if (typeof newSubOptions === 'function') {
            allSubOptionsRef.current = newSubOptions(allSubOptionsRef.current);
        } else {
            allSubOptionsRef.current = newSubOptions;
        }
    }

    // Build the complete subOptions for the CURRENT state, covering BOTH filter systems:
    // - searchFilters: the search-form / column filters (saved as valueJson.filter)
    // - advFilters: the advanced filters (saved as valueJson.advancedFilters)
    // Every save path must use this. Computing only one system (as the old getAdvSubOptions did)
    // overwrites and silently drops the other system's subOptions. Falls back to the saved
    // subOptions for fields whose dropdown wasn't loaded this session.
    function buildSubOptions(searchFilters: any, advFilters: any[]): any[] {
        const saved = userSettings?.valueJson?.subOptions ?? [];
        const lookup = (fieldName: string) =>
            allSubOptionsRef.current.find((item: any) => Object.keys(item)[0] === fieldName) ??
            saved.find((item: any) => Object.keys(item)[0] === fieldName);

        const result: any[] = [];
        const seen = new Set<string>();

        const addField = (fieldName: string, value: any) => {
            if (seen.has(fieldName)) return;
            const entry = lookup(fieldName);
            if (!entry) return;
            const valuesToKeep = Array.isArray(value) ? value : [value];
            result.push({
                [fieldName]: entry[fieldName].filter((opt: any) =>
                    valuesToKeep.some((v: any) => String(opt.key) === String(v))
                )
            });
            seen.add(fieldName);
        };

        for (const fieldName of Object.keys(searchFilters ?? {})) {
            addField(fieldName, searchFilters[fieldName]);
        }
        for (const f of advFilters ?? []) {
            const fieldName = Object.keys(f.filter[0].field)[0];
            addField(fieldName, f.filter[0].field[fieldName]);
        }

        return result;
    }

    // #endregion

    // #region Search Drawer
    const [formSearch] = Form.useForm();
    // Initialize form with userSettings default values
    useEffect(() => {
        if (userSettings?.valueJson?.filter) {
            Object.keys(userSettings.valueJson.filter).forEach((key) => {
                const value = userSettings.valueJson.filter[key];
                let newValue = value;
                if (Array.isArray(value)) {
                    newValue = value.map((item: any, index: number) => {
                        return isString(item) && isStringDateTime(item) ? dayjs(item) : item;
                    });
                }
                formSearch.setFieldsValue({ [key]: newValue });
            });
            // formSearch.setFieldsValue(userSettings.valueJson.filter);
        }
    }, [userSettings, formSearch]);

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                const searchValues = formSearch.getFieldsValue(true);
                if (formSearch.isFieldsTouched()) {
                    const newSearchValues = {
                        ...searchCriterias,
                        ...searchValues
                    };

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

                        const allSubOptionsFiltered = buildSubOptions(
                            savedFilters,
                            advancedFilters
                        );

                        handleUserSettings(
                            savedFilters,
                            null,
                            defaultPagination,
                            null,
                            allSubOptionsFiltered
                        );
                    }
                }
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

    // #endregion

    // #region Columns Drawer (handlers)

    const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState<boolean>(false);

    const handleColumnReset = () => {
        setAllColumns(initialAllColumns);
        handleUserSettings(null, null, pagination, null, null, initialAllColumns, null);
        setIsColumnDrawerOpen(false);
    };

    const handleColumnSave = () => {
        handleUserSettings(null, null, pagination, null, null, allColumns, null);
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
        resolvedSearchCriterias,
        pagination.current,
        pagination.itemsPerPage,
        sort,
        filteredLanguage,
        defaultModelSort,
        advancedFilters,
        functions
    );

    useEffect(() => {
        // Time delay before reloading data
        const delay = 100;
        const debouncedReload = debounce(() => {
            reloadData();
        }, delay);

        debouncedReload();

        // Cleanup function to cancel the debounce on unmount or dependency change
        return () => {
            debouncedReload.cancel();
        };
    }, [props.refetch, router.locale, advancedFilters, pagination.current]);

    // #endregion

    // #region REQUEST HOOKS
    // function DELETE, SOFT DELETE, REOPEN, PRIORITY CHANGE and CREATE A MOVEMENT
    const {} = useListRequests({
        dataModel: props.dataModel,
        triggerDelete: props.triggerDelete,
        triggerSoftDelete: props.triggerSoftDelete,
        triggerReopen: props.triggerReopen,
        triggerPriorityChange: props.triggerPriorityChange,
        isCreateAMovement: props.isCreateAMovement,
        dataToCreateMovement: props.dataToCreateMovement,
        setSuccessDeleteResult: props.setSuccessDeleteResult,
        reloadData,
        listFields,
        permissions: permissions || [],
        data,
        setSort
    });
    // #endregion

    // #region EXPORT DATA
    const { stickyActions } = useExportData({
        props,
        newTableColumns: columnWithLinks,
        searchCriterias,
        pagination,
        sort,
        filteredLanguage,
        defaultModelSort,
        allColumns,
        rows,
        displayedLabels
    });
    // #endregion

    // #region IMPORT DATA
    const { displayImportModal } = useImportData({
        functionName: props.excelImport?.functionName || '',
        titleLabel: props.excelImport?.titleLabel,
        onCancel: () => setIsExcelImportModalOpen(false),
        onSuccess: () => {
            setIsExcelImportModalOpen(false);
            reloadData();
        }
    });

    // #endregion

    // #region onChangePagination
    const onChangePagination = (currentPage: number, itemsPerPage: number) => {
        // Re fetch data for new current page or items per page
        if (itemsPerPage !== pagination.itemsPerPage) {
            handleUserSettings(null, null, {
                itemsPerPage: itemsPerPage
            });
        } else {
            setPagination({
                ...pagination,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        }
    };

    // #endregion

    // #region arrange data for dynamic display
    useEffect(() => {
        if (data) {
            // if data is refreshed
            let listData: any = data[props.dataModel.endpoints.list]
                ? JSON.parse(JSON.stringify(data[props.dataModel.endpoints.list]))
                : undefined;
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
                        } else {
                            setRows({
                                ...rows,
                                results: [],
                                count: rows?.count ?? 0,
                                itemsPerPage: rows?.itemsPerPage ?? 10,
                                totalPages: rows?.totalPages ?? 1
                            });
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

                            // Helper function to get the correct filter field name
                            const getFilterFieldName = (dataIndex: string): string => {
                                // Check if this field has a corresponding filter field definition
                                const filterField = filterFields.find((field: any) => {
                                    const fieldNameVariations = [
                                        dataIndex,
                                        dataIndex.replace(/_/g, ''),
                                        dataIndex.replace(/_([a-z])/g, (match, letter) =>
                                            letter.toUpperCase()
                                        )
                                    ];
                                    return fieldNameVariations.includes(field.name);
                                });

                                if (filterField) {
                                    return filterField.name;
                                }

                                // For linked fields, check if we need to use the ID field
                                const originalFieldKey = Object.keys(
                                    props.dataModel.fieldsInfo
                                ).find((key) => {
                                    const normalizedKey = key.replace(/{/g, '_').replace(/}/g, '');
                                    return normalizedKey === dataIndex;
                                });

                                if (originalFieldKey) {
                                    // Common patterns for ID fields
                                    const idFieldCandidates = [
                                        `${dataIndex}Id`,
                                        `${dataIndex.replace('_name', '')}Id`,
                                        `${dataIndex.replace('_Name', '')}Id`,
                                        dataIndex.replace(/(_name|_Name)$/, 'Id'),
                                        `${dataIndex.replace('Text', '')}`
                                    ];

                                    for (const candidate of idFieldCandidates) {
                                        const candidateWithLetterCase = candidate.replace(
                                            /_([a-z])/g,
                                            (match, letter) => '_' + letter.toUpperCase()
                                        );
                                        const idFilterField = filterFields.find(
                                            (field: any) => field.name === candidateWithLetterCase
                                        );
                                        if (idFilterField) {
                                            return candidateWithLetterCase;
                                        }
                                    }
                                }

                                // Fallback to original dataIndex
                                return dataIndex;
                            };

                            // Reverse conversion: handlingUnit_Location_BlockId → handlingUnit{location{blockId}}
                            const convertFilterNameToFieldsInfoKey = (name: string): string => {
                                let nestingCount = 0;
                                const result = name.replace(/_([A-Z])/g, (_, char) => {
                                    nestingCount++;
                                    return '{' + char.toLowerCase();
                                });
                                return result + '}'.repeat(nestingCount);
                            };

                            const getColumnSearchProps = (
                                dataIndex: DataIndex
                            ): TableColumnType<DataType> => {
                                const filterFieldName = getFilterFieldName(dataIndex);
                                const fieldsInfoKey =
                                    convertFilterNameToFieldsInfoKey(filterFieldName);
                                const filterField = filterFields.find(
                                    (field: any) => field.name === filterFieldName
                                );

                                if (
                                    !props.dataModel.fieldsInfo[fieldsInfoKey] ||
                                    !filterField?.type
                                ) {
                                    return {};
                                }

                                return {
                                    filterDropdown: () => (
                                        <div
                                            style={{
                                                padding: 8,
                                                minWidth: '280px',
                                                maxWidth: '280px'
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        >
                                            <FormGroupV3
                                                form={formSearch}
                                                item={{
                                                    name: filterFieldName,
                                                    displayName:
                                                        filterField?.displayName ??
                                                        t(`d:${dataIndex}`),
                                                    type: filterField?.type,
                                                    maxLength: filterField?.maxLength,
                                                    config: filterField?.config,
                                                    configList: filterField?.configList,
                                                    param: filterField?.param,
                                                    paramList: filterField?.paramList,
                                                    optionTable: filterField?.optionTable
                                                }}
                                                defaultSubOptions={props.defaultSubOptions}
                                                handleSubmit={handleSubmit}
                                                setAllSubOptions={setAllSubOptions}
                                                filtersParameters={!isSelectCaseExptions() && true}
                                            />
                                        </div>
                                    ),
                                    filterOnClose: true,
                                    onFilterDropdownOpenChange: (visible) => {
                                        if (!visible) {
                                            // Auto-submit when dropdown closes
                                            handleSubmit();
                                        }
                                    },
                                    filterIcon: () => {
                                        const filtered =
                                            !!searchCriterias[filterFieldName] &&
                                            props.searchCriteria[filterFieldName] !==
                                                searchCriterias[filterFieldName];

                                        // Count active filters based on field type
                                        let activeFiltersCount = 0;
                                        if (searchCriterias[filterFieldName]) {
                                            switch (filterField?.type) {
                                                case 1:
                                                    activeFiltersCount = 1;
                                                    break;
                                                case 2:
                                                case 4:
                                                    activeFiltersCount =
                                                        searchCriterias[filterFieldName].length;
                                                    break;
                                                default:
                                                    activeFiltersCount = searchCriterias[
                                                        filterFieldName
                                                    ]
                                                        ? 1
                                                        : 0;
                                                    break;
                                            }
                                        }

                                        return (
                                            <>
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: 0,
                                                        transform: 'translateY(-12px)',
                                                        color: 'orange',
                                                        opacity: filtered ? 0.8 : 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        height: '100%'
                                                    }}
                                                >
                                                    {activeFiltersCount}
                                                </span>
                                                <SearchOutlined
                                                    style={{
                                                        color: filtered ? 'orange' : undefined
                                                    }}
                                                />
                                            </>
                                        );
                                    }
                                };
                            };

                            const row_data: any = {
                                title: title,
                                dataIndex: column_name,
                                key: column_name,
                                showSorterTooltip: false,
                                hidden: isHidden,
                                fixed: false,
                                highlightCondition:
                                    props.dataModel.fieldsInfo[column_name]?.highlight ?? undefined,
                                sorter: { multiple: index + 1 },
                                defaultSortOrder: sort?.find(
                                    (sorter: any) => sorter.field === column_name
                                )
                                    ? sort.find((sorter: any) => sorter.field === column_name)
                                          .ascending
                                        ? 'ascend'
                                        : 'descend'
                                    : undefined,
                                ...(props.searchable ? getColumnSearchProps(column_name) : {}),
                                filterFieldKey: props.searchable
                                    ? getFilterFieldName(column_name)
                                    : undefined
                            };

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
                        if (initialState) {
                            setAllColumns(
                                result_list
                                    .map((col) => {
                                        const initialCol = initialState.find(
                                            (initial: any) => initial.key === col.key
                                        );
                                        return initialCol ? { ...col, ...initialCol } : col;
                                    })
                                    .sort((a, b) => {
                                        const indexA = a?.sorter?.multiple || 0;
                                        const indexB = b?.sorter?.multiple || 0;
                                        return indexA - indexB;
                                    })
                            );
                        } else {
                            setAllColumns(result_list);
                        }
                        setInitialAllColumns(result_list);

                        // set data for the table
                        setRows(listData);
                        if (props.setData) props.setData(listData.results);
                        //this is to initialize and keep data at a given time on parent component
                        if (props.setInitialData) props.setInitialData(listData.results);

                        setPagination({
                            ...pagination,
                            total: listData['count']
                        });

                        break;
                }
                setFirstLoad(false);
            }
        } else {
            deleteUserSettings();
        }
    }, [data]);

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
                handleUserSettings(null, tmp_array, pagination, null, null, updatedColumns);
                return updatedColumns;
            });
        }
    };

    // #region merge columns

    const mergedColumns = [
        ...props.actionColumns,
        ...props.extraColumns,
        ...(columnWithLinks?.filter((col) => col.key !== 'actions') || [])
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
                    Object.keys(props.searchCriteria).includes(key)
                ) {
                    return null;
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
                                    text: item?.translation?.[`${filteredLanguage}`] || item.value,
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
                                    text: item?.translation?.[`${filteredLanguage}`] || item.value,
                                    code: item.code
                                };
                            }) || searchForTags[key];
                    return { [key]: textDisplay };
                }
                if (filterFields.find((field: any) => field.name === key)?.type === 7) {
                    // if type is 7, it means it is a date field
                    const firstVal = Array.isArray(searchForTags[key])
                        ? searchForTags[key][0]
                        : null;
                    if (firstVal === RANGE_PRESET_TODAY || firstVal === RANGE_PRESET_TOMORROW) {
                        return {
                            [key]: [{ text: t(`common:${firstVal}`), code: firstVal }]
                        };
                    }
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
        const listOfParamsKeys = ['%', '^', '%^', '^%', ''];
        filterInfos.forEach((item: any) => {
            Object.keys(item).forEach((key) => {
                if (
                    item[key] !== undefined &&
                    item[key] !== null &&
                    Array.isArray(item[key]) &&
                    filterFields.find((field: any) => field.name === key)?.type !== 7
                ) {
                    item[key].forEach((value: any) => {
                        if (
                            value !== undefined &&
                            value !== null &&
                            !listOfParamsKeys.includes(value)
                        ) {
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
                            text:
                                (item[key][0]?.text ?? '-') +
                                (item[key][1]?.text ? ' -> ' + item[key][1]?.text : '')
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
        'cyan',
        'red',
        'magenta',
        'gold',
        'lime',
        'volcano'
    ];
    tagFormatter(searchCriterias).map((info, index) => {
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
        let newSearch = { ...searchCriterias };
        if (
            Array.isArray(searchCriterias[info.originalKey]) &&
            filterFields.find((field: any) => field.name === info.originalKey)?.type !== 7 &&
            filterFields.find((field: any) => field.name === info.originalKey)?.type !== 1
        ) {
            newSearch[info.originalKey] = searchCriterias[info.originalKey].filter((item: any) => {
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
        handleUserSettings(newSearch, null, defaultPagination, null, null);
    }

    function clearAllFilters(e: any) {
        e.preventDefault();
        // Clear all search criteria except those in props.searchCriteria (which are permanent)
        const newSearch = { ...props.searchCriteria };

        // Reset form values
        formSearch.resetFields();

        // Set form values to props.searchCriteria if any
        if (Object.keys(props.searchCriteria).length > 0) {
            formSearch.setFieldsValue(props.searchCriteria);
        }

        const defaultAdvancedFilters = props?.advancedFilters ?? [];

        handleUserSettings(
            newSearch,
            null,
            defaultPagination,
            defaultAdvancedFilters,
            [],
            [],
            null
        );
    }

    // #endregion

    // #region adjust columns for resizable
    // 1. Add state for column widths
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
    const thRefsMap = useRef<Map<string, HTMLElement>>(new Map());

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
        const { onResize, width, colKey, ...restProps } = props;
        return (
            <th
                ref={(el) => {
                    if (el && colKey) thRefsMap.current.set(colKey, el);
                    else if (!el && colKey) thRefsMap.current.delete(colKey);
                }}
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
            colKey: col.filterFieldKey ?? col.key,
            width: columnWidths[col.key],
            onResize: (newWidth: number) => {
                setColumnWidths((prev) => ({
                    ...prev,
                    [col.key]: Math.max(newWidth, 80) // minimum width
                }));
                handleUserSettings(null, null, pagination, null, null, allColumns, {
                    ...columnWidths,
                    [col.key]: Math.max(newWidth, 80)
                });
            }
        })
    }));

    // 4. Add custom components for header cell
    const tableComponents = {
        header: {
            cell: ResizableTitle
        }
    };
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
                        {/* <DrawerItems {...drawerProps()} /> */}
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
                                    !firstLoad && rows ? (
                                        props.searchable && (
                                            <>
                                                {tagFormatter(searchCriterias).map(
                                                    (info, index) => {
                                                        return (
                                                            <Tag
                                                                key={info.key + index}
                                                                style={{
                                                                    margin: '2px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                color={(() => {
                                                                    return tagColor.find(
                                                                        (color: string) =>
                                                                            Object.keys(
                                                                                color
                                                                            )[0] === info.key
                                                                    )[info.key];
                                                                })()}
                                                                closable
                                                                onClose={(e) => onTagClose(e, info)}
                                                                onClick={() => {
                                                                    const th =
                                                                        thRefsMap.current.get(
                                                                            info.originalKey
                                                                        );
                                                                    if (!th) return;
                                                                    // Find the Ant Design horizontal scroll container
                                                                    let scrollEl: HTMLElement | null =
                                                                        th.parentElement;
                                                                    while (scrollEl) {
                                                                        if (
                                                                            scrollEl.scrollWidth >
                                                                                scrollEl.clientWidth &&
                                                                            scrollEl.clientWidth > 0
                                                                        )
                                                                            break;
                                                                        scrollEl =
                                                                            scrollEl.parentElement;
                                                                    }
                                                                    if (scrollEl) {
                                                                        const thRect =
                                                                            th.getBoundingClientRect();
                                                                        const containerRect =
                                                                            scrollEl.getBoundingClientRect();
                                                                        const targetScroll =
                                                                            scrollEl.scrollLeft +
                                                                            thRect.left -
                                                                            containerRect.left -
                                                                            containerRect.width /
                                                                                2 +
                                                                            th.offsetWidth / 2;
                                                                        scrollEl.scrollTo({
                                                                            left: targetScroll,
                                                                            behavior: 'smooth'
                                                                        });
                                                                    }
                                                                    setTimeout(() => {
                                                                        const trigger =
                                                                            th.querySelector(
                                                                                '[class*="filter-trigger"]'
                                                                            );
                                                                        (
                                                                            trigger as HTMLElement
                                                                        )?.click();
                                                                    }, 400);
                                                                }}
                                                            >
                                                                {`${info.key}: ${info.value.text ?? info.value}`}
                                                            </Tag>
                                                        );
                                                    }
                                                )}
                                                <AdvancedFilterTags
                                                    advancedFilters={advancedFilters}
                                                    propAdvancedFilters={props.advancedFilters}
                                                    filterFields={filterFields}
                                                    filteredLanguage={filteredLanguage}
                                                    allSubOptions={allSubOptions}
                                                    onTagClose={(filterToRemove) => {
                                                        const newFilters = JSON.parse(
                                                            JSON.stringify([...advancedFilters])
                                                        );
                                                        const index = newFilters.findIndex(
                                                            (af: any) =>
                                                                JSON.stringify(af) ===
                                                                JSON.stringify(filterToRemove)
                                                        );
                                                        if (index !== -1)
                                                            newFilters.splice(index, 1);
                                                        handleUserSettings(
                                                            null,
                                                            null,
                                                            defaultPagination,
                                                            newFilters,
                                                            buildSubOptions(
                                                                searchCriterias,
                                                                newFilters
                                                            )
                                                        );
                                                    }}
                                                    onTagEdit={(filter) =>
                                                        setEditingAdvFilter(filter)
                                                    }
                                                />
                                                {(tagFormatter(searchCriterias).length > 0 ||
                                                    advancedFilters.length -
                                                        (props?.advancedFilters?.length ?? 0) >
                                                        0) && (
                                                    <Button
                                                        key="clear-all-filters"
                                                        size="small"
                                                        danger
                                                        style={{
                                                            marginTop: '8px',
                                                            margin: '8px 85% 8px 0px'
                                                        }}
                                                        onClick={clearAllFilters}
                                                    >
                                                        {t('actions:clear-all-filters')}
                                                    </Button>
                                                )}
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
                                        {props.headerData.actionsComponent != null ? (
                                            props.headerData.actionsComponent
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                }
                            />
                        ) : null}
                        {!firstLoad && rows ? (
                            <>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        width: '100%'
                                        // maxHeight: 40
                                    }}
                                >
                                    <div>{props.actionButtons?.actionsComponent}</div>
                                    {props.searchable ? (
                                        <Space>
                                            <Form
                                                form={formSearch}
                                                layout="inline"
                                                name="control-hooks"
                                                onKeyUp={(event: any) => {
                                                    if (event.key === 'Enter') {
                                                        handleSubmit();
                                                    }
                                                }}
                                                onBlur={() => {
                                                    handleSubmit();
                                                }}
                                            >
                                                <StringInput
                                                    item={{
                                                        name: 'allFields',
                                                        displayName: t('d:all-fields-search')
                                                    }}
                                                    key={'globalSearch'}
                                                />
                                            </Form>
                                            <AdvancedFilters
                                                filterFields={filterFields}
                                                advancedFilters={advancedFilters}
                                                defaultSubOptions={props.defaultSubOptions}
                                                setAllSubOptions={setAllSubOptions}
                                                editingFilter={editingAdvFilter}
                                                onEditingClose={() => setEditingAdvFilter(null)}
                                                onFiltersChange={(newFilters) => {
                                                    handleUserSettings(
                                                        null,
                                                        null,
                                                        defaultPagination,
                                                        newFilters,
                                                        buildSubOptions(searchCriterias, newFilters)
                                                    );
                                                }}
                                            />
                                        </Space>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                                <PageTableContentWrapper>
                                    <WrapperStickyActions>
                                        <Space direction="vertical">
                                            <Button
                                                type="primary"
                                                icon={<SettingOutlined />}
                                                onClick={() => setIsColumnDrawerOpen(true)}
                                            />
                                            {props.excelImport?.functionName && (
                                                <Button
                                                    icon={<UploadOutlined />}
                                                    onClick={displayImportModal}
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
                                        dataSource={rows.results ?? []}
                                        scroll={{ x: '100%' }}
                                        sticky
                                        size="small"
                                        loading={isLoading}
                                        onChange={handleTableChange}
                                        pagination={
                                            pagination && {
                                                position: ['bottomRight'],
                                                total: pagination.total,
                                                current: pagination.current,
                                                pageSize: pagination.itemsPerPage,
                                                showSizeChanger: true,
                                                showTotal: (total, range) =>
                                                    `${range[0]}-${range[1]} sur ${total} éléments`,
                                                onChange: (page, pageSize) => {
                                                    onChangePagination(page, pageSize);
                                                },
                                                showQuickJumper:
                                                    (pagination.total ?? 0) /
                                                        pagination.itemsPerPage >
                                                    5
                                                        ? true
                                                        : false,
                                                locale: {
                                                    jump_to: t('d:jump-to'),
                                                    page: t('d:page')
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
                                                    filterDropdown={c.filterDropdown}
                                                    filterIcon={c.filterIcon}
                                                    filters={c.filters}
                                                    onFilterDropdownOpenChange={
                                                        c.onFilterDropdownOpenChange
                                                    }
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
