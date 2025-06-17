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
    showWarning,
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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState, useRef, Key } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

const { Column } = Table;
const { Link } = Typography;

export interface IAppTableV2Props {
    // Refactory to strong type
    dataModel: any;
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
    components?: any;
    isDragAndDroppable?: boolean;
    items?: any;
    isIndependentScrollable?: boolean;
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
    dataModel,
    hiddenColumns,
    rowSelection,
    linkFields,
    components,
    isDragAndDroppable,
    items,
    isIndependentScrollable
}: IAppTableV2Props) => {
    const { t } = useTranslation();
    const router = useRouter();
    // get filter from cookies if exist
    const filterDrawerRef = useRef() as any | undefined;
    const allColumnKeys = getKeys(columns);
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { graphqlRequestClient } = useAuth();

    const userSettings = state?.userSettings?.find((item: any) => {
        return `${dataModel.resolverName}${router.pathname}` === item.code;
    });
    const initialState = userSettings?.valueJson?.visibleCollumns;

    if (initialState) {
        const storedArray = initialState.filteredColumns;
        const inputArray = checkKeyPresenceInArray('render', columns);
        const titleCheck = checkKeyPresenceInArray('title', columns);
        storedArray.map((a: any) => {
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

    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Key[]>(
        initialState
            ? initialState.visibleColumnKeys
            : allColumnKeys.filter((x) => {
                  return !hiddenColumns.includes(x);
              })
    );
    const [fixedColumns, setFixedColumns] = useState<Key[]>(initialState?.fixedColumns ?? []);
    const [filteredColumns, setFilteredColumns] = useState<any[]>(
        initialState?.filteredColumns ?? setCustomColumnsProps(columns)
    );

    const [tableColumns, setTableColumns] = useState<any[]>(setCustomColumnsProps(columns));

    useEffect(() => {
        setFilteredColumns(setCustomColumnsProps(columns));
    }, [columns]);

    if (data) {
        formatDigitsForData(data);
    }

    const [onSave, setOnSave] = useState<boolean>(false);

    const updateUserSettings = useCallback(async () => {
        const newsSettings = {
            ...userSettings,
            valueJson: {
                ...userSettings?.valueJson,
                visibleCollumns: {
                    filteredColumns: filteredColumns,
                    tableColumns: tableColumns,
                    visibleColumnKeys: visibleColumnKeys,
                    fixedColumns: fixedColumns
                }
            }
        };
        const updateQuery = gql`
            mutation (
                $warehouseWorkerSettingsId: String!
                $input: UpdateWarehouseWorkerSettingInput!
            ) {
                updateWarehouseWorkerSetting(id: $warehouseWorkerSettingsId, input: $input) {
                    id
                    code
                    valueJson
                }
            }
        `;
        const updateVariables = {
            warehouseWorkerSettingsId: userSettings.id,
            input: { valueJson: newsSettings.valueJson }
        };
        try {
            const queryInfo: any = await graphqlRequestClient.request(updateQuery, updateVariables);
            dispatch({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: state.userSettings.map((item: any) => {
                    return item.id === queryInfo?.updateWarehouseWorkerSetting?.id
                        ? queryInfo.updateWarehouseWorkerSetting
                        : item;
                })
            });
        } catch (error) {
            console.log('queryInfo update appTableV2 error', error);
            showWarning(t('messages:config-save-error'));
        }
    }, [visibleColumnKeys, fixedColumns, filteredColumns, tableColumns]);

    const createUsersSettings = useCallback(async () => {
        const newsSettings = {
            valueJson: {
                visibleCollumns: {
                    filteredColumns: filteredColumns,
                    tableColumns: tableColumns,
                    visibleColumnKeys: visibleColumnKeys,
                    fixedColumns: fixedColumns
                }
            },
            code: `${dataModel.resolverName}${router.pathname}`,
            warehouseWorkerId: state.user.id
        };
        const createQuery = gql`
            mutation ($input: CreateWarehouseWorkerSettingInput!) {
                createWarehouseWorkerSetting(input: $input) {
                    id
                    code
                    valueJson
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(createQuery, {
                input: newsSettings
            });
            dispatch({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: [...state.userSettings, queryInfo.createWarehouseWorkerSetting]
            });
        } catch (error) {
            console.log('queryInfo create appTableV2 error', error);
            showWarning(t('messages:config-save-error'));
        }
    }, [visibleColumnKeys, fixedColumns, filteredColumns, tableColumns]);

    useEffect(() => {
        if (onSave) {
            if (userSettings) {
                updateUserSettings();
            } else {
                createUsersSettings();
            }
        }
        setOnSave(false);
        return () => {};
    }, [onSave]);

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

    const dataSource = isDragAndDroppable
        ? items!.map((item: any, index: number) => ({
              ...item,
              key: item.id,
              index
          }))
        : data;

    const insideScroll = { x: '100%', y: 400 };
    const insideScrollPagination = { pageSize: dataSource.length, showSizeChanger: false };

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
                dataSource={dataSource}
                scroll={isIndependentScrollable ? insideScroll : scroll}
                size="small"
                loading={isLoading}
                onChange={onChange}
                // rowSelection={rowSelection}
                pagination={
                    isIndependentScrollable
                        ? insideScrollPagination
                        : pagination && {
                              position: ['bottomRight'],
                              total: pagination.total,
                              current: pagination.current,
                              pageSize: pagination.itemsPerPage,
                              showSizeChanger: true,
                              showTotal: (total, range) =>
                                  `${range[0]}-${range[1]} sur ${total} éléments`,
                              onChange: (page, pageSize) => {
                                  handlePaginationChange(page, pageSize);
                              }
                          }
                }
                rowSelection={rowSelection}
                components={components}
            >
                {newTableColumns.map((c) => {
                    return (
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
                    );
                })}
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
