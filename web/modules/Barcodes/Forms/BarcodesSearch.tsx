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
import { Form, Input, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { SimpleGetAllStockOwnersQuery, useSimpleGetAllStockOwnersQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';

export type BarcodesSearchTypeProps = {
    form: any;
};

const { Option } = Select;

const BarcodesSearch: FC<BarcodesSearchTypeProps> = ({ form }: BarcodesSearchTypeProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const barcode = t('common:barcode');
    const stockOwner = t('d:stockOwner');
    const article = t('common:article');
    const supplierName = t('d:supplierName');
    const articleDescription = t('d:articleDescription');
    const blacklisted = t('d:blacklisted');
    const [stockOwners, setStockOwners] = useState<any>();
    const stockOwnerList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners?.results);
        }
    }, [stockOwnerList]);

    return (
        <>
            <Form form={form} name="control-hooks">
                <Form.Item name="stockOwnerId" label={stockOwner}>
                    <Select>
                        <Option value=""> </Option>
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="name" label={barcode}>
                    <Input />
                </Form.Item>
                <Form.Item name="supplierName" label={supplierName}>
                    <Input />
                </Form.Item>
                <Form.Item name="supplierArticleCode" label={articleDescription}>
                    <Input />
                </Form.Item>
                <Form.Item name="blacklisted" label={blacklisted}>
                    <Select defaultValue="">
                        <Option value="">{t('common:none')}</Option>
                        <Option value="true">{t('common:bool-yes')}</Option>
                        <Option value="false">{t('common:bool-no')}</Option>
                    </Select>
                </Form.Item>
            </Form>
        </>
    );
};

BarcodesSearch.displayName = 'BarcodesSearch';

export { BarcodesSearch };
