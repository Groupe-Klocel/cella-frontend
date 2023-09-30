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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, StopOutlined } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { PurchaseOrderLineModelV2 } from 'models/PurchaseOrderLineModelV2';
import { MovementModelV2 } from 'models/MovementModelV2';
import { useState } from 'react';
import configs from '../../../../common/configs.json';

export interface IItemDetailsProps {
    purchaseOrderId?: string | any;
    purchaseOrderName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    status?: number | any;
    type?: number | any;
}

const PurchaseOrderDetailsExtra = ({
    purchaseOrderId,
    purchaseOrderName,
    stockOwnerId,
    stockOwnerName,
    status,
    type
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [, setPurchaseOrderLinesData] = useState<any>();

    const { permissions } = useAppState();
    const poLineModes = getModesFromPermissions(permissions, Table.PurchaseOrderLine);
    const movementModes = getModesFromPermissions(permissions, Table.Movement);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const PurchaseOrderLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:purchase-order-lines') }),
        routes: [],
        actionsComponent:
            poLineModes.length > 0 && poLineModes.includes(ModeEnum.Create) ? (
                (type === configs.DELIVERY_PO_TYPE_L2 ||
                    type === configs.DELIVERY_PO_TYPE_L2_DECLARATIVE) &&
                status <= configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS ? (
                    <LinkButton
                        title={t('actions:add2', { name: t('common:purchase-order-line') })}
                        path={pathParamsFromDictionary('/purchase-orders/line/add', {
                            purchaseOrderId: purchaseOrderId,
                            purchaseOrderName: purchaseOrderName,
                            stockOwnerId: stockOwnerId,
                            stockOwnerName: stockOwnerName
                        })}
                        type="primary"
                    />
                ) : (
                    <></>
                )
            ) : null
    };

    const MovementData: HeaderData = {
        title: t('common:associated', { name: t('menu:movements') }),
        routes: [],
        actionsComponent: []
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
            <Divider />
            <ListComponent
                searchCriteria={{ purchaseOrderId: purchaseOrderId }}
                dataModel={PurchaseOrderLineModelV2}
                headerData={PurchaseOrderLineHeaderData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                routeDetailPage={'/purchase-orders/detail/:id'}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            receivedQuantity: number;
                            reservedQuantity: number;
                            status: number;
                        }) => (
                            <Space>
                                {poLineModes.length == 0 || !poLineModes.includes(ModeEnum.Read) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParamsFromDictionary(
                                                '/purchase-orders/line/[id]',
                                                {
                                                    id: record.id,
                                                    poId: purchaseOrderId,
                                                    type
                                                }
                                            )}
                                        />
                                    </>
                                )}
                                {poLineModes.length > 0 &&
                                poLineModes.includes(ModeEnum.Update) &&
                                PurchaseOrderLineModelV2.isEditable &&
                                type !== configs.PURCHASE_ORDER_TYPE_L3 &&
                                type !== configs.PURCHASE_ORDER_TYPE_L3_RETURN ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParamsFromDictionary(
                                            '/purchase-orders/line/edit/[id]',
                                            {
                                                id: record.id,
                                                purchaseOrderId,
                                                purchaseOrderName
                                            }
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                                {poLineModes.length > 0 &&
                                poLineModes.includes(ModeEnum.Delete) &&
                                PurchaseOrderLineModelV2.isSoftDeletable &&
                                record.status < configs.PURCHASE_ORDER_LINE_STATUS_CLOSED ? (
                                    <Button
                                        icon={<StopOutlined />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {poLineModes.length > 0 &&
                                poLineModes.includes(ModeEnum.Delete) &&
                                PurchaseOrderLineModelV2.isDeletable &&
                                type !== configs.PURCHASE_ORDER_TYPE_L3 &&
                                type !== configs.PURCHASE_ORDER_TYPE_L3_RETURN &&
                                record.receivedQuantity <= 0 &&
                                record.reservedQuantity <= 0 &&
                                record.status <= configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS ? (
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
                searchable={false}
                setData={setPurchaseOrderLinesData}
                sortDefault={[{ field: 'created', ascending: true }]}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ purchaseOrderIdStr: purchaseOrderId }}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                dataModel={MovementModelV2}
                headerData={MovementData}
                routeDetailPage={'/movements/:id'}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; name: string; movementId: string }) => (
                            <Space>
                                {movementModes.length == 0 ||
                                !movementModes.includes(ModeEnum.Read) ? (
                                    <></>
                                ) : (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/movements/[id]', record.id)}
                                        />
                                    </>
                                )}
                            </Space>
                        )
                    }
                ]}
                searchable={false}
            />
            <Divider />
        </>
    );
};

export { PurchaseOrderDetailsExtra };
