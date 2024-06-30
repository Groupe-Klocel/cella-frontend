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
import { EyeTwoTone } from '@ant-design/icons';
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
import { ModeEnum } from 'generated/graphql';
import { DeliveryModelV2 as model } from 'models/DeliveryModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2HighLimit';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { DeliveryProgressBar } from 'modules/Deliveries/Elements/DeliveryProgressBar';
type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [refetch] = useState<boolean>(false);
    const [isCreateOrderAllowed, setIsCreateOrderAllowed] = useState<boolean>(false);
    const headerData: HeaderData = {
        title: t('common:deliveries-without-orders'),
        routes: [
            ...itemRoutes,
            {
                breadcrumbName: `${t('common:deliveries-without-orders')}`,
                path: `${rootPath}` + '/without-orders'
            }
        ],
        actionsComponent: undefined,
        onBackRoute: rootPath
    };

    // function that will retrieve order deliveryAddress for given deliveryId
    const getOrderDeliveryAddress = async (deliveryId: String[]) => {
        const query = gql`
            query getDeliveryAddress($filters: DeliveryAddressSearchFilters, $itemsPerPage: Int!) {
                deliveryAddresses(filters: $filters, itemsPerPage: $itemsPerPage) {
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
            filters: { deliveryId, category: configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE },
            itemsPerPage: 100
        };
        const deliveryOrderAddress = await graphqlRequestClient.request(query, variables);
        return deliveryOrderAddress;
    };

    const [fetchDeliveryAddressTrigger, setFetchDeliveryAddressTrigger] = useState<{
        keys: React.Key[];
        rows: any[];
    } | null>(null);

    const onSelectChange = (newSelectedRowKeys: React.Key[], newSelectedRows: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
        setFetchDeliveryAddressTrigger({ keys: newSelectedRowKeys, rows: newSelectedRows });
    };

    //this useEffect checks deliveries addresses for selected orders and allow create order button or not
    useEffect(() => {
        if (!fetchDeliveryAddressTrigger || fetchDeliveryAddressTrigger.keys.length === 0) return;
        const fetchOrderAddress = async () => {
            const { keys, rows } = fetchDeliveryAddressTrigger;
            // Fetch order addresses
            const result = await getOrderDeliveryAddress(
                keys.filter((key) => typeof key === 'string') as string[]
            );
            let isSameDeliveryAddress = false;
            if (result) {
                const deliveryAddresses = result.deliveryAddresses.results;
                if (deliveryAddresses.length === keys.length) {
                    if (deliveryAddresses.length === 1) {
                        isSameDeliveryAddress = true;
                    } else {
                        isSameDeliveryAddress = areObjectsIdentical(deliveryAddresses);
                    }
                }
            }

            // This section manages conditions to allow or not delivery creation button
            const allowedOrderDeliveryStatus = rows.every(
                (item: any) => item.extraStatus1 < parameters.DELIVERY_EXTRA_STATUS1_ORDERED
            );
            setIsCreateOrderAllowed(isSameDeliveryAddress && allowedOrderDeliveryStatus);
        };
        fetchOrderAddress();
    }, [fetchDeliveryAddressTrigger]);

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
    };
    // confirm and execute delivery creation function
    const [isCreateOrderLoading, setIsCreateOrderLoading] = useState(false);
    const createOrder = (deliveryIds: [string]) => {
        Modal.confirm({
            title: t('messages:create-order-confirm'),
            onOk: async () => {
                setIsCreateOrderLoading(true);

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'K_deliveryOrder',
                    event: {
                        deliveryIds
                    }
                };

                try {
                    const orderCreatedResult = await graphqlRequestClient.request(query, variables);
                    if (orderCreatedResult.executeFunction.status === 'ERROR') {
                        showError(orderCreatedResult.executeFunction.output);
                    } else if (
                        orderCreatedResult.executeFunction.status === 'OK' &&
                        orderCreatedResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${orderCreatedResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            orderCreatedResult.executeFunction.output.output
                        );
                    } else {
                        showSuccess(t('messages:success-order-creation'));
                    }
                    setIsCreateOrderLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCreateOrderLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const hasSelected = selectedRowKeys.length > 0;
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
                                loading={isCreateOrderLoading}
                                onClick={() => {
                                    createOrder(selectedRowKeys as [string]);
                                }}
                                disabled={!hasSelected || !isCreateOrderAllowed}
                            >
                                {t('actions:create-order')}
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
                headerData={headerData}
                searchCriteria={{ orderId: '**null**' }}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={refetch}
                extraColumns={[
                    {
                        title: 'd:progress',
                        key: 'progress',
                        render: (record: { id: string; status: number }) => (
                            <DeliveryProgressBar id={record.id} status={record.status} />
                        )
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            `${rootPath}/without-orders/[id]`,
                                            record.id
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
                checkbox={true}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
            />
        </>
    );
};

DeliveryPages.layout = MainLayout;

export default DeliveryPages;
