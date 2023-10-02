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
import { Button, Col, Row, Switch } from 'antd';
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
import useTranslation from 'next-translate/useTranslation';
import { ModeEnum, Table } from 'generated/graphql';
import { ColumnType } from 'antd/lib/table';
import { useAppState } from 'context/AppContext';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import { useRouter } from 'next/router';

export interface IPermissionListProps {
    tables: any;
    searchCriteria?: any;
    setEnableUpdate?: any;
    setUpdatedRows?: any;
    setUnsavedChanges?: any;
    warehouseId?: any;
}

const PermissionList = ({
    tables,
    searchCriteria,
    setEnableUpdate,
    setUpdatedRows,
    setUnsavedChanges,
    warehouseId
}: IPermissionListProps) => {
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Permission);
    const { t } = useTranslation();
    const router = useRouter();

    const [rolePermissions, setRolePermissions] = useState<DataQueryType>();
    const [rows, setRows] = useState<any>();

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
        setRows(rows);
    }, [data]);

    // Column Switch onChange

    function handleColumnChange(state: any, key: any, rows: any) {
        Object.values(rows).forEach((row: any) => {
            row[key] = state;
        });
        if (setEnableUpdate && warehouseId) setEnableUpdate(true);
        if (setUpdatedRows) setUpdatedRows(rows);
        setUnsavedChanges(true);
        refetch();
    }

    // Row Switch onChange
    function handleSwitchChange(e: boolean, record: any, key: any, rows: any) {
        record[key] = e;
        Object.values(rows).forEach((row: any) => {
            if (record['table'] == row['table']) {
                row[key] = e;
            }
        });
        if (setEnableUpdate && warehouseId) setEnableUpdate(true);
        if (setUpdatedRows) setUpdatedRows(rows);
        setUnsavedChanges(true);
        refetch();
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
                            handleColumnChange(true, key, rows);
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
                            handleColumnChange(false, key, rows);
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
                <Switch
                    style={{ backgroundColor: e ? '#0B5E00' : '#9C0000' }}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    onChange={(e) => handleSwitchChange(e, record, key, rows)}
                    defaultChecked={e}
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
                        data={rows}
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
