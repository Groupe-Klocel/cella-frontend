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
import { Table, Spin, Space, Form, Badge, Button, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseSquareOutlined, SearchOutlined } from '@ant-design/icons';
import { HeaderContent, ContentSpin, DrawerItems } from '@components';
import { ListFilters } from 'modules/Crud/submodules/ListFilters';
import { flatten, useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import {
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    DataQueryType,
    PaginationType,
    useList,
    orderByFormater,
    getModesFromPermissions
} from '@helpers';
import { ModeEnum, Table as tableList } from 'generated/graphql';
import { FormDataType, ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import {
    formatUTCLocaleDateTime,
    formatUTCLocaleDate,
    isStringDateTime,
    isStringDate
} from '@helpers';
import _, { isString } from 'lodash';
const { Link } = Typography;

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
    onBackRoute?: string;
};

export interface IListProps {
    dataModel: ModelType;
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
    checkbox?: boolean;
    rowSelection?: any;
    mode?: string;
    refetch?: boolean;
    columnFilter?: boolean;
    itemperpage?: number;
    advancedFilters?: any;
}

export interface newPaginationType {
    current: number;
    itemsPerPage: number;
}

const ListComponentV2Simplify = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const router = useRouter();
    const filterLanguage = router.locale;

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
    const searchCriterias: any = Object.keys(props.searchCriteria).reduce(
        (acc: any, key: string) => {
            if (props.searchCriteria[key] !== undefined && props.searchCriteria[key] !== null) {
                acc[key] = props.searchCriteria[key];
            }
            return acc;
        },
        {}
    );

    // #region sorter / pagination
    const sortParameter = Object.entries(props.dataModel.fieldsInfo)
        .filter(([, value]) => value.defaultSort)
        .map(([key, value]) => ({
            field: key.replace(/{/g, '_').replace(/}/g, ''),
            ascending: value.defaultSort === 'ascending'
        }));

    const [sort, setSort] = useState<any>(props.sortDefault ?? sortParameter);
    const [allColumns, setAllColumns] = useState<any[]>([]);

    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: props.itemperpage ?? DEFAULT_ITEMS_PER_PAGE
    });

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
                name: convertTableNamePluralToSingular(key)
                    .replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`)
                    .replace(/}/g, ''),
                type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
                maxLength: value.maxLength ?? undefined,
                config: value.config ?? undefined,
                param: value.param ?? undefined,
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
                name: convertTableNamePluralToSingular(key)
                    .replace(/{(.)/g, (_, char) => `_${char.toUpperCase()}`)
                    .replace(/}/g, ''),
                type: FormDataType[value.searchingFormat as keyof typeof FormDataType],
                maxLength: value.maxLength ?? undefined,
                config: value.config ?? undefined,
                param: value.param ?? undefined,
                optionTable: value.optionTable ?? undefined,
                isMultipleSearch: value.isMultipleSearch ?? undefined,
                initialValue: searchCriterias[key] ?? undefined
            }));

        updatedFilterFields.unshift({
            name: 'allFields',
            displayName: t('d:all-fields-search'),
            type: FormDataType.String,
            initialValue: searchCriterias.allFields ?? undefined,
            config: undefined,
            param: undefined,
            optionTable: undefined,
            isMultipleSearch: false,
            maxLength: undefined
        });

        setFilterFields(updatedFilterFields);
    }, []);

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
    console.log(
        'AXC - ListComponentV2Simplify.tsx - ListComponentV2Simplify - newTableColumns:',
        newTableColumns
    );

    // #endregion

    // #region WITHOUT CLOSED ITEMS
    const [isWithoutClosed, setIsWithoutClosed] = useState<boolean>(false);
    const btnName = t('actions:without-closed-cancel-items');
    const statusScope = filterFields.find((obj: any) => obj.name === 'status')?.config ?? null;

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
                setIsWithoutClosed(false);
                return newAdvancedFilters;
            } else {
                const newAdvancedFilters = [
                    ...prev,
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 2000 } }] },
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 1005 } }] },
                    { filter: [{ searchType: 'DIFFERENT', field: { status: 1600 } }] }
                ];
                setIsWithoutClosed(true);
                return newAdvancedFilters;
            }
        });
    }

    // #endregion

    // #region SEARCH OPERATIONS
    const [search, setSearch] = useState(searchCriterias);
    const [advancedFilters, setAdvancedFilters] = useState<any>(
        props.advancedFilters
            ? Array.isArray(props.advancedFilters)
                ? props.advancedFilters
                : [props.advancedFilters]
            : []
    );

    // #endregion

    // #region Search Drawer
    const [formSearch] = Form.useForm();
    const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                const searchValues = formSearch.getFieldsValue(true);
                // Clean undefined and null values
                const cleanedValues = Object.fromEntries(
                    Object.entries(searchValues).filter(
                        ([, value]) => value !== undefined && value !== null && value !== ''
                    )
                );
                setSearch(cleanedValues);
                setIsSearchDrawerOpen(false);
            })
            .catch((err: any) => {
                console.error('Form validation failed:', err);
            });
    };

    const handleReset = () => {
        formSearch.resetFields();
        setSearch({});
        setIsSearchDrawerOpen(false);
    };

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
            content: <ListFilters form={formSearch} columns={filterFields} />,
            onCancel: () => handleReset(),
            onComfirm: () => handleSubmit()
        };
    }

    // #endregion

    // #region USELIST
    const [firstLoad, setFirstLoad] = useState<boolean>(true);
    const [rows, setRows] = useState<DataQueryType>();

    let defaultModelSort = null;
    for (const key in props.dataModel.fieldsInfo) {
        if (props.dataModel.fieldsInfo[key].hasOwnProperty('defaultSort')) {
            defaultModelSort = [
                {
                    field: key.replace(/{/g, '_').replace(/}/g, ''),
                    ascending: props.dataModel.fieldsInfo[key].defaultSort === 'ascending'
                }
            ];
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
        defaultModelSort,
        advancedFilters
    );

    useEffect(() => {
        if (search) {
            reloadData();
        }
    }, [
        search,
        props.refetch,
        router.locale,
        advancedFilters,
        sort,
        pagination.current,
        pagination.itemsPerPage
    ]);

    // #endregion

    // #region onChangePagination
    const onChangePagination = useCallback(
        (currentPage: number, itemsPerPage: number) => {
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
            let listData: any = data[props.dataModel.endpoints.list]
                ? JSON.parse(JSON.stringify(data[props.dataModel.endpoints.list]))
                : undefined;

            if (listData && listData['results']) {
                listData['results'] = listData['results'].map((item: any) => {
                    const flatItem = flatten(item);
                    return { ...flatItem, listDataCount: listData.count };
                });
                // Building array of columns for display purpose
                let result_list: Array<any> = [];

                listFields.forEach((column_name: any) => {
                    if (column_name.includes('{')) {
                        column_name = column_name.replaceAll('{', '_').replaceAll('}', '');
                    }
                    const label = displayedLabels[column_name] ?? column_name;

                    const newColumn: any = {
                        title: t(`d:${label}`),
                        dataIndex: column_name,
                        key: column_name,
                        showSorterTooltip: false,
                        ellipsis: true,
                        width: 150
                    };

                    // Add sorting functionality if applicable
                    if (sortableFields.includes(column_name)) {
                        newColumn.sorter = { multiple: 1 };
                        newColumn.showSorterTooltip = false;
                    }

                    // Hide excluded or default hidden fields
                    if (
                        excludedListFields.includes(column_name) ||
                        hiddenListFields.includes(column_name)
                    ) {
                        newColumn.hidden = true;
                    }

                    result_list.push(newColumn);
                });

                console.log(
                    'AXC - ListComponentV2Simplify.tsx - ListComponentV2Simplify - result_list:',
                    result_list
                );
                // set columns to use in table
                setAllColumns(result_list);

                // set data for the table
                setRows(listData);
                console.log(
                    'AXC - ListComponentV2Simplify.tsx - ListComponentV2Simplify - listData:',
                    listData
                );
                if (props.setData) props.setData(listData.results);

                setPagination({
                    ...pagination,
                    current: pagination.current,
                    total: listData['count']
                });
            }
            setFirstLoad(false);
        }
        console.log('AXC - ListComponentV2Simplify.tsx - ListComponentV2Simplify - data:', data);
    }, [data, props.dataModel.endpoints.list]);

    // #endregion

    // #region TABLE CHANGE HANDLER (sort)
    const handleTableChange = async (_pagination: any, _filter: any, sorter: any) => {
        const newSorter = orderByFormater(sorter);

        let tmp_array: any[] = [];
        if (newSorter) {
            tmp_array = newSorter;
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
                        return { ...col, sortOrder: sorterForCol.ascending ? 'ascend' : 'descend' };
                    } else {
                        return { ...col, sortOrder: false };
                    }
                });
                return updatedColumns;
            });
        }
    };

    // #endregion

    // #region Date formatting
    if (rows?.results && rows?.results.length > 0) {
        rows.results.forEach((row: any) => {
            Object.keys(row).forEach((key) => {
                if (isString(row[key]) && isStringDateTime(row[key])) {
                    row[key] = formatUTCLocaleDateTime(row[key], router.locale);
                }
                if (isString(row[key]) && isStringDate(row[key])) {
                    row[key] = formatUTCLocaleDate(row[key], router.locale);
                }
            });
        });
    }

    // #endregion

    // #region merge columns
    const mergedColumns = [
        ...props.actionColumns,
        ...props.extraColumns,
        ...(newTableColumns?.filter((col) => col.key !== 'actions') || [])
    ];
    console.log(
        'AXC - ListComponentV2Simplify.tsx - ListComponentV2Simplify - mergedColumns:',
        mergedColumns
    );

    // #endregion

    // #region return
    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
                    <>
                        <div>No permission to read data</div>
                    </>
                ) : (
                    <>
                        <DrawerItems {...drawerProps()} />
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
                                        {props.searchable ? (
                                            <Badge
                                                count={Object.keys(search).length}
                                                showZero={false}
                                            >
                                                <Button
                                                    icon={<SearchOutlined />}
                                                    onClick={() => setIsSearchDrawerOpen(true)}
                                                    type="primary"
                                                />
                                            </Badge>
                                        ) : null}
                                        {props.headerData.actionsComponent != null
                                            ? props.headerData.actionsComponent
                                            : null}
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
                                    </Space>
                                }
                            />
                        ) : (
                            <Space style={{ marginBottom: 16 }}>
                                {props.searchable ? (
                                    <Badge count={Object.keys(search).length} showZero={false}>
                                        <Button
                                            icon={<SearchOutlined />}
                                            onClick={() => setIsSearchDrawerOpen(true)}
                                            type="primary"
                                        />
                                    </Badge>
                                ) : null}
                            </Space>
                        )}
                        {!firstLoad && rows ? (
                            <Table
                                bordered={false}
                                loading={isLoading}
                                size="small"
                                dataSource={rows?.results ?? []}
                                columns={mergedColumns.filter((col) => !col.hidden)}
                                onChange={handleTableChange}
                                pagination={{
                                    total: pagination?.total,
                                    current: pagination?.current,
                                    pageSize: pagination?.itemsPerPage,
                                    pageSizeOptions: ['10', '20', '50', '100'],
                                    showSizeChanger: true,
                                    onChange: onChangePagination,
                                    onShowSizeChange: onChangePagination,
                                    size: 'small',
                                    showTotal: (total, range) =>
                                        `${range[0]}-${range[1]} sur ${total} éléments`
                                }}
                                rowKey={(record) => record.id}
                                rowSelection={props.rowSelection}
                                scroll={{ x: 'max-content' }}
                                tableLayout="fixed"
                            />
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

ListComponentV2Simplify.displayName = 'ListComponentSimple';
export { ListComponentV2Simplify };
