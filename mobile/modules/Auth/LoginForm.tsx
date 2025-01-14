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
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Logo, StyledForm, WelcomeText, WrapperLogin } from '@components';
import { META_DEFAULTS } from '@helpers';
import { Button, Form, Input } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';

export interface ILoginFormProps {}

export const LoginForm: FC<ILoginFormProps> = ({}: ILoginFormProps) => {
    const { t } = useTranslation('common');
    const { login } = useAuth();
    // TEXTS TRANSLATION

    const welcome = t('welcome');
    const username = t('username');
    const password = t('password');
    const workspace = t('workspace');
    const forgotPassword = t('forgot-password');
    const loginButton = t('actions:login');
    const errorMessageUsername = t('messages:error-message-empty-input');
    const errorMessagePassword = t('messages:error-message-empty-input');

    // END TEXTS TRANSLATION

    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        login({ username: values.username, password: values.password });
    };

    return (
        <WrapperLogin>
            <Logo title={META_DEFAULTS.title} />
            <WelcomeText>{welcome}</WelcomeText>
            <StyledForm
                form={form}
                name="login"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
            >
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: errorMessageUsername }]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        style={{ height: '50px', fontSize: '16px' }}
                        placeholder={username}
                    />
                </Form.Item>
                <Form.Item
                    name="password"
                    rules={[{ required: true, message: errorMessagePassword }]}
                >
                    <Input
                        prefix={<LockOutlined />}
                        type="password"
                        placeholder={password}
                        style={{ height: '50px', fontSize: '16px' }}
                    />
                </Form.Item>
                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        style={{ height: '50px', fontSize: '16px' }}
                    >
                        {loginButton}
                    </Button>
                </Form.Item>
            </StyledForm>
        </WrapperLogin>
    );
};
