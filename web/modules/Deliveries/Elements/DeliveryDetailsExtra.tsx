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
import { LinkButton, NumberOfPrintsModalV2 } from '@components';
import {
    BarcodeOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone
} from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary, showError } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { DeliveryAddressModelV2 } from 'models/DeliveryAddressModelV2';
import { DeliveryLineModelV2 } from 'models/DeliveryLineModelV2';
import { HandlingUnitOutboundModelV2 } from 'models/HandlingUnitOutboundModelV2';
import configs from '../../../../common/configs.json';
import { useEffect, useState } from 'react';
import { StatusHistoryDetailExtraModelV2 } from 'models/StatusHistoryDetailExtraModelV2';

const { Title } = Typography;

export interface IItemDetailsProps {
    deliveryId?: string | any;
    deliveryName?: string | any;
    deliveryStatus?: number | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    setShippingAddress?: any;
}

const DeliveryDetailsExtra = ({
    deliveryId,
    deliveryName,
    deliveryStatus,
    stockOwnerId,
    stockOwnerName,
    setShippingAddress
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const boxesModes = getModesFromPermissions(permissions, HandlingUnitOutboundModelV2.tableName);
    const [idToDeleteAddress, setIdToDeleteAddress] = useState<string | undefined>();
    const [idToDisableAddress, setIdToDisableAddress] = useState<string | undefined>();
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const [idToDeleteBox, setIdToDeleteBox] = useState<string | undefined>();
    const [idToDisableBox, setIdToDisableBox] = useState<string | undefined>();
    const deliveryAddressModes = getModesFromPermissions(permissions, Table.DeliveryAddress);
    const deliveryLineModes = getModesFromPermissions(permissions, Table.DeliveryLine);
    const huOutboundModes = getModesFromPermissions(permissions, Table.HandlingUnitOutbound);
    const [deliveryAddressesData, setDeliveryAddressesData] = useState<any>();
    const [, setDeliveryLinesData] = useState<any>();
    const [, setHandlingUnitOutboundsData] = useState<any>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [boxesIdsToPrint, setBoxesIdsToPrint] = useState<string[]>();
    const [boxesSelectedRowKeys, setBoxesSelectedRowKeys] = useState<React.Key[]>([]);

    const hasSelected = boxesSelectedRowKeys.length > 0;

    const deliveryAddressHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:delivery-addresses') }),
        routes: [],
        actionsComponent:
            deliveryAddressModes.length > 0 &&
            deliveryAddressModes.includes(ModeEnum.Create) &&
            deliveryStatus < configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:delivery-address') })}
                    path={pathParamsFromDictionary('/deliveries/address/add', {
                        deliveryId: deliveryId,
                        deliveryName: deliveryName
                    })}
                    type="primary"
                />
            ) : null
    };

    useEffect(() => {
        if (deliveryAddressesData) {
            setShippingAddress(deliveryAddressesData.find((e: any) => e.category == 10));
        }
    }, [deliveryAddressesData]);

    const deliveryLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:delivery-lines') }),
        routes: [],
        actionsComponent:
            deliveryLineModes.length > 0 &&
            deliveryLineModes.includes(ModeEnum.Create) &&
            deliveryStatus <= configs.DELIVERY_STATUS_CREATED ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:delivery-line') })}
                    path={pathParamsFromDictionary('/deliveries/line/add', {
                        deliveryId: deliveryId,
                        deliveryName: deliveryName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName
                    })}
                    type="primary"
                />
            ) : null
    };

    const huOutboundHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:boxes') }),
        routes: [],
        actionsComponent: <></>
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

    const boxesActionButtons: ActionButtons = {
        actionsComponent:
            boxesModes.length > 0 && boxesModes.includes(ModeEnum.Update) ? (
                <>
                    <>
                        <span style={{ marginLeft: 16 }}>
                            {hasSelected
                                ? `${t('messages:selected-items-number', {
                                      number: boxesSelectedRowKeys.length
                                  })}`
                                : ''}
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => {
                                    setShowNumberOfPrintsModal(true);
                                    setBoxesIdsToPrint(boxesSelectedRowKeys as string[]);
                                }}
                                disabled={!hasSelected}
                            >
                                {t('actions:print')}
                            </Button>
                        </span>
                    </>
                </>
            ) : null
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setBoxesSelectedRowKeys(newSelectedRowKeys);
    };
    const boxRowSelection = {
        boxesSelectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled:
                record.status == configs.HANDLING_UNIT_OUTBOUND_STATUS_CANCELLED ? true : false
        })
    };

    return (
        <>
            {deliveryAddressModes.length > 0 && deliveryAddressModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: deliveryId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ deliveryId: deliveryId }}
                        dataModel={DeliveryAddressModelV2}
                        headerData={deliveryAddressHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteAddress,
                            setIdToDelete: setIdToDeleteAddress
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableAddress,
                            setIdToDisable: setIdToDisableAddress
                        }}
                        routeDetailPage={'/deliveries/detail/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; status: number }) => (
                                    <Space>
                                        {deliveryAddressModes.length == 0 ||
                                        !deliveryAddressModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/deliveries/address/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {deliveryAddressModes.length > 0 &&
                                        deliveryAddressModes.includes(ModeEnum.Update) &&
                                        DeliveryLineModelV2.isEditable &&
                                        deliveryStatus <
                                            configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/deliveries/address/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        deliveryId,
                                                        deliveryName
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {deliveryAddressModes.length > 0 &&
                                        deliveryAddressModes.includes(ModeEnum.Delete) &&
                                        DeliveryAddressModelV2.isSoftDeletable &&
                                        deliveryStatus <
                                            configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
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
                                        {deliveryAddressModes.length > 0 &&
                                        deliveryAddressModes.includes(ModeEnum.Delete) &&
                                        DeliveryLineModelV2.isDeletable &&
                                        deliveryStatus <
                                            configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
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
                        searchable={false}
                        setData={setDeliveryAddressesData}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
            {deliveryLineModes.length > 0 && deliveryLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ deliveryId: deliveryId }}
                        dataModel={DeliveryLineModelV2}
                        headerData={deliveryLineHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteLine,
                            setIdToDelete: setIdToDeleteLine
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableLine,
                            setIdToDisable: setIdToDisableLine
                        }}
                        routeDetailPage={'/deliveries/detail/:id'}
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
                                        {deliveryLineModes.length == 0 ||
                                        !deliveryLineModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/deliveries/line/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {deliveryLineModes.length > 0 &&
                                        deliveryLineModes.includes(ModeEnum.Update) &&
                                        DeliveryLineModelV2.isEditable &&
                                        record.status < configs.DELIVERY_STATUS_IN_PREPARATION ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/deliveries/line/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        deliveryId,
                                                        deliveryName
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {deliveryLineModes.length > 0 &&
                                        deliveryLineModes.includes(ModeEnum.Delete) &&
                                        DeliveryLineModelV2.isSoftDeletable &&
                                        record.status < configs.DELIVERY_STATUS_IN_PREPARATION ? (
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
                                        {deliveryLineModes.length > 0 &&
                                        deliveryLineModes.includes(ModeEnum.Delete) &&
                                        DeliveryLineModelV2.isDeletable &&
                                        record.status == configs.DELIVERY_STATUS_CREATED ? (
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
                        setData={setDeliveryLinesData}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
            {huOutboundModes.length > 0 && huOutboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ deliveryId: deliveryId }}
                        dataModel={HandlingUnitOutboundModelV2}
                        headerData={huOutboundHeaderData}
                        actionButtons={boxesActionButtons}
                        rowSelection={boxRowSelection}
                        checkbox={true}
                        triggerDelete={{
                            idToDelete: idToDeleteBox,
                            setIdToDelete: setIdToDeleteBox
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableBox,
                            setIdToDisable: setIdToDisableBox
                        }}
                        routeDetailPage={'/deliveries/detail/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; status: number }) => (
                                    <Space>
                                        {huOutboundModes.length == 0 ||
                                        !huOutboundModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary('/boxes/[id]', {
                                                        id: record.id
                                                    })}
                                                />
                                            </>
                                        )}
                                        {huOutboundModes.length > 0 &&
                                        huOutboundModes.includes(ModeEnum.Update) &&
                                        HandlingUnitOutboundModelV2.isEditable &&
                                        record?.status <
                                            configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary('/boxes/edit/[id]', {
                                                    id: record.id,
                                                    deliveryId,
                                                    deliveryName
                                                })}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {huOutboundModes.length > 0 &&
                                        huOutboundModes.includes(ModeEnum.Delete) &&
                                        HandlingUnitOutboundModelV2.isSoftDeletable &&
                                        record?.status <
                                            configs.DELIVERY_STATUS_LOAD_IN_PROGRESS ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableBox,
                                                        'disable'
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
                        setData={setHandlingUnitOutboundsData}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                    <NumberOfPrintsModalV2
                        showModal={{
                            showNumberOfPrintsModal,
                            setShowNumberOfPrintsModal
                        }}
                        dataToPrint={{ boxes: boxesIdsToPrint }}
                        documentName="K_OutboundHandlingUnitLabel"
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { DeliveryDetailsExtra };
