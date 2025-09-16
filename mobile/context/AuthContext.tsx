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
import {
    cookie,
    decodeJWT,
    OnlyChildrenType,
    showError,
    showSuccess,
    IS_FAKE,
    IS_SAME_SEED
} from '@helpers';
import { useAppDispatch } from 'context/AppContext';
import {
    WarehouseLoginMutation,
    WarehouseLoginMutationVariables,
    useWarehouseLoginMutation,
    useResetPasswordMutation,
    ResetPasswordMutation,
    ResetPasswordMutationVariables,
    useChangePasswordMutation,
    ChangePasswordMutation,
    ChangePasswordMutationVariables
} from 'generated/graphql';
import { GraphQLClient, gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { createContext, FC, useCallback, useContext, useEffect, useState } from 'react';
import useTranslation from 'next-translate/useTranslation';
import { useSession, signOut } from 'next-auth/react';

interface IAuthContext {
    isAuthenticated: boolean;
    user?: any;
    login: Function;
    //IKI 20230227 : not used
    forgotPassword: Function;
    //IKI 20230227 : not used
    resetPassword: Function;
    loading: boolean;
    logout: Function;
    graphqlRequestClient: any;
    ssoLogin: any;
    ssoConfig: any;
}

// refactoring need to typesafe https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context/
const AuthContext = createContext<IAuthContext>(undefined!);

export const AuthProvider: FC<OnlyChildrenType> = ({ children }: OnlyChildrenType) => {
    const { t } = useTranslation('global');

    const graphqlClient = new GraphQLClient(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string);

    const { data: session } = useSession();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [graphqlRequestClient, setGraphqlRequestClient] = useState(graphqlClient);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(!!user);
    const [ssoConfig, setSsoConfig] = useState<any>(null);

    // Get SSO configuration and get access token from cookies , decode it and set user
    useEffect(() => {
        async function loadUserFromCookie() {
            const token = cookie.get('token');
            if (token) {
                setHeader(token);
                const user = decodeJWT(token);
                if (user) setUser(user);
            }
            setLoading(false);
        }
        loadUserFromCookie();
        async function ssoConfiguration() {
            try {
                const result = await ssoConfigurationQuery();
                setSsoConfig(result);
            } catch (error) {
                console.log('Error or no SSO configuration :', error);
            }
        }
        ssoConfiguration();
    }, []);

    const loginMutation = useWarehouseLoginMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: WarehouseLoginMutation,
            _variables: WarehouseLoginMutationVariables,
            _context: any
        ) => {
            if (data?.warehouseLogin?.accessToken) {
                const token = data.warehouseLogin.accessToken;
                cookie.set('token', token);
                setHeader(token);
                const user = decodeJWT(token);
                console.log('decoded user = ', user);
                setUser(user);
                setIsAuthenticated(true);
                // Set Bearer JWT token to the header for future request
            } else {
                showError(t('messages:error-login'));
            }
        },
        onError: (error) => {
            showError(error.message);
        }
    });

    const ssoConfigurationQuery = async () => {
        let result;
        try {
            const warehouseSsoConfiguration = gql`
                query ($warehouseId: ID!, $envSecret: String!) {
                    warehouseSsoConfiguration(warehouseId: $warehouseId, secret: $envSecret) {
                        type
                        authUrl
                        clientId
                        clientSecret
                        redirectUri
                        tokenUrl
                        disconnectUrl
                        scope
                    }
                }
            `;

            const warehouseSsoConfigurationValue = {
                warehouseId: process.env.NEXT_PUBLIC_WAREHOUSE_ID,
                envSecret: process.env.NEXT_PUBLIC_SSO_SECRET
            };

            result = await graphqlRequestClient.request(
                warehouseSsoConfiguration,
                warehouseSsoConfigurationValue
            );
        } catch (error: any) {
            showError(t(error.response.errors[0].extensions.code));
        }
        return result;
    };

    //IKI 20230227 : not used
    const resetMutation = useResetPasswordMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: ResetPasswordMutation,
            _variables: ResetPasswordMutationVariables,
            _context: any
        ) => {
            if (data.resetPassword.__typename === 'ResetPasswordSuccess') {
                showSuccess(data.resetPassword.message);
            } else {
                showError(data.resetPassword.message);
            }
            console.log(data);
        },
        onError: (error) => {
            console.log(error);
            showError(error.message);
        }
    });

    //IKI 20230227 : not used
    const changePasswordMutation = useChangePasswordMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: ChangePasswordMutation,
            _variables: ChangePasswordMutationVariables,
            _context: any
        ) => {
            if (data?.changePassword.__typename === 'ChangePasswordSuccess') {
                showSuccess(data.changePassword.message);
                setTimeout(() => {
                    router.replace('/login');
                }, 1000);
            } else {
                showError(data.changePassword.message);
            }
        },
        onError: (error) => {
            console.log(error);
            showError(error.message);
        }
    });

    const login = async ({
        username,
        password,
        warehouseId = process.env.NEXT_PUBLIC_WAREHOUSE_ID as string
    }: WarehouseLoginMutationVariables) => {
        const { mutate } = loginMutation;
        mutate({ username, password, warehouseId });
    };

    const ssoLogin = async ({ token }: { token: string }) => {
        const warehouseSsoLogin = gql`
            mutation ($token: String!, $warehouseId: ID!) {
                warehouseSsoLogin(token: $token, warehouseId: $warehouseId) {
                    accessToken
                }
            }
        `;
        const warehouseSsoLoginValues = {
            token: token,
            warehouseId: process.env.NEXT_PUBLIC_WAREHOUSE_ID
        };
        try {
            const result: { warehouseSsoLogin?: { accessToken?: string } } =
                await graphqlRequestClient.request(warehouseSsoLogin, warehouseSsoLoginValues);

            if (result?.warehouseSsoLogin?.accessToken) {
                const token = result.warehouseSsoLogin.accessToken;
                cookie.set('token', token);
                setHeader(token);
                const user = decodeJWT(token);
                console.log('decoded user = ', user);
                setUser(user);
            } else {
                showError(t('messages:error-login'));
            }

            return result;
        } catch (error: any) {
            showError(t(error.response.errors[0].extensions.code));
            await signOut({ redirect: false });
        }
    };

    const forgotPassword = async ({
        username,
        callbackUrl,
        warehouseId = process.env.NEXT_PUBLIC_WAREHOUSE_ID
    }: any) => {
        const { mutate } = resetMutation;
        mutate({ email: username, callbackUrl: callbackUrl });
    };

    //IKI 20230227 : not used
    const resetPassword = async ({
        token,
        password,
        confirmPassword,
        warehouseId = process.env.NEXT_PUBLIC_WAREHOUSE_ID
    }: any) => {
        // alert('RESET PASSWORD CHECK');
        const { mutate } = changePasswordMutation;
        mutate({ token: token, password: password, password2: confirmPassword });
    };

    const logout = async () => {
        cookie.remove('token');
        cookie.remove('user');
        cookie.remove('permissions');
        // Remove Bearer JWT token from header
        setHeader('NOP');
        setIsAuthenticated(false);
        if (session) {
            await signOut({ redirect: false });
        }
        setUser(null);
        if (session && ssoConfig.warehouseSsoConfiguration.disconnectUrl) {
            window.location.href = ssoConfig.warehouseSsoConfiguration.disconnectUrl;
        }
        router.push('/login');
        //router.reload();
    };

    let requestHeader;

    const setHeader = (token: string) => {
        if (IS_FAKE) {
            if (IS_SAME_SEED) {
                requestHeader = {
                    'X-API-fake': 'fake',
                    'X-API-seed': 'same',
                    authorization: `Bearer ${token}`
                };
            } else {
                requestHeader = {
                    'X-API-fake': 'fake',
                    authorization: `Bearer ${token}`
                };
            }
        } else {
            requestHeader = {
                authorization: `Bearer ${token}`
            };
        }

        const graphqlClientWithHeader = new GraphQLClient(
            process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
            {
                headers: requestHeader
            }
        );
        setGraphqlRequestClient(graphqlClientWithHeader);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!user,
                user,
                login,
                loading,
                logout,
                graphqlRequestClient,
                //IKI 20230227 : not used
                forgotPassword,
                //IKI 20230227 : not used
                resetPassword,
                ssoLogin,
                ssoConfig
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
