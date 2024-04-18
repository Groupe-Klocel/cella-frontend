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
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { CustomerOrderModelV2 as model } from 'models/CustomerOrderModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import configs from '../../../common/configs.json';
import { MagentoImportModal } from 'modules/Orders/MagentoImportModal';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { PaymentModal } from 'modules/CustomerOrders/Modals/PaymentModal';

type PageComponent = FC & { layout: typeof MainLayout };

const CustomerOrderPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [showMagentoModal, setShowMagentoModal] = useState(false);
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [commonStatus, setCommonStatus] = useState<number | undefined>();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [orderId, setOrderId] = useState<any>();

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
                {
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={() => {
                                setShowMagentoModal(true);
                            }}
                            loading={loading}
                        >
                            {t('actions:mangento-get-orders')}
                        </Button>
                    </span>
                }
                <MagentoImportModal
                    showModal={{
                        showMagentoModal,
                        setShowMagentoModal
                    }}
                    triggerRefresh={triggerRefresh}
                    setTriggerRefresh={() => {
                        setTriggerRefresh(!triggerRefresh);
                    }}
                />
            </Space>
        )
    };

    const hasSelected = selectedRowKeys.length > 0;

    const onSelectChange = (newSelectedRowKeys: React.Key[], newSelectedRows: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
        setSelectedRows(newSelectedRows);
        if (newSelectedRows.length === 0) return undefined;
        const firstStatus = newSelectedRows[0].status;
        const allSameStatus = newSelectedRows.every((item: any) => item.status === firstStatus);
        setCommonStatus(allSameStatus ? firstStatus : undefined);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled:
                record.status == 1005 || record.status == configs.ORDER_STATUS_TO_INVOICE
                    ? true
                    : false
        })
    };

    //#region : Specific functions for this page
    function getNextStatus(status: number) {
        switch (status) {
            case configs.ORDER_STATUS_CREATED:
                return configs.ORDER_STATUS_QUOTE_TRANSMITTED;
            case configs.ORDER_STATUS_QUOTE_TRANSMITTED:
                return configs.ORDER_STATUS_TO_INVOICE;
            case configs.ORDER_STATUS_TO_BE_DELIVERED:
                return configs.ORDER_STATUS_DELIVERY_IN_PROGRESS;
            default:
                return configs.ORDER_STATUS_CREATED;
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
            const result = await graphqlRequestClient.request(updateMutation, updateVariables);
            setTriggerRefresh((current) => !current);
            return result;
        } catch (error) {
            console.error('Error updating order:', error);
        }
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
                case configs.ORDER_STATUS_TO_BE_DELIVERED:
                    return 'confirm-delivery';
                default:
                    return 'to-be-defined';
            }
        })();
        return () => {
            Modal.confirm({
                title: t(`messages:${switchStatusMessage}`),
                onOk: () => switchNextStatus(ids, status),
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
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
                    <>
                        <span style={{ marginLeft: 16 }}>
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
                                    confirmSwitchStatus(
                                        selectedRowKeys as [string],
                                        commonStatus!
                                    )();
                                }}
                                disabled={!hasSelected || !commonStatus}
                            >
                                {t('actions:bulk-order-change')}
                            </Button>
                        </span>
                    </>
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
                        render: (record: { id: string; status: number }) => (
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
                                record.status != configs.ORDER_STATUS_TO_INVOICE &&
                                record.status < configs.ORDER_STATUS_DELIVERY_IN_PROGRESS ? (
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
                                  record.status == configs.ORDER_STATUS_TO_INVOICE ? (
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
                orderId={orderId}
            />
        </>
    );
};

CustomerOrderPages.layout = MainLayout;

export default CustomerOrderPages;
