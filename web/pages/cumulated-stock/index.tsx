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
import { META_DEFAULTS } from '@helpers';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { AppHead, HeaderContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { cumulatedStockRoutes as itemRoutes } from 'modules/CumulatedStock/static/cumulatedStockRoutes';
import { HandlingUnitContentsCumulatedModelV2 as model } from 'models/HandlingUnitContentsCumulatedModelV2';
import { Col, Form, Row, Select } from 'antd';

type PageComponent = FC & { layout: typeof MainLayout };

const CumulatedStock: PageComponent = () => {
    const { t } = useTranslation();
    const functionSum = [{ function: 'sum', fields: ['quantity'] }];
    const [form] = Form.useForm();

    const criteria = ['stockStatus', 'stockOwner'];
    const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]);
    const [refetch, setRefetch] = useState<boolean>(false);

    useEffect(() => {
        if (criteriaSelected.length >= 0) {
            if (criteriaSelected.includes('stockStatus')) {
                model.fieldsInfo.stockStatus.isListRequested = true;
                model.fieldsInfo.stockStatusText.isListRequested = true;
                model.fieldsInfo.stockStatus.searchingFormat = 'Dropdown';
            } else {
                model.fieldsInfo.stockStatus.isListRequested = false;
                model.fieldsInfo.stockStatusText.isListRequested = false;
                model.fieldsInfo.stockStatus.searchingFormat = null;
            }
            if (criteriaSelected.includes('stockOwner')) {
                model.fieldsInfo.stockOwnerId.isListRequested = true;
                model.fieldsInfo['stockOwner{name}'].isListRequested = true;
                model.fieldsInfo.stockOwnerId.searchingFormat = 'Dropdown';
            } else {
                model.fieldsInfo.stockOwnerId.isListRequested = false;
                model.fieldsInfo['stockOwner{name}'].isListRequested = false;
                model.fieldsInfo.stockOwnerId.searchingFormat = null;
            }
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
            <AppHead title={META_DEFAULTS.title} />
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
                dataModel={model}
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
