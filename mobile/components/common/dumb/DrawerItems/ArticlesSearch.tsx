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
import { Button, Form, Input, Select, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';

export interface IArticlesSearchProps {
    form: any;
}

const ArticlesSearch: FC<IArticlesSearchProps> = ({ form }: IArticlesSearchProps) => {
    const { t } = useTranslation();

    const companies = [];
    const status = [];
    for (let i = 0; i < 10; i++) {
        const value = `${i.toString(36)}${i}`;
        companies.push({
            value,
            disabled: i === 10
        });
    }
    for (let i = 0; i < 10; i++) {
        const value = `${i.toString(36)}${i}`;
        status.push({
            value,
            disabled: i === 10
        });
    }

    const layout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 }
    };

    const tailLayout = {
        wrapperCol: { offset: 8, span: 16 }
    };

    const onReset = () => {
        form.resetFields();
    };

    function handleCompaniesSelect(value: string[]) {
        alert(`selected ${value}`);
    }

    function handleStatusSelect(value: string[]) {
        alert(`selected ${value}`);
    }

    return (
        <>
            <Form {...layout} form={form} name="control-hooks">
                <Form.Item {...tailLayout}>
                    <Space>
                        <Button htmlType="button" onClick={onReset}>
                            Reset
                        </Button>
                    </Space>
                </Form.Item>
                <Form.Item name="companyId" label={t('common:company')}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder={t('actions:select')}
                        onChange={handleCompaniesSelect}
                        options={companies}
                    />
                </Form.Item>
                <Form.Item name="name" label={t('d:name')}>
                    <Input />
                </Form.Item>
                <Form.Item name="description" label={t('d:description')}>
                    <Input />
                </Form.Item>
                <Form.Item name="additionalDescription" label={t('common:additionalDescription')}>
                    <Input />
                </Form.Item>
                <Form.Item name="status" label={t('d:status')}>
                    <Input />
                </Form.Item>

                <Form.Item name="status" label={t('common:status')}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder={t('actions:select')}
                        onChange={handleStatusSelect}
                        options={status}
                    />
                </Form.Item>
            </Form>
        </>
    );
};

ArticlesSearch.displayName = 'ArticlesSearch';

export { ArticlesSearch };
