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
import { Logo, StyledForm, WelcomeText, WrapperLogin, LinkButton } from '@components';
import { showError, showSuccess } from '@helpers';
import { Button, Form, Input } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    ChangeWarehouseWorkerPasswordMutation,
    ChangeWarehouseWorkerPasswordMutationVariables,
    useChangeWarehouseWorkerPasswordMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';

export const ResetPasswordForm = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { user } = useAuth();
    // TEXTS TRANSLATION
    const resetPass = t('actions:reset-password');
    const password = t('common:password');
    const confirmPass = t('common:confirm-password');
    const submitButton = t('actions:submit');
    const errorMessagePassword = t('messages:error-message-empty-input');
    const errorWrongPassword = t('messages:error-message-wrong-password');
    const errorWrongPasswordLength = t('messages:error-message-wrong-password-length');
    // END TEXTS TRANSLATION
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        ChangeWarehouseWorkerPassword({
            id: user.user_id,
            password: values.password,
            password2: values.password2
        });
    };

    const ChangeWarehouseWorkerPassword = ({
        id,
        password,
        password2
    }: ChangeWarehouseWorkerPasswordMutationVariables) => {
        ChangePasswordMutate({ id, password, password2 });
    };

    const { mutate: ChangePasswordMutate, isLoading: changePasswordLoading } =
        useChangeWarehouseWorkerPasswordMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: ChangeWarehouseWorkerPasswordMutation,
                _variables: ChangeWarehouseWorkerPasswordMutationVariables,
                _context: any
            ) => {
                router.push('/');
                showSuccess(t('messages:success-password-reset'));
            },
            onError: (err) => {
                showError(t('messages:error-password-reset'));
            }
        });

    return (
        <div>
            <WrapperLogin className="login">
                <Logo width={130} />

                <WelcomeText>{resetPass}</WelcomeText>
                <StyledForm
                    form={form}
                    layout="vertical"
                    name="forgotPassword"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                >
                    <Form.Item
                        name="password"
                        label={<label style={{ color: 'black' }}>{password}</label>}
                        rules={[
                            {
                                required: true,
                                message: errorMessagePassword
                            },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (value.length >= 6) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorWrongPasswordLength));
                                }
                            })
                        ]}
                        hasFeedback
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        name="password2"
                        label={<label style={{ color: 'black' }}>{confirmPass}</label>}
                        dependencies={['password']}
                        hasFeedback
                        rules={[
                            {
                                required: true,
                                message: errorMessagePassword
                            },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorWrongPassword));
                                }
                            })
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" loading={changePasswordLoading} htmlType="submit">
                            {submitButton}
                        </Button>
                    </Form.Item>
                </StyledForm>
            </WrapperLogin>
        </div>
    );
};
