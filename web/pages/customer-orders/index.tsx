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
    CalculatorTwoTone,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    FileDoneOutlined,
    LockTwoTone
} from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    areObjectsIdentical,
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum, useListParametersForAScopeQuery } from 'generated/graphql';
import { CustomerOrderModelV2 as model } from 'models/CustomerOrderModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import configs from '../../../common/configs.json';
import parameters from '../../../common/parameters.json';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { PaymentModal } from 'modules/CustomerOrders/Modals/PaymentModal';
import { stat } from 'fs';
import { forEach } from 'lodash';

type PageComponent = FC & { layout: typeof MainLayout };

const CustomerOrderPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [commonStatus, setCommonStatus] = useState<number | undefined>();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [orderId, setOrderId] = useState<any>();
    const [isCreateDeliveryAllowed, setIsCreateDeliveryAllowed] = useState<boolean>(false);
    const [refetchPayment, setRefetchPayment] = useState<boolean>(false);
    const [statusAuthorizedToBulk, setStatusAuthorizedToBulk] = useState<boolean>(false);

    const headerData: HeaderData = {
        title: t('common:customer-orders'),
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:add2', { name: t('common:customer-order') })}
                        path={`${rootPath}/add`}
                        type="primary"
                    />
                ) : null}
            </Space>
        )
    };

    const hasSelected = selectedRowKeys.length > 0;

    // function that will retrieve delivery orderAddress for given orderId
    const getDeliveryOrderAddress = async (orderId: String[]) => {
        const query = gql`
            query getOrderAddress($filters: OrderAddressSearchFilters) {
                orderAddresses(filters: $filters) {
                    results {
                        entityCode
                        entityName
                        entityAddress1
                        entityAddress2
                        entityAddress3
                        entityStreetNumber
                        entityPostCode
                        entityCity
                        entityState
                        entityDistrict
                        entityCountry
                        entityCountryCode
                        thirdPartyAddressId
                    }
                }
            }
        `;
        const variables = {
            filters: { orderId, category: configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY }
        };
        const deliveryOrderAddress = await graphqlRequestClient.request(query, variables);
        return deliveryOrderAddress;
    };

    const [fetchOrderAddressTrigger, setFetchOrderAddressTrigger] = useState<{
        keys: React.Key[];
        rows: any[];
    } | null>(null);

    const onSelectChange = async (newSelectedRowKeys: React.Key[], newSelectedRows: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
        setSelectedRows(newSelectedRows);
        setFetchOrderAddressTrigger({ keys: newSelectedRowKeys, rows: newSelectedRows });
        if (newSelectedRows.length === 0) return undefined;
        const firstStatus = newSelectedRows[0].status;
        //this section manages conditions to allow or not bulk status change button
        const allowedStatuses = [
            configs.ORDER_STATUS_CREATED,
            configs.ORDER_STATUS_QUOTE_TRANSMITTED,
            configs.ORDER_STATUS_TO_INVOICE,
            configs.ORDER_STATUS_TO_BE_DELIVERED
        ];
        const allowedStatus = allowedStatuses.includes(firstStatus);
        const allSameStatus = newSelectedRows.every((item: any) => item.status === firstStatus);
        setCommonStatus(allSameStatus ? (allowedStatus ? firstStatus : undefined) : undefined);

        const allStatusesValid = newSelectedRows.every(
            (item: any) =>
                item.status >= configs.ORDER_STATUS_QUOTE_TRANSMITTED &&
                item.status <= configs.ORDER_STATUS_TO_BE_DELIVERED
        );
        setStatusAuthorizedToBulk(allStatusesValid);
    };

    //this useEffect checks deliveries addresses for selected orders and allow create delivery button or not
    useEffect(() => {
        if (!fetchOrderAddressTrigger || fetchOrderAddressTrigger.keys.length === 0) return;
        const fetchOrderAddress = async () => {
            const { keys, rows } = fetchOrderAddressTrigger;
            // Fetch order addresses
            const result = await getDeliveryOrderAddress(
                keys.filter((key) => typeof key === 'string') as string[]
            );
            let isSameOrderAddress = false;
            if (result) {
                const orderAddresses = result.orderAddresses.results;
                if (orderAddresses.length === keys.length) {
                    if (orderAddresses.length === 1) {
                        isSameOrderAddress = true;
                    } else {
                        isSameOrderAddress = areObjectsIdentical(orderAddresses);
                    }
                }
            }
            // This section manages conditions to allow or not delivery creation button
            const allowedOrderDeliveryStatus = rows.every(
                (item: any) => item.extraStatus2 < parameters.ORDER_EXTRA_STATUS2_DELIVERED
            );
            setIsCreateDeliveryAllowed(isSameOrderAddress && allowedOrderDeliveryStatus);
        };
        fetchOrderAddress();
    }, [fetchOrderAddressTrigger]);

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
    };

    //#region : Specific functions for this page
    function getNextStatus(status: number) {
        switch (status) {
            case configs.ORDER_STATUS_CREATED:
                return configs.ORDER_STATUS_QUOTE_TRANSMITTED;
            case configs.ORDER_STATUS_QUOTE_TRANSMITTED:
                return configs.ORDER_STATUS_TO_INVOICE;
            default:
                return undefined;
        }
    }

    const switchNextStatus = async (ids: [string], currentStatus: number) => {
        const newStatus = getNextStatus(currentStatus);
        const updateVariables = {
            ids,
            input: {
                status: newStatus
            }
        };

        const updateMutation = gql`
            mutation updateOrders($ids: [String!]!, $input: UpdateOrderInput!) {
                updateOrders(ids: $ids, input: $input)
            }
        `;

        try {
            const result: any = await graphqlRequestClient.request(updateMutation, updateVariables);
            setTriggerRefresh((current) => !current);
            return result;
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    // confirm and execute delivery creation function
    const [isCreateDeliveryLoading, setIsCreateDeliveryLoading] = useState(false);
    const createDelivery = (orderIds: [string], isSingle: boolean = false) => {
        Modal.confirm({
            title: t('messages:create-delivery-confirm'),
            onOk: async () => {
                setIsCreateDeliveryLoading(true);

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'order_delivery',
                    event: {
                        orderIds,
                        isSingleDelivery: isSingle
                    }
                };

                try {
                    const deliveryCreatedResult = await graphqlRequestClient.request(
                        query,
                        variables
                    );
                    if (deliveryCreatedResult.executeFunction.status === 'ERROR') {
                        showError(deliveryCreatedResult.executeFunction.output);
                    } else if (
                        deliveryCreatedResult.executeFunction.status === 'OK' &&
                        deliveryCreatedResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${deliveryCreatedResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            deliveryCreatedResult.executeFunction.output.output
                        );
                    } else {
                        showSuccess(t('messages:success-delivery-creation'));
                    }
                    setIsCreateDeliveryLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCreateDeliveryLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    //#endregion

    const confirmSwitchStatus = (ids: [string], status: any) => {
        const switchStatusMessage = (() => {
            switch (status) {
                case configs.ORDER_STATUS_CREATED:
                    return 'confirm-quote';
                case configs.ORDER_STATUS_QUOTE_TRANSMITTED:
                    return 'confirm-order';
                case configs.ORDER_STATUS_TO_INVOICE:
                    return 'confirm-payment';
                default:
                    return undefined;
            }
        })();
        return () => {
            if (switchStatusMessage) {
                Modal.confirm({
                    title: t(`messages:${switchStatusMessage}`),
                    onOk: () => switchNextStatus(ids, status),
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel')
                });
            }
        };
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <span className="selected-items-span" style={{ marginLeft: 16 }}>
                        {hasSelected
                            ? `${t('messages:selected-items-number', {
                                  number: selectedRowKeys.length
                              })}`
                            : ''}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={() => {
                                confirmSwitchStatus(selectedRowKeys as [string], commonStatus!)();
                            }}
                            disabled={!hasSelected || !commonStatus}
                        >
                            {t('actions:bulk-order-change')}
                        </Button>
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            loading={isCreateDeliveryLoading}
                            onClick={() => {
                                createDelivery(selectedRowKeys as [string]);
                            }}
                            disabled={!hasSelected || !isCreateDeliveryAllowed}
                        >
                            {t('actions:create-grouped-delivery')}
                        </Button>
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            loading={isCreateDeliveryLoading}
                            onClick={() => {
                                createDelivery(selectedRowKeys as [string], true);
                            }}
                            disabled={!hasSelected || !statusAuthorizedToBulk}
                        >
                            {t('actions:create-bulk-delivery')}
                        </Button>
                    </span>
                </>
            ) : null
    };
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                searchCriteria={{ orderType: configs.ORDER_TYPE_CUSTOMER_ORDER }}
                headerData={headerData}
                dataModel={model}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number; extraStatus1: number }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status < configs.ORDER_STATUS_TO_INVOICE ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status < configs.ORDER_STATUS_TO_INVOICE ? (
                                    <Button
                                        icon={<FileDoneOutlined />}
                                        style={{ color: 'green' }}
                                        onClick={() =>
                                            confirmSwitchStatus([record.id], record.status)()
                                        }
                                    />
                                ) : modes.length > 0 &&
                                  modes.includes(ModeEnum.Update) &&
                                  model.isEditable &&
                                  record.status >= configs.ORDER_STATUS_TO_INVOICE &&
                                  record.extraStatus1 !== parameters.ORDER_EXTRA_STATUS1_PAID ? (
                                    <Button
                                        icon={<CalculatorTwoTone twoToneColor="orange" />}
                                        onClick={() => {
                                            setShowPaymentModal(true);
                                            setOrderId(record.id);
                                        }}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable &&
                                record.status > configs.ORDER_STATUS_CREATED &&
                                record.status < configs.ORDER_STATUS_TO_INVOICE ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable &&
                                record.status <= configs.ORDER_STATUS_CREATED ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
                checkbox={true}
                refetch={triggerRefresh}
            />
            <PaymentModal
                showModal={{
                    showPaymentModal,
                    setShowPaymentModal
                }}
                setRefetch={setRefetchPayment}
                orderId={orderId}
            />
        </>
    );
};

CustomerOrderPages.layout = MainLayout;

export default CustomerOrderPages;
