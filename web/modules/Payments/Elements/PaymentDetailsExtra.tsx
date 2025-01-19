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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';
import { PaymentLineModelV2 } from 'models/PaymentLineModelV2';

export interface IItemDetailsProps {
    paymentId?: string | any;
    orderName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    thirdPartyId?: string | any;
    priceType?: number | any;
    status?: string | any;
    setInvoiceAddress?: any;
}

const PaymentDetailsExtra = ({
    paymentId,
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
    const paymentLineModes = getModesFromPermissions(permissions, Table.PaymentLine);

    const paymentLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:payment-lines') }),
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

    return (
        <>
            <ListComponent
                searchCriteria={{ paymentId: paymentId }}
                dataModel={PaymentLineModelV2}
                headerData={paymentLineHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={true}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {!paymentLineModes.includes(ModeEnum.Read) ? (
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
                                {!paymentLineModes.includes(ModeEnum.Update) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EditTwoTone />}
                                            path={pathParamsFromDictionary(
                                                '/payments/line/edit/[id]',
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

export { PaymentDetailsExtra };
