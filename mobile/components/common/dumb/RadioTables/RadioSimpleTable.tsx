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
import { Table } from 'antd';
import { FC } from 'react';
import styled from 'styled-components';

const StyledTable = styled(Table)`
    .ant-table {
        font-size: 10px !important;
        max-width: 97% !important;
        background: #fef5e1;
    }
    .ant-table-thead > tr > th,
    .ant-table-tbody > tr > td {
        height: 5px !important;
        padding: 2px !important;
    }
`;

export interface IRadioSimpleTableProps {
    columns: any[];
    displayedLocations: Array<any> | undefined;
}

const RadioSimpleTable: FC<IRadioSimpleTableProps> = ({
    columns,
    displayedLocations
}: IRadioSimpleTableProps) => {
    return (
        <>
            <StyledTable
                columns={columns}
                dataSource={displayedLocations}
                pagination={false}
                size="small"
            />
        </>
    );
};

RadioSimpleTable.displayName = 'RadioSimpleTable';

export { RadioSimpleTable };
