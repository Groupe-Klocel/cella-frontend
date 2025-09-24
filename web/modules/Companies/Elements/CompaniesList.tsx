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
import { Button } from 'antd';
import { companiesData } from 'fake-data/companies';
import { AppTable } from '@components';
import { EyeTwoTone } from '@ant-design/icons';

export const CompaniesList = () => {
    const columns = [
        {
            title: 'd:name',
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: 'common:address',
            dataIndex: 'address',
            key: 'address'
        },
        {
            title: 'common:postalCode',
            dataIndex: 'postal-code',
            key: 'postal-code'
        },
        {
            title: 'common:city',
            dataIndex: 'city',
            key: 'city'
        },
        {
            title: 'common:country',
            dataIndex: 'country',
            key: 'country'
        },
        {
            title: 'd:status',
            dataIndex: 'status',
            key: 'status'
        },
        {
            title: 'actions:actions',
            key: 'actions',
            render: (record: { id: number }) => (
                <Button icon={<EyeTwoTone />} onClick={() => alert(`View ${record.id} `)} />
            )
        }
    ];
    return <AppTable type="companies" columns={columns} data={companiesData} />;
};
