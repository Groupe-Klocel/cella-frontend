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
import {
    showError,
    showSuccess,
    getPasswordPolicy,
    passwordDifferencePercent,
    passwordContainsPersonalInfo,
    passwordHasSimplePattern,
    passwordMeetsComplexity
} from '@helpers';
import { useMemo } from 'react';
import { Button, Form, Input } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    ChangeWarehouseWorkerPasswordMutation,
    ChangeWarehouseWorkerPasswordMutationVariables,
    useChangeWarehouseWorkerPasswordMutation
} from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';

export const ResetPasswordForm = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { user } = useAuth();
    const { configs } = useAppState();

    const configsParamsCodes = useMemo(() => getPasswordPolicy(configs), [configs]);

    // TEXTS TRANSLATION
    const resetPass = t('actions:reset-password');
    const password = t('common:password');
    const oldPassword = t('common:old-password');
    const confirmPass = t('common:confirm-password');
    const submitButton = t('actions:submit');
    const errorMessagePassword = t('messages:error-message-empty-input');
    const errorWrongPassword = t('messages:error-message-wrong-password');
    const errorPasswordComplexity = t('messages:error-message-password-complexity');
    const errorWrongPasswordLength = t('messages:error-message-wrong-password-length', {
        nb: configsParamsCodes.passwordLength
    });
    const errorPasswordDifference = t('messages:error-message-password-difference', {
        nb: configsParamsCodes.passwordMinDifferencePercent
    });
    const errorPasswordPersonalInfo = t('messages:error-message-password-personal-info');
    // END TEXTS TRANSLATION
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        ChangeWarehouseWorkerPassword({
            id: user.user_id,
            password: values.password,
            password2: values.password2,
            oldPassword: values.oldPassword
        });
    };

    const ChangeWarehouseWorkerPassword = ({
        id,
        password,
        password2,
        oldPassword
    }: ChangeWarehouseWorkerPasswordMutationVariables) => {
        ChangePasswordMutate({ id, password, password2, oldPassword });
    };

    const { mutate: ChangePasswordMutate, isPending: changePasswordLoading } =
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
                <Logo />

                <WelcomeText>{resetPass}</WelcomeText>
                <StyledForm
                    form={form}
                    name="forgotPassword"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                >
                    {configsParamsCodes.passwordMinDifferencePercent > 0 ? (
                        <Form.Item
                            name="oldPassword"
                            label={<label style={{ color: 'black' }}>{oldPassword}</label>}
                            rules={[
                                {
                                    required: true,
                                    message: errorMessagePassword
                                }
                            ]}
                        >
                            <Input.Password autoComplete="current-password" />
                        </Form.Item>
                    ) : (
                        <></>
                    )}

                    <Form.Item
                        name="password"
                        label={<label style={{ color: 'black' }}>{password}</label>}
                        dependencies={['oldPassword']}
                        rules={[
                            {
                                required: true,
                                message: errorMessagePassword
                            },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (
                                        !value ||
                                        value.length >= configsParamsCodes.passwordLength
                                    ) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorWrongPasswordLength));
                                }
                            }),
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (
                                        !value ||
                                        passwordMeetsComplexity(value, configsParamsCodes)
                                    ) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorPasswordComplexity));
                                }
                            }),
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (configsParamsCodes.passwordMinDifferencePercent <= 0) {
                                        return Promise.resolve();
                                    }
                                    const previousPassword = getFieldValue('oldPassword');
                                    if (
                                        !value ||
                                        !previousPassword ||
                                        passwordDifferencePercent(previousPassword, value) >=
                                            configsParamsCodes.passwordMinDifferencePercent
                                    ) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorPasswordDifference));
                                }
                            }),
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!configsParamsCodes.passwordCheckPersonalInfo || !value) {
                                        return Promise.resolve();
                                    }
                                    if (
                                        passwordContainsPersonalInfo(value, [
                                            user?.username,
                                            user?.email?.split('@')[0]
                                        ]) ||
                                        passwordHasSimplePattern(value)
                                    ) {
                                        return Promise.reject(new Error(errorPasswordPersonalInfo));
                                    }
                                    return Promise.resolve();
                                }
                            })
                        ]}
                        hasFeedback
                    >
                        <Input.Password autoComplete="new-password" />
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
                        <Input.Password autoComplete="new-password" />
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
