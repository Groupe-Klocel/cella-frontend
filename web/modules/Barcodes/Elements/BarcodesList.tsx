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
    BarcodeOutlined,
    CheckCircleOutlined,
    CloseSquareOutlined,
    EyeTwoTone
} from '@ant-design/icons';
import { AppTable, ContentSpin, LinkButton, NumberOfPrintsModal } from '@components';
import {
    DataQueryType,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    orderByFormater,
    PaginationType,
    pathParams,
    useBarcodes
} from '@helpers';
import { Button, Space } from 'antd';

import useTranslation from 'next-translate/useTranslation';
import { useCallback, useEffect, useState } from 'react';

export type BarcodesListTypeProps = {
    searchCriteria?: any;
};

const BarcodesList = ({ searchCriteria }: BarcodesListTypeProps) => {
    const { t } = useTranslation();
    const stockOwner = t('d:stockOwner');
    const barcode = t('common:barcode');
    const articleDescription = t('d:articleDescription');
    const articleName = t('d:articleName');
    const supplierName = t('d:supplierName');
    const rotation = t('d:rotation');
    const preparationMode = t('d:preparationMode');
    const articleLuLength = t('d:length');
    const articleLuWidth = t('d:width');
    const articleLuHeight = t('d:height');
    const articleLuBaseUnitWeight = t('d:weight');
    const blacklisted = t('d:blacklisted');
    const actions = t('actions:actions');
    const [barcodes, setBarcodes] = useState<any>();
    const [sort, setSort] = useState<any>(null);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

    // make wrapper function to give child
    const onChangePagination = useCallback(
        (currentPage, itemsPerPage) => {
            // Re fetch data for new current page or items per page
            setPagination({
                total: barcodes?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        },
        [setPagination, barcodes]
    );

    const { isLoading, data, error, refetch } = useBarcodes(
        searchCriteria,
        pagination.current,
        pagination.itemsPerPage,
        sort
    );

    //explore and create fields to make them accessible to columns
    barcodes?.forEach(
        (e: any) => (
            (e.articleName = e.articleLuBarcodes[0].article.name),
            (e.articleDescription = e.articleLuBarcodes[0].article.description),
            e.articleLuBarcodes[0].articleLu
                ? ((e.barcodeLength = e.articleLuBarcodes[0].articleLu.length),
                  (e.barcodeWidth = e.articleLuBarcodes[0].articleLu.height),
                  (e.barcodeHeight = e.articleLuBarcodes[0].articleLu.height),
                  (e.barcodeWeight = e.articleLuBarcodes[0].articleLu.baseUnitWeight))
                : ((e.barcodeLength = e.articleLuBarcodes[0].article.length),
                  (e.barcodeWidth = e.articleLuBarcodes[0].article.height),
                  (e.barcodeHeight = e.articleLuBarcodes[0].article.height),
                  (e.barcodeWeight = e.articleLuBarcodes[0].article.baseUnitWeight))
        )
    );

    // For pagination
    useEffect(() => {
        if (data) {
            // filter is a temp patch to avoid screen loading failure, to be improved through controls when creating CAB
            const barcodesList = data?.barcodes?.results?.filter(
                (e: any) => e.articleLuBarcodes.length != 0
            );
            setBarcodes(barcodesList);
            setPagination({
                ...pagination,
                total: data?.barcodes?.count
            });
        }
    }, [data]);

    const handleTableChange = async (_pagination: any, _filter: any, sorter: any) => {
        await setSort(orderByFormater(sorter));
    };

    const columns = [
        {
            title: stockOwner,
            dataIndex: ['stockOwner', 'name'],
            key: ['stockOwner', 'name']
        },
        {
            title: barcode,
            dataIndex: 'name',
            key: 'name',
            sorter: {
                multiple: 1
            },
            showSorterTooltip: false
        },
        {
            title: articleDescription,
            dataIndex: 'articleDescription',
            key: 'articleDescription'
        },
        {
            title: articleName,
            dataIndex: 'articleName',
            key: 'articleName'
        },
        {
            title: supplierName,
            dataIndex: 'supplierName',
            key: 'supplierName',
            render: (e: any) => {
                return e ? e : '-';
            }
        },
        {
            title: rotation,
            dataIndex: 'rotationText',
            key: 'rotationText',
            sorter: {
                multiple: 3
            },
            showSorterTooltip: false
        },
        {
            title: preparationMode,
            dataIndex: 'preparationModeText',
            key: 'preparationModeText'
        },
        {
            title: articleLuLength,
            dataIndex: 'barcodeLength',
            key: 'barcodeLength'
        },
        {
            title: articleLuWidth,
            dataIndex: 'barcodeWidth',
            key: 'barcodeWidth'
        },
        {
            title: articleLuHeight,
            dataIndex: 'barcodeHeight',
            key: 'barcodeHeight'
        },
        {
            title: articleLuBaseUnitWeight,
            dataIndex: 'barcodeWeight',
            key: 'barcodeWeight'
        },
        {
            title: blacklisted,
            dataIndex: 'blacklisted',
            key: 'blacklisted',
            render: (blacklisted: any) => {
                return blacklisted ? (
                    <CheckCircleOutlined style={{ color: 'green' }} />
                ) : (
                    <CloseSquareOutlined style={{ color: 'red' }} />
                );
            }
        },
        {
            title: actions,
            key: 'actions',
            render: (record: { id: string; articleLuBarcodes: Array<any>; name: string }) => (
                <Space>
                    <LinkButton
                        icon={<EyeTwoTone />}
                        path={pathParams('/barcode/[id]', record.id)}
                    />
                    <Button
                        type="primary"
                        ghost
                        onClick={() => {
                            setShowNumberOfPrintsModal(true);
                            setIdToPrint(record.articleLuBarcodes[0].id);
                        }}
                        icon={<BarcodeOutlined />}
                    />
                </Space>
            )
        }
    ];

    return (
        <>
            {barcodes ? (
                <>
                    <AppTable
                        type="barcodes"
                        columns={columns}
                        data={barcodes}
                        isLoading={isLoading}
                        pagination={pagination}
                        setPagination={onChangePagination}
                        onChange={handleTableChange}
                    />
                    <NumberOfPrintsModal
                        showModal={{
                            showNumberOfPrintsModal,
                            setShowNumberOfPrintsModal
                        }}
                        id={idToPrint}
                        path="/api/barcodes/print/label"
                    />
                </>
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { BarcodesList };
