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
import { UserOutlined } from '@ant-design/icons';
import { Logo, StyledForm, WelcomeText, WrapperLogin, LinkButton } from '@components';
import { Button, Form, Input } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export const ForgotPasswordForm = () => {
    const { t } = useTranslation('common');
    const { forgotPassword } = useAuth();
    // TEXTS TRANSLATION
    const forgot = t('forgot');
    const login = t('actions:login');
    const username = t('username');
    const submitButton = t('actions:submit');
    const errorEmptyMessage = t('messages:error-message-empty-input');
    const errorWrongPassword = t('messages:error-message-wrong-password');

    //
    // END TEXTS TRANSLATION

    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        const url = window.location.href.replace('forgot-password', 'reset-password');
        forgotPassword({
            username: values.username,
            callbackUrl: url
        });
    };

    return (
        <div>
            <WrapperLogin className="login">
                <Logo width={130} />
                <WelcomeText>{forgot}</WelcomeText>

                <StyledForm
                    form={form}
                    name="forgotPassword"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: errorEmptyMessage }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder={username} />
                    </Form.Item>

                    <Form.Item>
                        <LinkButton title={login} path="/login" type="link" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {submitButton}
                        </Button>
                    </Form.Item>
                </StyledForm>
            </WrapperLogin>
        </div>
    );
};
