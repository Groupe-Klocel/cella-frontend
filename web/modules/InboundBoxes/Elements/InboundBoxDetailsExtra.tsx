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
import { HandlingUnitContentInboundModelV2 } from 'models/HandlingUnitContentInboundModelV2';
import configs from '../../../../common/configs.json';
import { StatusHistoryDetailExtraModelV2 } from 'models/StatusHistoryDetailExtraModelV2';

export interface IItemDetailsProps {
    boxId?: string | any;
    huId?: string | any;
}

const InboundBoxDetailsExtra = ({ boxId, huId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const huContentInboundModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitContentInbound
    );

    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const huContentInboundHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:boxLines') }),
        routes: [],
        actionsComponent: undefined
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
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
            {huContentInboundModes.length > 0 && huContentInboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: boxId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ handlingUnitInboundId: boxId }}
                        dataModel={HandlingUnitContentInboundModelV2}
                        headerData={huContentInboundHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        routeDetailPage={'/inbound-boxes/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; status: number }) => (
                                    <Space>
                                        {huContentInboundModes.length == 0 ||
                                        !huContentInboundModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/inbound-boxes/line/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {huContentInboundModes.length > 0 &&
                                        huContentInboundModes.includes(ModeEnum.Update) &&
                                        HandlingUnitContentInboundModelV2.isEditable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_INBOUND_STATUS_IN_PROGRESS ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/boxes/boxLine/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        boxId
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {huContentInboundModes.length > 0 &&
                                        huContentInboundModes.includes(ModeEnum.Delete) &&
                                        HandlingUnitContentInboundModelV2.isSoftDeletable &&
                                        record?.status <
                                            configs.HANDLING_UNIT_CONTENT_INBOUND_STATUS_IN_PROGRESS ? (
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
                    />
                    <Divider />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { InboundBoxDetailsExtra };
