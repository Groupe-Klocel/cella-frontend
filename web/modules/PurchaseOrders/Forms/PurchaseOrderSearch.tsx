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
import { Form, Input, InputNumber, Checkbox, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useGetAllStockOwnersQuery, useListConfigsForAScopeQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
const { Option } = Select

export interface IPurchaseOrderSearchProps {
    form: any;
}

const PurchaseOrderSearch: FC<IPurchaseOrderSearchProps> = ({ form }: IPurchaseOrderSearchProps) => {
    const { t } = useTranslation();

    const {graphqlRequestClient} = useAuth();

    const [stockOwners, setStockOwners] = useState<any>();
    const [statusTexts, setStatusTexts] = useState<any>();
    const [typeTexts, setTypeTexts] = useState<any>();


    const stockOwnerList = useGetAllStockOwnersQuery(
        graphqlRequestClient,
        {
            page: 1,
            itemsPerPage: 1000
        }
    )

    const statusTextList = useListConfigsForAScopeQuery(
        graphqlRequestClient,
        {
            scope: 'purchase_order_status'
        }
    )

    const typeTextList = useListConfigsForAScopeQuery(
        graphqlRequestClient,
        {
            scope: 'delivery_po_type'
        }
    )
    
    useEffect(()=> {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners.results);
        }
    }, [stockOwnerList])

    useEffect(()=> {
        if (statusTextList) {
            setStatusTexts(statusTextList?.data?.listConfigsForAScope);
        }
    }, [statusTextList])

    useEffect(()=> {
        if (typeTextList) {
            setTypeTexts(typeTextList?.data?.listConfigsForAScope);
        }
    }, [typeTextList])


    return (
        <>
            <Form form={form} name="control-hooks">
                <Form.Item name="name" label={t('common:name')}>
                    <Input />
                </Form.Item>
                <Form.Item name="stockOwnerId" label={t('d:stockOwner')}>
                    <Select defaultValue="">
                        <Option value="">{t('common:none')}</Option>
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="status" label={t('d:status')}>
                    <Select defaultValue="">
                        <Option value="">{t('common:none')}</Option>
                        {statusTexts?.map((status: any) => (
                            <Option key={status.code} value={status.code}>
                                {status.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="type" label={t('d:type')}>
                    <Select defaultValue="">
                        <Option value="">{t('common:none')}</Option>
                        {typeTexts?.map((type: any) => (
                            <Option key={type.code} value={type.code}>
                                {type.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="supplier" label={t('d:supplier')}>
                    <Input />
                </Form.Item>
                <Form.Item name="article" label={t('d:article')}>
                    <Input />
                </Form.Item>
                {/* <Form.Item name="permanentProduct" valuePropName="checked" initialValue={false}>
                    <Checkbox>{t('d:permanentProduct')}</Checkbox>
                </Form.Item> */}
            </Form>
        </>
    );
};

PurchaseOrderSearch.displayName = 'PurchaseOrderSearch';

export { PurchaseOrderSearch };
