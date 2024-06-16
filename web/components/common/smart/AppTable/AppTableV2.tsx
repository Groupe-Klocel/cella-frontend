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
    formatDigitsForData,
    formatUTCLocaleDateTime,
    isStringDateTime,
    formatUTCLocaleDate,
    isStringDate
} from '@helpers';
import { Space, Button, Table, Typography } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import { isString } from 'lodash';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState, useRef, Key } from 'react';

const { Column } = Table;
const { Link } = Typography;

export interface IAppTableV2Props {
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
    linkFields?: any;
}

const AppTableV2: FC<IAppTableV2Props> = ({
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
    rowSelection,
    linkFields
}: IAppTableV2Props) => {
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

    // #region links generation
    const renderLink = (text: string, record: any, dataIndex: string) => {
        // retrieve the column data index
        const linkObject = linkFields.find((item: any) => item.name === dataIndex);
        const suffix = linkObject.link.substring(linkObject.link.lastIndexOf('/') + 1);
        //handle case where the suffix is at the end of a chain of characters
        const recordKey = Object.keys(record).find((key) => key.endsWith(suffix));
        const link = `${linkObject.link.replace(`/${suffix}`, '')}/${record[recordKey!]}`;
        const completeLink = `${process.env.NEXT_PUBLIC_WMS_URL}/${
            router.locale !== 'en-US' ? router.locale + '/' : ''
        }${link}`;
        if (linkObject) {
            return <Link href={completeLink}>{text}</Link>;
        }
        return text;
    };

    const columnWithLinks = tableColumns.map((e: any) => {
        // if the column is in linkFields.name too, do the following
        const linkObject = linkFields.find((item: any) => item.name === e.dataIndex);

        return linkObject
            ? {
                  ...e,
                  render: (text: any, record: any) => renderLink(text, record, e.dataIndex),
                  dataIndex: e.dataIndex
              }
            : e;
    });
    // #endregion

    const render = (text: any) =>
        text === true ? (
            <CheckCircleOutlined style={{ color: 'green' }} />
        ) : text === false ? (
            <CloseSquareOutlined style={{ color: 'red' }} />
        ) : isString(text) && isStringDateTime(text) ? (
            formatUTCLocaleDateTime(text, router.locale)
        ) : isString(text) && isStringDate(text) ? (
            formatUTCLocaleDate(text, router.locale)
        ) : (
            text
        );
    const newTableColumns = columnWithLinks.map((e: any) =>
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
        (val) => {
            setVisibleColumnKeys(val);
        },
        [setVisibleColumnKeys]
    );

    // make wrapper function to give child
    const childSetFixedColumns = useCallback(
        (val) => {
            setFixedColumns(val);
        },
        [setFixedColumns]
    );

    // make wrapper function to give child
    const childSetTableColumns = useCallback(
        (val) => {
            const valWithoutDuplicates = val.filter(
                (obj: any, index: number, self: any) =>
                    index === self.findIndex((t: any) => t.key === obj.key)
            );
            setFilteredColumns(valWithoutDuplicates);
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
        setTableColumns(columnWithLinks);
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
                        defaultSortOrder={c.defaultSortOrder}
                    />
                ))}
            </Table>
        </PageTableContentWrapper>
    );
};

AppTableV2.displayName = 'AppTableV2';

AppTableV2.defaultProps = {
    stickyActions: {
        export: {
            active: false
        }
        // delete: false
    },
    filter: true,
    scroll: { x: '100%' }
};

export { AppTableV2 };
