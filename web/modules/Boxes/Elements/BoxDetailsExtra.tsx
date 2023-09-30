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
import { AppTable, ContentSpin, LinkButton } from '@components';
import { EyeTwoTone } from '@ant-design/icons';
import {
    pathParams,
    getModesFromPermissions,
    DataQueryType,
    PaginationType,
    DEFAULT_PAGE_NUMBER,
    DEFAULT_ITEMS_PER_PAGE,
    useBoxLines,
    flatten
} from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Col, Divider, Empty, Row, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';

const { Title } = Typography;

export interface IItemDetailsProps {
    boxId?: string | any;
    huId?: string | any;
}

const BoxDetailsExtra = ({ boxId, huId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const [boxLines, setBoxLines] = useState<DataQueryType>();
    const { permissions } = useAppState();
    const BoxLineModes = getModesFromPermissions(permissions, Table.HandlingUnitContentOutbound);

    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

    const { isLoading, data, error } = useBoxLines(
        { handlingUnitOutboundId: boxId },
        pagination.current,
        pagination.itemsPerPage,
        {
            field: 'lineNumber',
            ascending: true
        }
    );

    useEffect(() => {
        if (data) {
            setBoxLines(data?.handlingUnitContentOutbounds);
            setPagination({
                ...pagination,
                total: data?.handlingUnitContentOutbounds?.count
            });
        }
    }, [data]);

    //explore and create fields to make them accessible to columns
    const dataByBoxId = data?.handlingUnitContentOutbounds?.results.map((item: any) => {
        return flatten(item);
    });

    // make wrapper function to give child
    const onChangePagination = useCallback(
        (currentPage, itemsPerPage) => {
            // Re fetch data for new current page or items per page
            setPagination({
                total: boxLines?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        },
        [setPagination, boxLines]
    );

    const boxLinesColumns = [
        {
            title: t('d:lineNumber'),
            dataIndex: 'lineNumber',
            key: 'lineNumber',
            sorter: {
                multiple: 1
            },
            showSorterTooltip: false
        },
        {
            title: t('d:status'),
            dataIndex: 'statusText',
            key: 'status',
            sorter: {
                multiple: 2
            },
            showSorterTooltip: false
        },
        {
            title: t('d:delivery_name'),
            dataIndex: 'delivery_name',
            key: 'delivery_name',
            sorter: {
                multiple: 3
            },
            showSorterTooltip: false
        },
        {
            title: t('d:deliveryLine_lineNumber'),
            dataIndex: 'deliveryLine_lineNumber',
            key: 'deliveryLine_lineNumber',
            sorter: {
                multiple: 4
            },
            showSorterTooltip: false
        },
        {
            title: t('d:logisticUnit'),
            dataIndex: 'handlingUnitContent_articleLuBarcode_articleLu_lu_name',
            key: 'handlingUnitContent_articleLuBarcode_articleLu_lu_name',
            sorter: {
                multiple: 5
            },
            showSorterTooltip: false
        },
        {
            title: 'd:handlingUnitContent_article_name',
            dataIndex: 'handlingUnitContent_article_name',
            key: 'handlingUnitContent_article_name',
            sorter: {
                multiple: 6
            },
            showSorterTooltip: false
        },
        {
            title: 'd:handlingUnitContent_article_additionalDescription',
            dataIndex: 'handlingUnitContent_article_additionalDescription',
            key: 'handlingUnitContent_article_additionalDescription',
            sorter: {
                multiple: 7
            },
            showSorterTooltip: false
        },
        {
            title: t('d:pickingLocationName'),
            dataIndex: 'pickingLocation_name',
            key: 'pickingLocation_name',
            sorter: {
                multiple: 4
            },
            showSorterTooltip: false
        },
        {
            title: 'd:quantityToBePicked',
            dataIndex: 'quantityToBePicked',
            key: 'quantityToBePicked',
            sorter: {
                multiple: 8
            },
            showSorterTooltip: false
        },
        {
            title: 'd:pickedQuantity',
            dataIndex: 'pickedQuantity',
            key: 'pickedQuantity',
            sorter: {
                multiple: 9
            },
            showSorterTooltip: false
        },
        {
            title: 'd:missingQuantity',
            dataIndex: 'missingQuantity',
            key: 'missingQuantity',
            sorter: {
                multiple: 10
            },
            showSorterTooltip: false
        },
        {
            title: 'd:preparationModeText',
            dataIndex: 'preparationModeText',
            key: 'preparationModeText',
            sorter: {
                multiple: 11
            },
            showSorterTooltip: false
        },
        {
            title: 'd:handlingUnitContent_reservation',
            dataIndex: 'handlingUnitContent_reservation',
            key: 'handlingUnitContent_reservation',
            sorter: {
                multiple: 12
            },
            showSorterTooltip: false
        },
        {
            title: t('actions:actions'),
            key: 'actions',
            render: (record: { id: string }) => (
                <LinkButton
                    icon={<EyeTwoTone />}
                    path={pathParams('/boxes/boxLine/[id]', record.id)}
                />
            )
        }
    ];

    return (
        <>
            {BoxLineModes.length > 0 && BoxLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <Row justify="space-between">
                        <Col span={6}>
                            <Title level={4}>
                                {t('common:associated', { name: t('menu:boxLines') })}
                            </Title>
                        </Col>
                        <Col span={6}>
                            {/* <LinkButton
                        title={t('actions:add2', { name: t('menu:boxLine') })}
                        // path="/add-boxLine"
                        path={pathParams('/add-boxLine', id)}
                        type="primary"
                    /> */}
                        </Col>
                    </Row>
                    {!isLoading ? (
                        dataByBoxId && dataByBoxId.length != 0 ? (
                            <AppTable
                                type="associatedBoxLines"
                                columns={boxLinesColumns}
                                data={dataByBoxId}
                                pagination={pagination}
                                isLoading={isLoading}
                                setPagination={onChangePagination}
                                filter={false}
                            />
                        ) : (
                            <Empty />
                        )
                    ) : (
                        <ContentSpin />
                    )}
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { BoxDetailsExtra };
