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
import {
    TableFilter,
    WrapperStickyActions,
    PageTableContentWrapper,
    DrawerItems,
    ContentSpin
} from '@components';
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
import { Space, Button, Table, Typography, Empty } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import { debounce, isString, set } from 'lodash';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState, useRef, useMemo, Key, use } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import React from 'react';

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
    sortInfos?: any;
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
    sortInfos,
    data,
    columns,
    scroll,
    isLoading,
    pagination,
    setPagination,
    dataModel,
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
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { graphqlRequestClient } = useAuth();

    const [userSettings, setUserSettings] = useState<any>(
        state?.userSettings?.find((item: any) => {
            return `${dataModel.resolverName}${router.pathname}` === item.code;
        })
    );
    let initialState = userSettings?.valueJson?.allCollumnsInfos;
    if (initialState && columns.filter((col) => col.key === 'actions').length > 0) {
        initialState = initialState?.filter((col: any) => col.key !== 'actions');
        initialState = [columns.find((col) => col.key === 'actions'), ...initialState];
    }

    const [allCollumns, setAllCollumns] = useState<any[]>(initialState ?? columns);

    // Format data only when it changes
    useEffect(() => {
        if (data) {
            formatDigitsForData(data);
        }
    }, [data]);

    // #region updateUserSettings

    async function updateUserSettings(
        columnsWidth?: any,
        newUserSettings?: any,
        allCollumnsInfos?: any
    ) {
        const newsSettings = {
            ...newUserSettings,
            valueJson: {
                ...newUserSettings?.valueJson,
                allCollumnsInfos: allCollumnsInfos ?? allCollumns,
                columnsWidth: columnsWidth ?? newUserSettings?.valueJson?.columnsWidth ?? {}
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
            warehouseWorkerSettingsId: newUserSettings.id,
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
            setUserSettings(queryInfo.updateWarehouseWorkerSetting);
        } catch (error) {
            console.log('queryInfo update appTableV2 error', error);
            showWarning(t('messages:config-save-error'));
        }
    }

    // 2. Debounce wrapper for updateUserSettings
    const debouncedUpdateUserSettings = useRef(
        debounce((columnsWidth: any, newUserSettings?: any, allCollumnsInfos?: any) => {
            updateUserSettings(columnsWidth, newUserSettings, allCollumnsInfos);
        }, 500)
    ).current;

    // #endregion

    // #region createUsersSettings

    async function createUsersSettings(columnsWidth?: any, allCollumnsInfos?: any) {
        const newsSettings = {
            valueJson: {
                allCollumnsInfos: allCollumnsInfos ?? allCollumns,
                columnsWidth: columnsWidth ?? {}
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
            setUserSettings(queryInfo.createWarehouseWorkerSetting);
        } catch (error) {
            console.log('queryInfo create appTableV2 error', error);
            showWarning(t('messages:config-save-error'));
        }
    }

    const debouncedCreateUsersSettings = useRef(
        debounce((columnsWidth: any, allCollumnsInfos?: any) => {
            createUsersSettings(columnsWidth, allCollumnsInfos);
        }, 500)
    ).current;

    // #endregion

    useEffect(() => {
        return () => {
            debouncedUpdateUserSettings.cancel();
            debouncedCreateUsersSettings.cancel();
        };
    }, []);

    function changeFilter(columnWidths: any, userSettings: any, allCollumnsInfos: any) {
        if (userSettings) {
            debouncedUpdateUserSettings(columnWidths, userSettings, allCollumnsInfos);
        } else {
            debouncedCreateUsersSettings(columnWidths, allCollumnsInfos);
        }
    }

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

    const columnWithLinks = allCollumns.map((e: any) => {
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

    const handlePaginationChange = (page: number, pageSize: number) => {
        setPagination(page, pageSize);
    };

    const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);

    const handleReset = () => {
        setAllCollumns(columns);
    };

    const handleSave = () => {
        changeFilter(undefined, userSettings, allCollumns);
        setIsSearchDrawerOpen(false);
    };

    function drawerProps() {
        return {
            size: 700,
            isOpen: isSearchDrawerOpen,
            setIsOpen: setIsSearchDrawerOpen,
            type: 'OPEN_DRAWER',
            title: 'actions:filter',
            cancelButtonTitle: 'actions:reset',
            cancelButton: true,
            comfirmButtonTitle: 'actions:save',
            comfirmButton: true,
            content: (
                <TableFilter allColumnsInfos={allCollumns} setAllColumnsInfos={setAllCollumns} />
            ),
            onComfirm: () => handleSave(),
            onCancel: () => handleReset()
        } as any;
    }

    const dataSource = isDragAndDroppable
        ? items!.map((item: any, index: number) => ({
              ...item,
              key: item.id,
              index
          }))
        : data;

    const insideScroll = { x: '100%', y: 400 };
    const insideScrollPagination = { pageSize: dataSource.length, showSizeChanger: false };

    // 1. Add state for column widths
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() =>
        columns.reduce(
            (acc, col) => {
                Object.keys(userSettings?.valueJson?.columnsWidth ?? {}).forEach((key) => {
                    if (key === col.key) {
                        acc[col.key] = userSettings.valueJson.columnsWidth[key];
                    }
                });
                if (!acc[col.key]) {
                    acc[col.key] = typeof col.width === 'number' ? col.width : 160;
                }
                return acc;
            },
            {} as { [key: string]: number }
        )
    );
    // 2. Custom header cell for resizing
    const ResizableTitle = (props: any) => {
        const { onResize, width, ...restProps } = props;
        return (
            <th
                {...restProps}
                style={{
                    ...restProps.style,
                    width,
                    position: 'relative' // Ensure relative positioning for the resizer
                }}
            >
                {restProps.children}
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        cursor: 'col-resize',
                        userSelect: 'none',
                        zIndex: 1,
                        background: 'transparent'
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startWidth = width;
                        const onMouseMove = (moveEvent: MouseEvent) => {
                            const newWidth = Math.max(startWidth + moveEvent.clientX - startX, 50);
                            onResize(newWidth);
                        };
                        const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    }}
                />
            </th>
        );
    };

    // 3. Update columns with resizable header
    const resizableColumns = newTableColumns.map((col: any) => ({
        ...col,
        width: columnWidths[col.key], // width is a number
        onHeaderCell: (column: any) => ({
            width: columnWidths[col.key],
            onResize: (newWidth: number) => {
                setColumnWidths((prev) => ({
                    ...prev,
                    [col.key]: Math.max(newWidth, 80) // minimum width
                }));
                changeFilter(
                    {
                        ...columnWidths,
                        [col.key]: Math.max(newWidth, 80)
                    },
                    userSettings,
                    allCollumns
                );
            }
        })
    }));

    // 4. Add custom components for header cell
    const tableComponents = {
        ...components,
        header: {
            cell: ResizableTitle
        }
    };

    // Ensure scroll.x is always set for fixed table layout
    const tableScroll = isIndependentScrollable
        ? insideScroll
        : scroll && scroll.x
          ? scroll
          : { x: '100%' };

    return (
        <PageTableContentWrapper>
            <DrawerItems {...drawerProps()} />
            <WrapperStickyActions>
                <Space direction="vertical">
                    {filter && (
                        <Button
                            type="primary"
                            icon={<SettingOutlined />}
                            onClick={() => setIsSearchDrawerOpen(true)}
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
                scroll={tableScroll}
                size="small"
                loading={isLoading}
                onChange={onChange}
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
                locale={{
                    emptyText: !isLoading ? (
                        <Empty description={<span>{t('messages:no-data')}</span>} />
                    ) : null
                }}
                rowSelection={rowSelection}
                components={tableComponents}
                tableLayout="fixed"
            >
                {resizableColumns.map((c) => {
                    return (
                        <Column
                            hidden={c.hidden}
                            title={() => {
                                return (
                                    <>
                                        {typeof c.title === 'string' ? t(c.title) : c.title}
                                        {sortInfos && (
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    transform:
                                                        'translateY(-10px) translateX(22.5px)',
                                                    color: '#1677ff',
                                                    opacity: 0.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    height: '100%'
                                                }}
                                            >
                                                {
                                                    sortInfos
                                                        .map((sortInfo: any, index: number) => {
                                                            if (sortInfo.field === c.key) {
                                                                return `${index + 1}`;
                                                            }
                                                            return null;
                                                        })
                                                        .filter((item: any) => item !== null)[0]
                                                }
                                            </span>
                                        )}
                                    </>
                                );
                            }}
                            dataIndex={c.dataIndex}
                            key={c.key}
                            fixed={c.fixed}
                            width={c.width} // width is a number
                            sorter={c.sorter}
                            showSorterTooltip={c.showSorterTooltip}
                            render={c.render}
                            defaultSortOrder={c.defaultSortOrder}
                            onHeaderCell={c.onHeaderCell}
                        />
                    );
                })}
            </Table>
        </PageTableContentWrapper>
    );
};

AppTableV2.displayName = 'AppTableV2';

export { AppTableV2 };
