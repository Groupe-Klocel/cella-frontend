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
import { LinkButton } from '@components';
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useEffect, useState } from 'react';
import { StatusHistoryDetailExtraModelV2 } from 'models/StatusHistoryDetailExtraModelV2';
import { CustomerOrderLineModelV2 } from 'models/CustomerOrderLineModelV2';
import { CustomerOrderAddressModelV2 } from 'models/CustomerOrderAddressModelV2';
import configs from '../../../../common/configs.json';
import { PaymentLineModelV2 } from 'models/PaymentLineModelV2';
import { DeliveryModelV2 } from 'models/DeliveryModelV2';

export interface IItemDetailsProps {
    orderId?: string | any;
    orderName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    thirdPartyId?: string | any;
    priceType?: number | any;
    status?: string | any;
    setInvoiceAddress?: any;
}

const CustomerOrderDetailsExtra = ({
    orderId,
    orderName,
    stockOwnerId,
    stockOwnerName,
    thirdPartyId,
    priceType,
    status,
    setInvoiceAddress
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDeleteAddress, setIdToDeleteAddress] = useState<string | undefined>();
    const [idToDisableAddress, setIdToDisableAddress] = useState<string | undefined>();
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const customerOrderAddressModes = getModesFromPermissions(permissions, Table.OrderAddress);
    const customerOrderLineModes = getModesFromPermissions(permissions, Table.OrderLine);
    const [customerOrderAddressesData, setCustomerOrderAddressesData] = useState<any>();
    const paymentLineModes = getModesFromPermissions(permissions, Table.PaymentLine);
    const deliveryModes = getModesFromPermissions(permissions, Table.Delivery);

    const customerOrderAddressHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:customer-order-addresses') }),
        routes: [],
        actionsComponent:
            customerOrderAddressModes.length > 0 &&
            customerOrderAddressModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:customer-order-address') })}
                    path={pathParamsFromDictionary('/customer-orders/address/add', {
                        orderId: orderId,
                        orderName: orderName,
                        orderStatus: status
                    })}
                    type="primary"
                />
            ) : null
    };

    useEffect(() => {
        if (customerOrderAddressesData) {
            setInvoiceAddress(
                customerOrderAddressesData.find(
                    (e: any) => e.category == configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE
                )
            );
        }
    }, [customerOrderAddressesData]);

    const curtomerOrderLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:customer-order-lines') }),
        routes: [],
        actionsComponent:
            customerOrderLineModes.length > 0 &&
            customerOrderLineModes.includes(ModeEnum.Create) &&
            status < configs.ORDER_STATUS_TO_INVOICE ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:customer-order-line') })}
                    path={pathParamsFromDictionary('/customer-orders/line/add', {
                        orderId: orderId,
                        orderName: orderName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName,
                        thirdPartyId: thirdPartyId,
                        priceType: priceType
                    })}
                    type="primary"
                />
            ) : null
    };

    const paymentLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:payment-lines') }),
        routes: [],
        actionsComponent: undefined
    };

    const deliveryHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:deliveries') }),
        routes: [],
        actionsComponent: undefined
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            {customerOrderAddressModes.length > 0 &&
            customerOrderAddressModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: orderId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ orderId: orderId }}
                        dataModel={CustomerOrderAddressModelV2}
                        headerData={customerOrderAddressHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteAddress,
                            setIdToDelete: setIdToDeleteAddress
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableAddress,
                            setIdToDisable: setIdToDisableAddress
                        }}
                        routeDetailPage={'/customer-orders/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; category: number }) => (
                                    <Space>
                                        {customerOrderAddressModes.length == 0 ||
                                        !customerOrderAddressModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/customer-orders/address/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {customerOrderAddressModes.length > 0 &&
                                        customerOrderAddressModes.includes(ModeEnum.Update) &&
                                        CustomerOrderAddressModelV2.isEditable &&
                                        (record.category ==
                                            configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY ||
                                            (record.category ==
                                                configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE &&
                                                status <= configs.ORDER_STATUS_TO_INVOICE)) ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/customer-orders/address/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {customerOrderAddressModes.length > 0 &&
                                        customerOrderAddressModes.includes(ModeEnum.Delete) &&
                                        CustomerOrderAddressModelV2.isSoftDeletable &&
                                        (record.category ==
                                            configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY ||
                                            (record.category ==
                                                configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE &&
                                                status <= configs.ORDER_STATUS_TO_INVOICE)) ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableAddress,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {customerOrderAddressModes.length > 0 &&
                                        customerOrderAddressModes.includes(ModeEnum.Delete) &&
                                        CustomerOrderAddressModelV2.isDeletable &&
                                        (record.category ==
                                            configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY ||
                                            (record.category ==
                                                configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE &&
                                                status <= configs.ORDER_STATUS_TO_INVOICE)) ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDeleteAddress,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        setData={setCustomerOrderAddressesData}
                        searchable={false}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
            {customerOrderLineModes.length > 0 && customerOrderLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ orderId: orderId }}
                        dataModel={CustomerOrderLineModelV2}
                        headerData={curtomerOrderLineHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteLine,
                            setIdToDelete: setIdToDeleteLine
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableLine,
                            setIdToDisable: setIdToDisableLine
                        }}
                        routeDetailPage={'/customer-orders/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {customerOrderLineModes.length == 0 ||
                                        !customerOrderLineModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/customer-orders/line/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {customerOrderLineModes.length > 0 &&
                                        customerOrderLineModes.includes(ModeEnum.Update) &&
                                        CustomerOrderLineModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/customer-orders/line/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {customerOrderLineModes.length > 0 &&
                                        customerOrderLineModes.includes(ModeEnum.Delete) &&
                                        CustomerOrderLineModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableLine,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {customerOrderLineModes.length > 0 &&
                                        customerOrderLineModes.includes(ModeEnum.Delete) &&
                                        CustomerOrderLineModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDeleteLine,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
            <ListComponent
                searchCriteria={{ orderId: orderId }}
                dataModel={PaymentLineModelV2}
                headerData={paymentLineHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {paymentLineModes.length == 0 ||
                                !paymentLineModes.includes(ModeEnum.Read) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParamsFromDictionary('/payments/line/[id]', {
                                                id: record.id
                                            })}
                                        />
                                    </>
                                )}
                            </Space>
                        )
                    }
                ]}
            />
            <ListComponent
                searchCriteria={{ orderId: orderId }}
                dataModel={DeliveryModelV2}
                headerData={deliveryHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {deliveryModes.length == 0 ||
                                !deliveryModes.includes(ModeEnum.Read) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParamsFromDictionary('/deliveries/[id]', {
                                                id: record.id
                                            })}
                                        />
                                    </>
                                )}
                            </Space>
                        )
                    }
                ]}
            />
        </>
    );
};

export { CustomerOrderDetailsExtra };
