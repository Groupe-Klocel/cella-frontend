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
import { EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { getModesFromPermissions, pathParams, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useState } from 'react';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { HandlingUnitContentOutboundModelV2 } from '@helpers';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { HandlingUnitOutboundModelV2 } from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';

export interface IItemDetailsProps {
    shippingUnitId?: string | any;
    handlingUnitId?: string | any;
}

const ShippingUnitDetailsExtra = ({ shippingUnitId, handlingUnitId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const huContentOutboundModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitContentOutbound
    );
    const huOutboundModes = getModesFromPermissions(permissions, Table.HandlingUnitOutbound);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const [, setHandlingUnitContentOutboundsData] = useState<any>();

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    const huContentOutboundHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:shippingUnitLines') }),
        routes: [],
        actionsComponent: undefined
    };

    const huOutboundHeaderData: HeaderData = {
        title: t('common:children-shipping-units'),
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
            {huContentOutboundModes.length > 0 && huContentOutboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: shippingUnitId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ handlingUnitOutboundId: shippingUnitId }}
                        dataModel={HandlingUnitContentOutboundModelV2}
                        headerData={huContentOutboundHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        routeDetailPage={'/shipping-units/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; status: number }) => (
                                    <Space>
                                        {huContentOutboundModes.length == 0 ||
                                        !huContentOutboundModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/shipping-units/line/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {huContentOutboundModes.length > 0 &&
                                        huContentOutboundModes.includes(ModeEnum.Update) &&
                                        HandlingUnitContentOutboundModelV2.isEditable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_CANCELLED ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/shipping-units/line/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        shippingUnitId
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {huContentOutboundModes.length > 0 &&
                                        huContentOutboundModes.includes(ModeEnum.Delete) &&
                                        HandlingUnitContentOutboundModelV2.isSoftDeletable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_CANCELLED ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
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
                        setData={setHandlingUnitContentOutboundsData}
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
                        searchCriteria={{ handlingUnit_ParentHandlingUnitId: handlingUnitId }}
                        dataModel={HandlingUnitOutboundModelV2}
                        headerData={huOutboundHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        routeDetailPage={'/shipping-units/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    status: number;
                                    handlingUnit_type: number;
                                }) => (
                                    <Space>
                                        {huOutboundModes.length == 0 ||
                                        !huOutboundModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={
                                                        record.handlingUnit_type ===
                                                        parameters.HANDLING_UNIT_TYPE_PALLET
                                                            ? pathParamsFromDictionary(
                                                                  '/shipping-units/[id]',
                                                                  {
                                                                      id: record.id
                                                                  }
                                                              )
                                                            : pathParamsFromDictionary(
                                                                  '/boxes/[id]',
                                                                  {
                                                                      id: record.id
                                                                  }
                                                              )
                                                    }
                                                />
                                            </>
                                        )}
                                        {huOutboundModes.length > 0 &&
                                        huOutboundModes.includes(ModeEnum.Update) &&
                                        HandlingUnitContentOutboundModelV2.isEditable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_CANCELLED ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={
                                                    record.handlingUnit_type ===
                                                    parameters.HANDLING_UNIT_TYPE_PALLET
                                                        ? pathParamsFromDictionary(
                                                              '/shipping-units/edit/[id]',
                                                              {
                                                                  id: record.id
                                                              }
                                                          )
                                                        : pathParamsFromDictionary(
                                                              '/boxes/edit/[id]',
                                                              {
                                                                  id: record.id
                                                              }
                                                          )
                                                }
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {huOutboundModes.length > 0 &&
                                        huOutboundModes.includes(ModeEnum.Delete) &&
                                        HandlingUnitContentOutboundModelV2.isSoftDeletable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_CANCELLED ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
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
                        setData={setHandlingUnitContentOutboundsData}
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

export { ShippingUnitDetailsExtra };
