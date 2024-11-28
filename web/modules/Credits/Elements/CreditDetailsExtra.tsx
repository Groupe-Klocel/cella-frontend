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
import { useState } from 'react';
import { CreditLineModelV2 } from 'models/CreditLineModelV2';
import { PaymentLineModelV2 } from 'models/PaymentLineModelV2';
import { CreditAddressModelV2 } from 'models/CreditAddressModelV2';
import { StatusHistoryDetailExtraModelV2 } from 'models/StatusHistoryDetailExtraModelV2';

export interface IItemDetailsProps {
    orderId?: string | any;
    orderName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    thirdPartyId?: string | any;
    priceType?: number | any;
    status?: string | any;
    refetchCreditPayment?: boolean;
}

const CreditDetailsExtra = ({
    orderId,
    orderName,
    stockOwnerId,
    stockOwnerName,
    thirdPartyId,
    priceType,
    status,
    refetchCreditPayment
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const creditLineModes = getModesFromPermissions(permissions, Table.OrderLine);
    const creditAddressModes = getModesFromPermissions(permissions, Table.OrderAddress);

    const paymentLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:payment-lines') }),
        routes: [],
        actionsComponent: undefined
    };

    const creditAddressHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:credit-addresses') }),
        routes: [],
        actionsComponent:
            creditAddressModes.length > 0 && creditAddressModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:credit-address') })}
                    path={pathParamsFromDictionary('/credits/address/add', {
                        orderId: orderId,
                        orderName: orderName
                    })}
                    type="primary"
                />
            ) : null
    };

    const creditLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:credit-lines') }),
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
            {creditAddressModes.length > 0 && creditAddressModes.includes(ModeEnum.Read) ? (
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
                        dataModel={CreditAddressModelV2}
                        headerData={creditAddressHeaderData}
                        routeDetailPage={'/credits/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; status: number }) => (
                                    <Space>
                                        {creditAddressModes.length == 0 ||
                                        !creditAddressModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/credits/address/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {creditAddressModes.length > 0 &&
                                        creditAddressModes.includes(ModeEnum.Update) &&
                                        CreditAddressModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/credits/address/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        sortDefault={[{ field: 'created', ascending: true }]}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                    />
                </>
            ) : (
                <></>
            )}
            {creditLineModes.length > 0 && creditLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ orderId: orderId }}
                        dataModel={CreditLineModelV2}
                        headerData={creditLineHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteLine,
                            setIdToDelete: setIdToDeleteLine
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableLine,
                            setIdToDisable: setIdToDisableLine
                        }}
                        routeDetailPage={'/credits/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {creditLineModes.length == 0 ||
                                        !creditLineModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/credits/line/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {creditLineModes.length > 0 &&
                                        creditLineModes.includes(ModeEnum.Update) &&
                                        CreditLineModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/credits/line/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {creditLineModes.length > 0 &&
                                        creditLineModes.includes(ModeEnum.Delete) &&
                                        CreditLineModelV2.isSoftDeletable ? (
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
                                        {creditLineModes.length > 0 &&
                                        creditLineModes.includes(ModeEnum.Delete) &&
                                        CreditLineModelV2.isDeletable ? (
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
                refetch={refetchCreditPayment}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {creditLineModes.length == 0 ||
                                !creditLineModes.includes(ModeEnum.Read) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParamsFromDictionary(
                                                '/credits/paymentLine/[id]',
                                                {
                                                    id: record.id
                                                }
                                            )}
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

export { CreditDetailsExtra };
