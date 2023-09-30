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
import { CaretDownOutlined, CaretUpOutlined, SearchOutlined } from '@ant-design/icons';
import { AppTable, ContentSpin, HeaderContent, LinkButton } from '@components';
import { Space, Form, Button, Alert, Empty } from 'antd';
import { EyeTwoTone } from '@ant-design/icons';
import { useDrawerDispatch } from 'context/DrawerContext';
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
    flatten
} from '@helpers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterFieldType, ModelType } from 'models/Models';
import { useAppState } from 'context/AppContext';
import {
    ExportFormat,
    GetListOfPrioritiesQuery,
    ModeEnum,
    UpdateEquipmentMutation,
    UpdateEquipmentMutationVariables,
    useGetListOfPrioritiesQuery,
    useUpdateEquipmentMutation
} from 'generated/graphql';
import { ListFilters } from 'modules/Crud/submodules/ListFilters';
import { useAuth } from 'context/AuthContext';

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

const EquipmentListComponent = (props: IListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const [priorityUpId, setPriorityUpId] = useState<string>();
    const [priorityDownId, setPriorityDownId] = useState<string>();

    const [, setEquipmentWithPriorities] = useState<any>();
    const [, setMaxPriority] = useState<number>(0);

    const priorityList = useGetListOfPrioritiesQuery<Partial<GetListOfPrioritiesQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        setEquipmentWithPriorities(priorityList?.data?.equipments?.results);
        const receivedList = priorityList?.data?.equipments?.results.map((e: any) => e.priority);
        if (receivedList) {
            setMaxPriority(Math.max(...receivedList));
        }
    }, [priorityList]);

    // #region DEFAULT PROPS
    const defaultProps = {
        searchable: true,
        searchCriteria: {},
        extraColumns: [],
        actionColumns: [
            {
                title: 'actions:actions',
                key: 'actions',
                render: (record: { id: string; name: string; priority: number }) => (
                    <Space>
                        {record.priority === null ? (
                            <></>
                        ) : (
                            <>
                                <Button
                                    onClick={() => priorityUp(record.id)}
                                    icon={<CaretUpOutlined />}
                                />
                                <Button
                                    onClick={() => priorityDown(record.id)}
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
                content: <ListFilters form={formSearch} columns={filterFields} />,
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
        formSearch.resetFields();
    };

    const handleSubmit = () => {
        formSearch
            .validateFields()
            .then(() => {
                // Here make api call of something else
                setSearch(formSearch.getFieldsValue(true));
                closeDrawer();
            })
            .catch((err) => showError(t('messages:error-getting-data')));
    };

    // #endregion

    // #region DATATABLE
    const [rows, setRows] = useState<DataQueryType>();
    const [columns, setColumns] = useState<Array<any>>([]);

    const [sort] = useState<any>({ ascending: true, field: 'priority' });

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
        props.dataModel.listFields,
        search,
        pagination.current,
        pagination.itemsPerPage,
        sort
    );

    useEffect(() => {
        reloadData();
    }, [search, pagination.current, pagination.itemsPerPage, sort]);

    // #endregion

    // #region EXPORT DATA
    const {
        isLoading: exportLoading,
        result: exportResult,
        mutate
    } = useExport(props.dataModel.resolverName, props.dataModel.endpoints.export ?? '');

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
                        const sortableFields = props.dataModel.sortableFields || [];

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
                        if (
                            !props.dataModel.excludedListFields ||
                            !props.dataModel.excludedListFields.includes(row_data.key)
                        ) {
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

    //Priority up and down management (this part of code could be improved in the next phase by e.g. factorising it)
    const { mutate: equipMutate, isLoading: updatedLoading } = useUpdateEquipmentMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateEquipmentMutation,
                _variables: UpdateEquipmentMutationVariables,
                _context: any
            ) => {
                reloadData();
                // showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateEquipment = ({ id, input }: UpdateEquipmentMutationVariables) => {
        equipMutate({ id, input });
    };

    const priorityUp = (id: string) => {
        setPriorityUpId(id);
    };

    const priorityDown = (id: string) => {
        setPriorityDownId(id);
    };

    useEffect(() => {
        const currentEquipment = data?.equipments?.results.find((e: any) => e.id == priorityUpId);
        const currentPriority = currentEquipment?.priority;
        const minusOnePriority = currentPriority ? currentPriority - 1 : undefined;
        const minusOneEquipmentId = data?.equipments?.results.find(
            (e: any) => e.priority == minusOnePriority
        )?.id;
        if (minusOnePriority && priorityUpId) {
            updateEquipment({ id: priorityUpId, input: { priority: minusOnePriority as any } });
            if (minusOneEquipmentId) {
                updateEquipment({
                    id: minusOneEquipmentId,
                    input: { priority: currentPriority }
                });
            }
        }
    }, [priorityUpId]);

    useEffect(() => {
        const currentEquipment = data?.equipments?.results.find((e: any) => e.id == priorityDownId);
        const currentPriority = currentEquipment?.priority;
        const plusOnePriority = currentPriority ? currentPriority + 1 : undefined;
        const plusOneEquipmentId = data?.equipments?.results.find(
            (e: any) => e.priority == plusOnePriority
        )?.id;
        if (plusOnePriority && priorityDownId) {
            updateEquipment({ id: priorityDownId, input: { priority: plusOnePriority } });
            if (plusOneEquipmentId) {
                updateEquipment({
                    id: plusOneEquipmentId,
                    input: { priority: currentPriority }
                });
            }
        }
    }, [priorityDownId]);

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
                                <AppTable
                                    type={props.dataModel.endpoints.list}
                                    columns={columns
                                        .concat(props.extraColumns)
                                        .concat(props.actionColumns)}
                                    data={rows!.results}
                                    pagination={pagination}
                                    isLoading={isLoading}
                                    setPagination={onChangePagination}
                                    stickyActions={stickyActions}
                                    onChange={undefined}
                                    hiddenColumns={props.dataModel.hiddenListFields}
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

EquipmentListComponent.displayName = 'ListWithFilter';
export { EquipmentListComponent };
