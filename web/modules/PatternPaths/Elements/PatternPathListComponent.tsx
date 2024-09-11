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
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { AppTableV2, ContentSpin, HeaderContent, LinkButton } from '@components';
import { Space, Button, Alert, Empty } from 'antd';
import { EyeTwoTone } from '@ant-design/icons';
import useTranslation from 'next-translate/useTranslation';
import {
    DataQueryType,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    getModesFromPermissions,
    PaginationType,
    showError,
    showInfo,
    showSuccess,
    useDelete,
    useExport,
    useList,
    flatten,
    queryString,
    isStringDateTime,
    formatUTCLocaleDateTime,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useCallback, useEffect, useState } from 'react';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { useAppState } from 'context/AppContext';
import {
    ExportFormat,
    GetListOfOrdersQuery,
    ModeEnum,
    UpdatePatternPathMutation,
    UpdatePatternPathMutationVariables,
    useGetListOfOrdersQuery,
    useUpdatePatternPathMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { isString } from 'lodash';

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
};
export interface IListProps {
    dataModel: ModelType;
    extraColumns?: any;
    actionColumns?: any;
    headerData?: HeaderData;
    routeDetailPage?: string;
    searchable?: boolean;
    searchCriteria?: any;
    setData?: any;
    refresh?: any;
    sortDefault?: any;
    filterFields?: Array<FilterFieldType>;
}

const PatternPathListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const [orderUpId, setOrderUpId] = useState<string>();
    const [orderDownId, setOrderDownId] = useState<string>();

    const [, setPatternPathWithOrders] = useState<any>();
    const [, setMaxOrder] = useState<number>(0);

    const orderList = useGetListOfOrdersQuery<Partial<GetListOfOrdersQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        setPatternPathWithOrders(orderList?.data?.patternPaths?.results);
        const receivedList = orderList?.data?.patternPaths?.results.map((e: any) => e.order);
        if (receivedList) {
            setMaxOrder(Math.max(...receivedList));
        }
    }, [orderList]);

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

    const filterFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].searchingFormat !== null)
        .map((key) => {
            // handle uppercase for fields with {}
            let name = key;
            if (name.includes('{')) {
                const index = name.indexOf('{');
                name = `${name.substring(0, index)}_${name[
                    index + 1
                ].toUpperCase()}${name.substring(index + 2)}`.replaceAll('}', '');
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
                isMultipleSearch: props.dataModel.fieldsInfo[key].isMultipleSearch ?? undefined
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

    // #region DEFAULT PROPS
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [
            {
                title: 'actions:actions',
                key: 'actions',
                render: (record: { id: string; name: string; order: number; status: number }) => (
                    <Space>
                        {record.order === null ? (
                            <></>
                        ) : (
                            <>
                                <Button
                                    onClick={() => orderUp(record.id)}
                                    icon={<CaretUpOutlined />}
                                />
                                <Button
                                    onClick={() => orderDown(record.id)}
                                    icon={<CaretDownOutlined />}
                                />
                            </>
                        )}
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

    // #region DELETE MUTATION
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(props.dataModel.endpoints.delete);

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

    const [search, setSearch] = useState(props.searchCriteria);

    // #endregion

    // #region DATATABLE
    const [rows, setRows] = useState<DataQueryType>();
    const [columns, setColumns] = useState<Array<any>>([]);

    const [sort] = useState<any>({ ascending: true, field: 'order' });

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
        router.locale
    );

    useEffect(() => {
        reloadData();
    }, [search, pagination.current, pagination.itemsPerPage, sort]);

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
        router.locale
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
        (currentPage, itemsPerPage) => {
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
                    const sort_index = 1;

                    listData['results'] = listData['results'].map((item: any) => {
                        return flatten(item);
                    });

                    // iterate over the first result and get list of columns to define table structure
                    Object.keys(listData['results'][0]).forEach((column_name) => {
                        const row_data: any = {
                            title: `d:${column_name}`,
                            dataIndex: column_name,
                            key: column_name,
                            showSorterTooltip: false
                        };

                        // if column is in sortable list add sorter property
                        if (sortableFields.length > 0 && sortableFields.includes(column_name)) {
                            row_data['sorter'] = { multiple: sort_index };
                            row_data['showSorterTooltip'] = false;
                            sort_index;
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
    }, [data]);

    useEffect(() => {
        reloadData(); //children function of interest
    }, [props.refresh]);

    // Order up and down management (this part of code could be improved in the next phase by e.g. factorising it)
    const { mutate: patternPathMutate, isLoading: updatedLoading } =
        useUpdatePatternPathMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdatePatternPathMutation,
                _variables: UpdatePatternPathMutationVariables,
                _context: any
            ) => {
                reloadData();
                // showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        });

    const updatePatternPath = ({ id, input }: UpdatePatternPathMutationVariables) => {
        patternPathMutate({ id, input });
    };

    const orderUp = (id: string) => {
        setOrderUpId(id);
    };

    const orderDown = (id: string) => {
        setOrderDownId(id);
    };

    useEffect(() => {
        const currentPatternPath = data?.patternPaths?.results.find((e: any) => e.id == orderUpId);
        const currentOrder = currentPatternPath?.order;
        const minusOneOrder = currentOrder ? currentOrder - 1 : undefined;
        const minusOnePatternPathId = data?.patternPaths?.results.find(
            (e: any) => e.order == minusOneOrder
        )?.id;
        if (minusOneOrder && orderUpId) {
            updatePatternPath({ id: orderUpId, input: { order: minusOneOrder as any } });
            if (minusOnePatternPathId) {
                updatePatternPath({
                    id: minusOnePatternPathId,
                    input: { order: currentOrder }
                });
            }
        }
    }, [orderUpId]);

    useEffect(() => {
        const currentPatternPath = data?.patternPaths?.results.find(
            (e: any) => e.id == orderDownId
        );
        const currentOrder = currentPatternPath?.order;
        const plusOneOrder = currentOrder ? currentOrder + 1 : undefined;
        const plusOnePatternPathId = data?.patternPaths?.results.find(
            (e: any) => e.order == plusOneOrder
        )?.id;
        if (plusOneOrder && orderDownId) {
            updatePatternPath({ id: orderDownId, input: { order: plusOneOrder } });
            if (plusOnePatternPathId) {
                updatePatternPath({
                    id: plusOnePatternPathId,
                    input: { order: currentOrder }
                });
            }
        }
    }, [orderDownId]);

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
                            rows?.results && rows.results.length > 0 ? (
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
                                    onChange={undefined}
                                    hiddenColumns={hiddenListFields}
                                    linkFields={linkFields}
                                />
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

PatternPathListComponent.displayName = 'ListWithFilter';
export { PatternPathListComponent };
