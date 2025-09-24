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
import { CaretUpOutlined, CaretDownOutlined, EyeTwoTone } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { AppTable } from '@components';
import { equipmentsData } from 'fake-data/equipments';

export const EquipmentsList = () => {
    const columns = [
        {
            title: 'd:priority',
            dataIndex: 'priority',
            key: 'priority',
            fixed: 'left'
        },
        {
            title: 'd:type',
            dataIndex: 'type',
            key: 'type'
        },
        {
            title: 'd:name',
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: 'd:status',
            dataIndex: 'status',
            key: 'status'
        },
        {
            title: 'd:available',
            dataIndex: 'available',
            key: 'available'
        },
        {
            title: 'd:distributed',
            dataIndex: 'distributed',
            key: 'distributed'
        },
        {
            title: 'actions:actions',
            key: 'actions',
            fixed: 'right',
            render: (record: { id: number; name: string }) => (
                <Space>
                    <Button onClick={() => alert(`GO UP `)} icon={<CaretUpOutlined />} />
                    <Button onClick={() => alert(`GO DOWN `)} icon={<CaretDownOutlined />} />
                    <Button
                        icon={<EyeTwoTone />}
                        onClick={() => alert(`View ${record.id} - ${record.name}`)}
                    />
                </Space>
            )
        }
    ];
    return <AppTable type="equipments" columns={columns} data={equipmentsData} />;
};
