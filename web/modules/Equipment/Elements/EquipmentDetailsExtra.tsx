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
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { EquipmentDetailModelV2 } from '@helpers';
import configs from '../../../../common/configs.json';
import { useState } from 'react';

const { Title } = Typography;

export interface IItemDetailsProps {
    equipmentId?: string | any;
    equipmentName?: string | any;
    equipmentStatus?: number | any;
    stockOwnerId?: string | any;
    carrierShippingModeId?: string | any;
    carrierShippingModeName?: string | any;
}

const EquipmentDetailsExtra = ({
    equipmentId,
    equipmentName,
    equipmentStatus,
    stockOwnerId,
    carrierShippingModeId,
    carrierShippingModeName
}: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.EquipmentDetail);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [refetchEquipmentDetail, setRefetchEquipmentDetail] = useState<boolean>(false);

    const equipmentDetailsHeaderData: HeaderData = {
        title: t('common:equipment-details'),
        routes: [],
        actionsComponent:
            modes.length > 0 &&
            modes.includes(ModeEnum.Create) &&
            equipmentStatus != configs.EQUIPMENT_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:equipment-detail') })}
                    path={pathParamsFromDictionary('/equipment/details/add', {
                        equipmentId: equipmentId,
                        equipmentName: equipmentName,
                        equipmentStatus: equipmentStatus,
                        stockOwnerId: stockOwnerId,
                        carrierShippingModeId: carrierShippingModeId,
                        carrierShippingModeName: carrierShippingModeName
                    })}
                    type="primary"
                />
            ) : null
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

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ equipmentId: equipmentId }}
                        dataModel={EquipmentDetailModelV2}
                        headerData={equipmentDetailsHeaderData}
                        routeDetailPage={'/equipment/details/:id'}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        refetch={refetchEquipmentDetail}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    equipmentId: string;
                                }) => (
                                    <Space>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/equipment/details/[id]', record.id)}
                                        />
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Update) &&
                                        EquipmentDetailModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={`/equipment/details/edit/${record.id}`}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        EquipmentDetailModelV2.isSoftDeletable ? (
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
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        EquipmentDetailModelV2.isDeletable ? (
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
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};
export { EquipmentDetailsExtra };
