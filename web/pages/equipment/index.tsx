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
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS } from '@helpers';
import { EyeTwoTone, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';
import { EquipmentModelV2 } from 'models/EquipmentModelV2';
import { equipmentRoutes } from 'modules/Equipment/Static/equipmentRoutes';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useState } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const EquipmentPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, EquipmentModelV2.tableName);

    const [priorityStatus, setPriorityStatus] = useState({
        id: '',
        type: ''
    });

    const headerData: HeaderData = {
        title: t('common:equipments'),
        routes: equipmentRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pieceOfEquipment') })}
                    path="/equipment/add"
                    type="primary"
                />
            ) : null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={EquipmentModelV2}
                routeDetailPage={'/equipment/:id'}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                triggerPriorityChange={{
                    id: priorityStatus.id,
                    setId: setPriorityStatus,
                    type: priorityStatus.type,
                    orderingField: 'priority'
                }}
                sortDefault={[{ ascending: true, field: 'priority' }]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: any) => (
                            <Space>
                                {record.priority === null ? (
                                    <></>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() =>
                                                setPriorityStatus({
                                                    type: 'up',
                                                    id: record.id
                                                })
                                            }
                                            icon={<CaretUpOutlined />}
                                        />
                                        <Button
                                            onClick={() =>
                                                setPriorityStatus({
                                                    type: 'down',
                                                    id: record.id
                                                })
                                            }
                                            icon={<CaretDownOutlined />}
                                        />
                                    </>
                                )}
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={'/equipment/:id'.replace(':id', record.id)}
                                />
                            </Space>
                        )
                    }
                ]}
            />
        </>
    );
};

EquipmentPage.layout = MainLayout;

export default EquipmentPage;
