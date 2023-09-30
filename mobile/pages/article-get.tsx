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
import { WrapperForm } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';
import { Form, Input, Button } from 'antd';
import { HeaderContent } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';

type PageComponent = FC & { layout: typeof MainLayout };

const ArticleGet: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const onFinish = (values: any) => {
        const aId = values['article-id'];
        router.push(`/article/${aId}`);
    };
    return (
        <>
            <HeaderContent title={t('Info Article')} />

            <WrapperForm>
                <Form
                    name="basic"
                    layout="vertical"
                    onFinish={onFinish}
                    // onFinishFailed={onFinishFailed}
                    autoComplete="off"
                    scrollToFirstError
                >
                    <Form.Item
                        label={t('common:article-id')}
                        name="article-id"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
                    >
                        <Input style={{ height: '50px', marginBottom: '20px' }} />
                    </Form.Item>
                    <Button type="primary" block style={{ height: '50px' }} htmlType="submit">
                        Submit
                    </Button>
                </Form>
            </WrapperForm>
        </>
    );
};

ArticleGet.layout = MainLayout;

export default ArticleGet;
