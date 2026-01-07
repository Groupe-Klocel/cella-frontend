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

import { FC, useEffect, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { AppHead, HeaderContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { cumulatedStockRoutes as itemRoutes } from 'modules/CumulatedStock/static/cumulatedStockRoutes';
import { HandlingUnitContentsCumulatedModelV2 as model } from '@helpers';
import { Col, Form, Row, Select } from 'antd';
import { injectedModel } from 'helpers/utils/InjectedModel';

type PageComponent = FC & { layout: typeof MainLayout };

const CumulatedStock: PageComponent = () => {
    const { t } = useTranslation();
    const [HandlingUnitContentsCumulatedModel, setHandlingUnitContentsCumulatedModel] =
        useState<any>(model);
    const functionSum = [{ function: 'sum', fields: ['quantity'] }];
    const [form] = Form.useForm();

    const criteria = ['stockStatus', 'stockOwner'];
    const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]);
    const [refetch, setRefetch] = useState<boolean>(false);

    const stockStatus = {
        isListRequested: true,
        searchingFormat: 'Dropdown',
        isDefaultHiddenList: false,
        isExcludedFromList: true,
        isSortable: true,
        isDetailRequested: true,
        isExcludedFromDetail: true,
        detailGroup: null,
        link: null,
        addEditFormat: 'Dropdown',
        addEditStep: null,
        maxLength: null,
        displayName: null,
        isMandatory: true,
        minRule: null,
        maxRule: null,
        config: null,
        param: 'stock_statuses',
        optionTable: null
    };

    const stockStatusText = {
        isListRequested: true,
        isDefaultHiddenList: false,
        isExcludedFromList: false,
        isSortable: true,
        searchingFormat: null,
        isDetailRequested: true,
        isExcludedFromDetail: false,
        detailGroup: null,
        link: null,
        addEditFormat: null,
        addEditStep: null,
        maxLength: null,
        displayName: null,
        isMandatory: false,
        minRule: null,
        maxRule: null,
        config: null,
        param: null,
        optionTable: null
    };

    const stockOwnerId = {
        isListRequested: true,
        searchingFormat: 'Dropdown',
        isDefaultHiddenList: false,
        isExcludedFromList: true,
        isSortable: true,
        isDetailRequested: true,
        isExcludedFromDetail: true,
        detailGroup: null,
        link: null,
        addEditFormat: null,
        addEditStep: null,
        maxLength: null,
        displayName: 'stockOwner',
        isMandatory: false,
        minRule: null,
        maxRule: null,
        config: null,
        param: null,
        optionTable: '{"table": "StockOwner", "fieldToDisplay": "name"}',
        isEditDisabled: true
    };

    const stockOwnerName = {
        isListRequested: true,
        isDefaultHiddenList: false,
        isExcludedFromList: false,
        isSortable: true,
        searchingFormat: null,
        isDetailRequested: true,
        isExcludedFromDetail: false,
        detailGroup: null,
        link: 'stock-owners/stockOwnerId',
        addEditFormat: null,
        addEditStep: null,
        maxLength: null,
        displayName: null,
        isMandatory: false,
        minRule: null,
        maxRule: null,
        config: null,
        param: null,
        optionTable: null
    };

    useEffect(() => {
        if (criteriaSelected.length >= 0) {
            setHandlingUnitContentsCumulatedModel(
                injectedModel(model, 'HANDLING_UNIT_CONTENT_CUMULATED', [
                    [
                        null,
                        'stockStatus',
                        criteriaSelected.includes('stockStatus') ? stockStatus : {}
                    ],
                    [
                        null,
                        'stockStatusText',
                        criteriaSelected.includes('stockStatus') ? stockStatusText : {}
                    ],
                    [
                        null,
                        'stockOwnerId',
                        criteriaSelected.includes('stockOwner') ? stockOwnerId : {}
                    ],
                    [
                        null,
                        'stockOwner{name}',
                        criteriaSelected.includes('stockOwner') ? stockOwnerName : {}
                    ]
                ])
            );
        }
        setRefetch(!refetch);
    }, [criteriaSelected]);

    const category = {
        filters: {
            config: undefined,
            displayName: 'Category',
            initialValue: undefined,
            isMultipleSearch: undefined,
            maxLength: undefined,
            name: 'handlingUnit_Category',
            optionTable: undefined,
            param: 'handling_unit_category',
            type: 4
        },
        columns: [
            {
                dataIndex: 'handlingUnit_Category',
                key: 'handlingUnit_category',
                title: 'd:cumul_by_handlingUnit_category'
            }
        ],
        data: {}
    };

    return (
        <>
            <AppHead title={t('common:cumulated-stock')} />
            <HeaderContent title={`${t('common:cumulated-stock')}`} routes={itemRoutes} />
            <Form form={form} style={{ marginLeft: '15px' }}>
                <Row>
                    <Col xs={6}>
                        <Form.Item name="criteria">
                            <Select
                                mode="multiple"
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('common:cumul-criteria')
                                })}`}
                                value={criteriaSelected}
                                onChange={(value) => {
                                    setCriteriaSelected(value);
                                }}
                            >
                                {criteria.map((item: any) => (
                                    <Select.Option key={item.index} value={item}>
                                        {t('d:' + item)}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <ListComponent
                dataModel={HandlingUnitContentsCumulatedModel}
                cumulSearchInfos={category}
                functions={functionSum}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                itemperpage={30}
                refetch={refetch}
                searchable={true}
            />
        </>
    );
};

CumulatedStock.layout = MainLayout;

export default CumulatedStock;
