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
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Divider, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import { EquipmentDetailModel } from 'models/EquipmentDetailModel';
import configs from '../../../../common/configs.json';

const { Title } = Typography;

export interface IItemDetailsProps {
    equipmentId?: string | any;
    equipmentName?: string | any;
    equipmentStatus?: number | any;
    stockOwnerId?: string | any;
}

const EquipmentDetailsExtra = ({
    equipmentId,
    equipmentName,
    equipmentStatus,
    stockOwnerId
}: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.EquipmentDetail);

    const equipmentDetailsHeaderData: HeaderData = {
        title: t('common:equipment-detail'),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) &&
            equipmentStatus != configs.EQUIPMENT_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:equipment-detail') })}
                    path={pathParamsFromDictionary('/equipment/details/add', {
                        equipmentId: equipmentId,
                        equipmentName: equipmentName,
                        equipmentStatus: equipmentStatus,
                        stockOwnerId: stockOwnerId
                    })}
                    type="primary"
                />
            ) : null
    };
    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ equipmentId: equipmentId }}
                        dataModel={EquipmentDetailModel}
                        headerData={equipmentDetailsHeaderData}
                        routeDetailPage={'/equipment/details/:id'}
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
