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
import { SettingOutlined, FileExcelOutlined, DeleteOutlined } from '@ant-design/icons';
import { TableFilter, WrapperStickyActions, PageTableContentWrapper } from '@components';
import {
    getKeys,
    setCustomColumnsProps,
    cookie,
    checkKeyPresenceInArray,
    showError
} from '@helpers';
import { Space, Button, Table } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useCallback, useEffect, useState, useRef, Key } from 'react';

export interface IAppTableProps {
    // Refactory to strong type
    type: string;
    data: Array<any> | undefined;
    isLoading?: boolean;
    columns: any[]; //need to find what is wrong with this MyColumnType[],
    scroll?: {
        x?: number;
        y?: number;
    };
    pagination?: any;
    setPagination?: any;
}

const AppTable: FC<IAppTableProps> = ({
    data,
    columns,
    scroll,
    isLoading,
    pagination,
    setPagination,
    type
}) => {
    const { t } = useTranslation();
    // get filter from cookies if exist

    const filterDrawerRef = useRef() as any | undefined;
    const allColumnKeys = getKeys(columns);

    const initialState = cookie.get(`${type}-filter-table`)
        ? JSON.parse(cookie.get(`${type}-filter-table`)!)
        : null;

    if (initialState) {
        const storedArray = initialState.filteredColumns;
        const inputArray = checkKeyPresenceInArray('render', columns);
        let updatedStoredArr = storedArray.map((a: any) => {
            const exists = inputArray.find((b) => a.key == b.key);
            if (exists) {
                a.render = exists.render;
            }
            return a;
        });
    }

    const [onSave, setOnSave] = useState<boolean>(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Key[]>(
        initialState !== null ? initialState.visibleColumnKeys : allColumnKeys
    );
    const [fixedColumns, setFixedColumns] = useState<Key[]>(
        initialState !== null ? initialState.fixedColumns : []
    );
    const [filteredColumns, setFilteredColumns] = useState<any[]>(
        initialState !== null ? initialState.filteredColumns : setCustomColumnsProps(columns)
    );
    const [tableColumns, setTableColumns] = useState<any[]>(
        initialState !== null ? initialState.tableColumns : setCustomColumnsProps(columns)
    );

    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedRowKeys: Key[], record: any) => {
            setSelectedRowKeys(selectedRowKeys);
        }
    };
    // make wrapper function to give child
    const childSetVisibleColumnKeys = useCallback(
        (val: any) => {
            setVisibleColumnKeys(val);
        },
        [setVisibleColumnKeys]
    );

    // make wrapper function to give child
    const childSetFixedColumns = useCallback(
        (val: any) => {
            setFixedColumns(val);
        },
        [setFixedColumns]
    );

    // make wrapper function to give child
    const childSetTableColumns = useCallback(
        (val: any) => {
            setFilteredColumns(val);
        },
        [setFilteredColumns]
    );

    const handleReset = () => {
        setVisibleColumnKeys(allColumnKeys);
        setTableColumns(columns);
        filterDrawerRef!.current.reset(allColumnKeys, setCustomColumnsProps(columns));
    };

    const handleSave = () => {
        setOnSave(true);
        closeDrawer();
    };

    // give a deleteMutation to app table to know what data type should be deleted
    const deleteRecords = () => {
        if (Array.isArray(selectedRowKeys) && selectedRowKeys.length) {
            // trigger delete mutation
            alert(`delete articles ${JSON.stringify(selectedRowKeys)}`);
        } else {
            showError(t('messages:action-impossible', { name: t('actions:delete') }));
        }
    };

    const dispatchDrawer = useDrawerDispatch();

    const closeDrawer = useCallback(
        () => dispatchDrawer({ type: 'CLOSE_DRAWER' }),
        [dispatchDrawer]
    );

    const openFilterDrawer = useCallback(
        () =>
            dispatchDrawer({
                size: 700,
                type: 'OPEN_DRAWER',
                title: t('actions:filter'),
                cancelButtonTitle: t('actions:reset'),
                cancelButton: true,
                onCancel: () => handleReset(),
                comfirmButtonTitle: t('actions:save'),
                comfirmButton: true,
                onComfirm: () => handleSave(),
                content: (
                    <TableFilter
                        ref={filterDrawerRef}
                        cookieKey={type}
                        columnsToFilter={filteredColumns}
                        visibleKeys={visibleColumnKeys}
                        fixKeys={fixedColumns}
                        onSort={childSetTableColumns}
                        onShowChange={childSetVisibleColumnKeys}
                        onFixed={childSetFixedColumns}
                    />
                )
            }),
        [dispatchDrawer, visibleColumnKeys]
    );

    useEffect(() => {
        if (visibleColumnKeys) {
            if (visibleColumnKeys.length) {
                const temp = filteredColumns.filter((f: any) => visibleColumnKeys.includes(f.key));
                setTableColumns(temp);
            } else {
                setTableColumns(filteredColumns);
            }
        }

        return () => {};
    }, [visibleColumnKeys, filteredColumns]);

    useEffect(() => {
        if (onSave) {
            cookie.set(
                `${type}-filter-table`,
                JSON.stringify({
                    filteredColumns: filteredColumns,
                    tableColumns: tableColumns,
                    visibleColumnKeys: visibleColumnKeys,
                    fixedColumns: fixedColumns
                })
            );
        }
        setOnSave(false);
        return () => {};
    }, [onSave]);

    return (
        <PageTableContentWrapper>
            <WrapperStickyActions>
                <Space direction="vertical">
                    <Button
                        type="primary"
                        icon={<SettingOutlined />}
                        onClick={() => openFilterDrawer()}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        onClick={deleteRecords}
                        type="primary"
                        danger
                    />
                    <Button icon={<FileExcelOutlined />} onClick={() => alert('trigger export')} />
                </Space>
            </WrapperStickyActions>
            <Table
                rowKey="id"
                columns={tableColumns}
                dataSource={data}
                scroll={scroll}
                size="small"
                loading={isLoading}
                rowSelection={rowSelection}
                pagination={
                    pagination && {
                        position: ['bottomRight'],
                        total: pagination.total,
                        current: pagination.current,
                        pageSize: pagination.itemsPerPage,
                        onChange: (page, pageSize) => {
                            setPagination(page, pageSize);
                        }
                    }
                }
            />
        </PageTableContentWrapper>
    );
};

AppTable.displayName = 'AppTable';

export { AppTable };
