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
import { AppTable, ContentSpin } from '@components';
import { Button, Switch } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import {
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    DataQueryType,
    PaginationType,
    useGetPermissions,
    getModesFromPermissions
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';
import { ColumnType } from 'antd/lib/table';
import { useAppState } from 'context/AppContext';

import styled from 'styled-components';

const StyledSwitch = styled(Switch)`
    &.ant-switch .ant-switch-inner {
        padding-inline-start: 0 !important;
        padding-inline-end: 0 !important;
    }
`;

export interface IPermissionListProps {
    tables: any;
    searchCriteria?: any;
    setEnableUpdate?: any;
    updatedRows?: any;
    setUpdatedRows?: any;
    setUnsavedChanges?: any;
    warehouseId?: any;
}

const PermissionList = ({
    tables,
    searchCriteria,
    setEnableUpdate,
    updatedRows,
    setUpdatedRows,
    setUnsavedChanges,
    warehouseId
}: IPermissionListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Permission);
    const { t } = useTranslation();

    const [rolePermissions, setRolePermissions] = useState<DataQueryType>();

    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

    const { isLoading, data, error, refetch } = useGetPermissions(
        searchCriteria,
        pagination.current,
        pagination.itemsPerPage,
        null
    );

    interface CustomColumn {
        table: string;
        [key: string]: any;
    }

    interface Row {
        table: string;
        [key: string]: boolean | string;
    }

    useEffect(() => {
        // Initialization of Rows
        const rows: Row[] = [];
        Object.values(tables).forEach((table: any) => {
            const row: Row = { table: table.text, key: table.code };

            Object.keys(ModeEnum).forEach((mode) => {
                row[mode.toLowerCase()] = false;
            });

            rows.push(row);
        });

        // For pagination
        if (data) {
            setRolePermissions(data?.permissions);
            setPagination({
                ...pagination,
                total: rows.length
            });
        }

        // Set Rows values
        data?.permissions?.results.forEach((permission) => {
            Object.values(rows).forEach((row: any) => {
                if (permission.table == row.key) {
                    row[permission.mode] = true;
                }
            });
        });
        setUpdatedRows(rows);
    }, [data]);

    // Column Switch onChange

    function handleColumnChange(state: any, key: any, rows: any) {
        setUpdatedRows((prevUpdatedRows: any) => {
            return prevUpdatedRows.map((row: any) => {
                return { ...row, [key]: state };
            });
        });
        if (setEnableUpdate && warehouseId) {
            setEnableUpdate(true);
            setUnsavedChanges(true);
        }
    }

    // Row Switch onChange
    function handleSwitchChange(e: boolean, record: any, key: any, rows: any) {
        setUpdatedRows((prevUpdatedRows: any) => {
            return prevUpdatedRows.map((row: any) => {
                if (record['table'] == row['table']) {
                    return { ...row, [key]: e };
                }
                return row;
            });
        });
        if (setEnableUpdate && warehouseId) {
            setEnableUpdate(true);
            setUnsavedChanges(true);
        }
    }

    // Set Columns
    const columns: ColumnType<CustomColumn>[] = [
        {
            title: 'd:table',
            dataIndex: ['table'],
            key: 'table'
        }
    ];

    Object.keys(ModeEnum).forEach((key) => {
        key = key.toLowerCase();
        columns.push({
            title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{t(`d:${key}`)}</span>
                    <Button
                        size={'small'}
                        style={{ borderColor: '#0B5E00' }}
                        icon={<CheckOutlined style={{ color: '#0B5E00' }} />}
                        key={key}
                        onClick={(e) => {
                            handleColumnChange(true, key, updatedRows);
                        }}
                        disabled={
                            modes.length > 0 &&
                            modes.includes(ModeEnum.Update) &&
                            warehouseId != null
                                ? false
                                : true
                        }
                    />
                    <Button
                        size={'small'}
                        style={{ borderColor: '#9C0000' }}
                        icon={<CloseOutlined style={{ color: '#9C0000' }} />}
                        key={key}
                        onClick={(e) => {
                            handleColumnChange(false, key, updatedRows);
                        }}
                        disabled={
                            modes.length > 0 &&
                            modes.includes(ModeEnum.Update) &&
                            warehouseId != null
                                ? false
                                : true
                        }
                    />
                </div>
            ),
            dataIndex: [`${key}`],
            key: `${key}`,
            render: (e: boolean | undefined, record: any) => (
                <StyledSwitch
                    style={{ backgroundColor: record[key] ? '#0B5E00' : '#9C0000' }}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    onChange={(e) => handleSwitchChange(e, record, key, updatedRows)}
                    defaultChecked={record[key]}
                    checked={record[key]}
                    disabled={
                        modes.length > 0 && modes.includes(ModeEnum.Update) && warehouseId != null
                            ? false
                            : true
                    }
                />
            )
        });
    });

    return (
        <>
            {rolePermissions ? (
                <>
                    <AppTable
                        type="permissions"
                        columns={columns}
                        data={updatedRows}
                        isLoading={isLoading}
                        pagination={false}
                        setPagination={false}
                        onChange={false}
                        filter={false}
                    />
                </>
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { PermissionList };
