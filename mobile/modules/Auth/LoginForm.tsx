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
import { cookie, META_DEFAULTS, showSuccess, showWarning } from '@helpers';
import { Button, Form, Input } from 'antd';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import useTranslation from 'next-translate/useTranslation';
import router from 'next/router';
import { useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

export interface ILoginFormProps {}

export const LoginForm = () => {
    const { t } = useTranslation('global');
    const { login, graphqlRequestClient, isAuthenticated, ssoLogin, ssoConfig } = useAuth();
    const { data: session, status } = useSession();
    // TEXTS TRANSLATION

    const welcome = t('welcome');
    const username = t('username');
    const password = t('password');
    const loginButton = t('login');
    const errorMessageUsername = t('error-message-empty-input');
    const errorMessagePassword = t('error-message-empty-input');
    const { user, interval, logoutTimeout } = useAppState();

    const dispatchUser = useAppDispatch();
    const setUserInfo = useCallback(
        (newUser: any) =>
            dispatchUser({
                type: 'SET_USER_INFO',
                user: newUser
            }),
        [dispatchUser, user]
    );

    // END TEXTS TRANSLATION

    const [form] = Form.useForm();
    useEffect(() => {
        if (isAuthenticated) {
            const token = cookie.get('token');
            if (token) {
                try {
                    const query = gql`
                        query GetMyInfo {
                            me {
                                __typename
                                ... on WarehouseWorker {
                                    id
                                    password
                                    username
                                    warehouseId
                                    resetPassword
                                    userRoles {
                                        roleId
                                        role {
                                            id
                                            name
                                            permissions {
                                                id
                                                table
                                                mode
                                                roleId
                                            }
                                        }
                                    }
                                }

                                ... on IntegratorUser {
                                    id
                                    password
                                    email
                                    integratorId
                                    integrator {
                                        id
                                        name
                                        awsAccessKeyId
                                        awsSecretAccessKey
                                    }
                                    userRoles {
                                        roleId
                                        role {
                                            id
                                            name
                                            permissions {
                                                id
                                                table
                                                mode
                                                roleId
                                            }
                                        }
                                    }
                                    isAdmin
                                }
                            }
                        }
                    `;

                    graphqlRequestClient.request(query).then((data: any) => {
                        if (data.me) {
                            setUserInfo(data.me);
                            if (data.me.resetPassword === true) {
                                router.push('/reset-password');
                                showWarning(t('please-reset-password'));
                            } else {
                                router.push('/');
                                showSuccess(t('login-success'));
                            }
                        }
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (status === 'authenticated' && session) {
            ssoLogin({
                token: session.jwtToken
            });
        }
    }, [status, session]);

    useEffect(() => {
        if (interval != null) {
            clearInterval(interval);
            dispatchUser({ type: 'SET_INTERVAL', interval: null });
        }

        if (logoutTimeout != null) {
            clearTimeout(logoutTimeout);
            dispatchUser({ type: 'SET_LOGOUT_TIMEOUT', timeout: null });
        }
    }, []);

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
                    {ssoConfig &&
                        ssoConfig.warehouseSsoConfiguration.type &&
                        ssoConfig.warehouseSsoConfiguration.authUrl &&
                        ssoConfig.warehouseSsoConfiguration.clientId &&
                        ssoConfig.warehouseSsoConfiguration.clientSecret &&
                        ssoConfig.warehouseSsoConfiguration.redirectUri &&
                        ssoConfig.warehouseSsoConfiguration.tokenUrl &&
                        ssoConfig.warehouseSsoConfiguration.scope && (
                            <Button
                                type="default"
                                onClick={() => signIn('oidc')}
                                block
                                style={{ height: '50px', fontSize: '16px', marginTop: '10px' }}
                            >
                                SSO
                            </Button>
                        )}
                </Form.Item>
            </StyledForm>
        </WrapperLogin>
    );
};
