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
import {
    SettingOutlined,
    FileExcelOutlined,
    CheckCircleOutlined,
    CloseSquareOutlined
} from '@ant-design/icons';
import { TableFilter, WrapperStickyActions, PageTableContentWrapper } from '@components';
import {
    getKeys,
    setCustomColumnsProps,
    checkKeyPresenceInArray,
    formatDigitsForData
} from '@helpers';
import { Space, Button, Table } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import { isString } from 'lodash';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState, useRef, Key } from 'react';

const { Column } = Table;

export interface IAppTableProps {
    // Refactory to strong type
    type: string;
    data: Array<any> | undefined;
    isLoading?: boolean;
    columns: any[]; //need to find what is wrong with this MyColumnType[],
    scroll?: {
        x?: number | string;
        y?: number | string;
    };
    pagination?: any;
    setPagination?: any;
    stickyActions?: {
        export?: any;
        // delete?: boolean;
    };
    filter?: boolean;
    onChange?: any;
    hiddenColumns?: any;
    rowSelection?: any;
}

const AppTable: FC<IAppTableProps> = ({
    onChange,
    stickyActions,
    filter,
    data,
    columns,
    scroll,
    isLoading,
    pagination,
    setPagination,
    type,
    hiddenColumns,
    rowSelection
}: IAppTableProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    // get filter from cookies if exist
    const filterDrawerRef = useRef() as any | undefined;
    const allColumnKeys = getKeys(columns);
    let initialState;

    if (data) {
        formatDigitsForData(data);
    }
    if (!hiddenColumns) {
        hiddenColumns = [];
    }

    if (typeof window !== 'undefined') {
        initialState = localStorage.getItem(`${type}-filter-table`)
            ? JSON.parse(localStorage.getItem(`${type}-filter-table`)!)
            : null;
    }

    if (initialState) {
        const storedArray = initialState.filteredColumns;
        const inputArray = checkKeyPresenceInArray('render', columns);
        const titleCheck = checkKeyPresenceInArray('title', columns);
        const updatedStoredArr = storedArray.map((a: any) => {
            const exists = inputArray.find((b) => a.key == b.key);
            const titles = titleCheck.find((b) => a.key == b.key);
            if (exists) {
                a.render = exists.render;
            }
            if (titles) {
                a.title = titles.title;
            }
            return a;
        });
    }

    const [onSave, setOnSave] = useState<boolean>(false);

    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Key[]>(
        initialState !== null
            ? initialState.visibleColumnKeys
            : allColumnKeys.filter((x) => {
                  return !hiddenColumns.includes(x);
              })
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

    const render = (text: any) =>
        text === true ? (
            <CheckCircleOutlined style={{ color: 'green' }} />
        ) : text === false ? (
            <CloseSquareOutlined style={{ color: 'red' }} />
        ) : (
            text
        );
    const newTableColumns = tableColumns.map((e: any) =>
        e.render ? e : (e = { ...e, render: render })
    );

    // Make each row checkable

    // const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

    // const rowSelection = {
    //     selectedRowKeys,
    //     onChange: (selectedRowKeys: Key[], record: any) => {
    //         setSelectedRowKeys(selectedRowKeys);
    //     }
    // };

    // give a deleteMutation to app table to know what data type should be deleted
    // const deleteRecords = () => {
    //     if (Array.isArray(selectedRowKeys) && selectedRowKeys.length) {
    //         // trigger delete mutation
    //         alert(`delete articles ${JSON.stringify(selectedRowKeys)}`);
    //     } else {
    //         showError(t('messages:action-impossible', { name: t('actions:delete') }));
    //     }
    // };

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

    const handlePaginationChange = (page: number, pageSize: number) => {
        setPagination(page, pageSize);
    };

    const handleReset = () => {
        const filteredKeys = allColumnKeys.filter((x) => {
            return !hiddenColumns.includes(x);
        });
        setVisibleColumnKeys(filteredKeys);
        setTableColumns(columns);
        filterDrawerRef!.current.reset(filteredKeys, setCustomColumnsProps(columns));
    };

    const handleSave = () => {
        setOnSave(true);
        closeDrawer();
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
                title: 'actions:filter',
                cancelButtonTitle: 'actions:reset',
                cancelButton: true,
                onCancel: () => handleReset(),
                comfirmButtonTitle: 'actions:save',
                comfirmButton: true,
                onComfirm: () => handleSave(),
                content: (
                    <TableFilter
                        ref={filterDrawerRef}
                        columnsToFilter={filteredColumns}
                        visibleKeys={visibleColumnKeys}
                        fixKeys={fixedColumns}
                        onSort={childSetTableColumns}
                        onShowChange={childSetVisibleColumnKeys}
                        onFixed={childSetFixedColumns}
                    />
                )
            }),
        [dispatchDrawer, visibleColumnKeys, filteredColumns]
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
            const news = JSON.stringify({
                filteredColumns: filteredColumns,
                tableColumns: tableColumns,
                visibleColumnKeys: visibleColumnKeys,
                fixedColumns: fixedColumns
            });
            localStorage.setItem(`${type}-filter-table`, news);
        }
        setOnSave(false);
        return () => {};
    }, [onSave]);

    return (
        <PageTableContentWrapper>
            <WrapperStickyActions>
                <Space direction="vertical">
                    {/* {stickyActions?.delete && (
                        <Button
                            icon={<DeleteOutlined />}
                            onClick={deleteRecords}
                            type="primary"
                            danger
                        />
                    )} */}
                    {filter && (
                        <Button
                            type="primary"
                            icon={<SettingOutlined />}
                            onClick={() => openFilterDrawer()}
                        />
                    )}
                    {stickyActions?.export.active && (
                        <Button
                            icon={<FileExcelOutlined />}
                            onClick={stickyActions?.export.function}
                        />
                    )}
                </Space>
            </WrapperStickyActions>
            <Table
                rowKey="id"
                dataSource={data}
                scroll={scroll}
                size="small"
                loading={isLoading}
                onChange={onChange}
                // rowSelection={rowSelection}
                pagination={
                    pagination && {
                        position: ['bottomRight'],
                        total: pagination.total,
                        current: pagination.current,
                        pageSize: pagination.itemsPerPage,
                        onChange: (page, pageSize) => {
                            handlePaginationChange(page, pageSize);
                        }
                    }
                }
                rowSelection={rowSelection}
            >
                {newTableColumns.map((c) => (
                    <Column
                        title={typeof c.title === 'string' ? t(c.title) : c.title}
                        dataIndex={c.dataIndex}
                        key={c.key}
                        fixed={c.fixed}
                        width={c.width}
                        sorter={c.sorter}
                        showSorterTooltip={c.showSorterTooltip}
                        render={c.render}
                    />
                ))}
            </Table>
        </PageTableContentWrapper>
    );
};

AppTable.displayName = 'AppTable';

AppTable.defaultProps = {
    stickyActions: {
        export: {
            active: false
        }
        // delete: false
    },
    filter: true,
    scroll: { x: '100%' }
};

export { AppTable };
