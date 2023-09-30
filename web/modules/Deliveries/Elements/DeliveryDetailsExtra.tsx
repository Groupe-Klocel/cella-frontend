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
import {
    BarcodeOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    StopOutlined
} from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary, showError } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import moment from 'moment';
import 'moment/min/locales';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { DeliveryAddressModelV2 } from 'models/DeliveryAddressModelV2';
import { DeliveryLineModelV2 } from 'models/DeliveryLineModelV2';
import { HandlingUnitOutboundModelV2 } from 'models/HandlingUnitOutboundModelV2';
import configs from '../../../../common/configs.json';
import { useEffect, useState } from 'react';

const { Title } = Typography;

export interface IItemDetailsProps {
    deliveryId?: string | any;
    deliveryName?: string | any;
    deliveryStatus?: number | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
}

const DeliveryDetailsExtra = ({
    deliveryId,
    deliveryName,
    deliveryStatus,
    stockOwnerId,
    stockOwnerName
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const deliveryAddressModes = getModesFromPermissions(permissions, Table.DeliveryAddress);
    const deliveryLineModes = getModesFromPermissions(permissions, Table.DeliveryLine);
    const huOutboundModes = getModesFromPermissions(permissions, Table.HandlingUnitOutbound);
    const [, setDeliveryAddressesData] = useState<any>();
    const [, setDeliveryLinesData] = useState<any>();
    const [, setHandlingUnitOutboundsData] = useState<any>();

    const deliveryAddressHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:delivery-addresses') }),
        routes: [],
        actionsComponent:
            deliveryAddressModes.length > 0 &&
            deliveryAddressModes.includes(ModeEnum.Create) &&
            deliveryStatus <= configs.DELIVERY_STATUS_CREATED ? (
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

    //retrieves values in case of multiple printout
    const [boxSet, setBoxSet] = useState<Array<any>>();
    //retrieves value in case of single printout
    const [boxId, setBoxId] = useState<string>();
    //set list of Ids to print in any case
    const [boxesToPrint, setBoxesToPrint] = useState<Array<string>>();
    useEffect(() => {
        if (boxSet) {
            setBoxesToPrint(
                boxSet
                    ?.filter(
                        (e: any) => e.status != configs.HANDLING_UNIT_OUTBOUND_STATUS_CANCELLED
                    )
                    .map((e: any) => e.id)
            );
        }
    }, [boxSet]);

    const huOutboundHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:boxes') }),
        routes: [],
        actionsComponent: (
            <>
                {boxesToPrint?.length ? (
                    <Button
                        type="primary"
                        ghost
                        onClick={() => {
                            printBox(boxesToPrint);
                        }}
                    >
                        {t('actions:print-labels')}
                    </Button>
                ) : (
                    <></>
                )}
            </>
        )
    };

    const printBox = async (boxes: string | Array<string>) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        typeof boxes === 'string' ? (boxes = [boxes]) : boxes;

        const res = await fetch(`/api/boxes/print/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                boxes,
                dateLocal
            })
        });

        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
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
            {deliveryAddressModes.length > 0 && deliveryAddressModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ deliveryId: deliveryId }}
                        dataModel={DeliveryAddressModelV2}
                        headerData={deliveryAddressHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                        DeliveryLineModelV2.isEditable ? (
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
                                        DeliveryAddressModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<StopOutlined />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {deliveryAddressModes.length > 0 &&
                                        deliveryAddressModes.includes(ModeEnum.Delete) &&
                                        DeliveryLineModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDelete,
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
                    <Divider />
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
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                        record.status < configs.DELIVERY_STATUS_CANCELED ? (
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
                                        record.status < configs.DELIVERY_STATUS_PREPARED ? (
                                            <Button
                                                icon={<StopOutlined />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
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
                                                        setIdToDelete,
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
                    <Divider />
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
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                        record?.status < configs.DELIVERY_STATUS_CANCELED ? (
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
                                        record?.status < configs.DELIVERY_STATUS_PREPARED ? (
                                            <Button
                                                icon={<StopOutlined />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
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
                    <Divider />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { DeliveryDetailsExtra };
