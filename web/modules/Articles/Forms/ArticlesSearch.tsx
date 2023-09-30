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
import { Form, Input, InputNumber, Checkbox } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';

export interface IArticlesSearchProps {
    form: any;
}

const ArticlesSearch: FC<IArticlesSearchProps> = ({ form }: IArticlesSearchProps) => {
    const { t } = useTranslation();

    // For multi selection field
    // const companies = [];
    // for (let i = 0; i < 10; i++) {
    //     const value = `${i.toString(36)}${i}`;
    //     companies.push({
    //         value,
    //         disabled: i === 10
    //     });
    // }
    // function handleCompaniesSelect(value: string[]) {
    //     console.log(`selected ${value}`);
    // }

    return (
        <>
            <Form form={form} name="control-hooks">
                {/* <Form.Item name="companyId" label={t('common:company')}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder={t('actions:select')}
                        onChange={handleCompaniesSelect}
                        options={companies}
                    />
                </Form.Item> */}
                <Form.Item name="name" label={t('common:name')}>
                    <Input />
                </Form.Item>
                <Form.Item name="code" label={t('d:code')}>
                    <Input />
                </Form.Item>
                <Form.Item name="status" label={t('d:status')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="length" label={t('d:length')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="width" label={t('d:width')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="height" label={t('d:height')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="baseUnitWeight" label={t('d:baseUnitWeight')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="boxWeight" label={t('d:boxWeight')}>
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="permanentProduct" valuePropName="checked" initialValue={false}>
                    <Checkbox>{t('d:permanentProduct')}</Checkbox>
                </Form.Item>
            </Form>
        </>
    );
};

ArticlesSearch.displayName = 'ArticlesSearch';

export { ArticlesSearch };
