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
import { EyeTwoTone, EditTwoTone, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useMemo, useState } from 'react';
import { EquipmentModelV2 } from 'models/EquipmentModelV2';
import { equipmentRoutes } from 'modules/Equipment/Static/equipmentRoutes';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';

type PageComponent = FC & { layout: typeof MainLayout };

const EquipmentPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, EquipmentModelV2.tableName);

    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
    });
    const [data, setData] = useState<any[]>([]);

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

    const actionColumns = [
        {
            title: 'actions:actions',
            key: 'actions',
            render: (record: any) => (
                <Space key={priorityStatus.id ?? 'none'}>
                    <LinkButton
                        icon={<EyeTwoTone />}
                        path={'/equipment/:id'.replace(':id', record.id)}
                    />
                    <LinkButton
                        icon={<EditTwoTone />}
                        path={'/equipment/edit/:id'.replace(':id', record.id)}
                        disabled={!modes.includes(ModeEnum.Update)}
                    />
                    {record.priority === null ? (
                        <></>
                    ) : (
                        <>
                            <Button
                                onClick={() => {
                                    if (priorityStatus.id === null) {
                                        setPriorityStatus({
                                            newOrder: parseInt(record.priority) - 1,
                                            id: record.id
                                        });
                                    }
                                }}
                                disabled={record.priority === 1}
                                loading={priorityStatus.id !== null && record.priority !== 1}
                                icon={<CaretUpOutlined />}
                            />
                            <Button
                                onClick={() => {
                                    if (priorityStatus.id === null) {
                                        setPriorityStatus({
                                            newOrder: parseInt(record.priority) + 1,
                                            id: record.id
                                        });
                                    }
                                }}
                                disabled={data[0].listDataCount === record.priority}
                                loading={
                                    priorityStatus.id !== null &&
                                    data[0].listDataCount !== record.priority
                                }
                                icon={<CaretDownOutlined />}
                            />
                        </>
                    )}
                </Space>
            )
        }
    ];

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={EquipmentModelV2}
                routeDetailPage={'/equipment/:id'}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                triggerPriorityChange={{
                    id: priorityStatus.id,
                    setId: setPriorityStatus,
                    newOrder: priorityStatus.newOrder,
                    orderingField: 'priority',
                    parentId: '*'
                }}
                sortDefault={[{ ascending: true, field: 'priority' }]}
                actionColumns={actionColumns}
                setData={setData}
            />
        </>
    );
};

EquipmentPage.layout = MainLayout;

export default EquipmentPage;
