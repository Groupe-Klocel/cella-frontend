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
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import { cookie, showError } from '@helpers';
import { gql, GraphQLClient } from 'graphql-request';
import { ScreenSpin } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import authorizationList from '../layouts/authorizationList.json';

const themes = {
    dark: `/dark-theme.css`,
    light: `/light-theme.css`
};

type AppLayoutProps = {
    Component: PageWithMainLayoutType;
    pageProps: any;
    getLayout: any;
    Layout: any;
};

const AppLayout = ({ Component, pageProps, getLayout, Layout }: AppLayoutProps) => {
    const { userSettings, user, permissions, translations, configs, parameters } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<boolean>(false);
    const [getUserSettingsQuery, setGetUserSettingsQuery] = useState<boolean>(false);
    const [getTranslationSettingsQuery, setGetTranslationSettingsQuery] = useState<boolean>(false);
    const [getConfigSettingsQuery, setGetConfigSettingsQuery] = useState<boolean>(false);
    const [getParameterSettingsQuery, setGetParameterSettingsQuery] = useState<boolean>(false);

    useEffect(() => {
        const scrollableContainer = document.querySelector('.bqHEif');
        if (scrollableContainer && !router.query?.scrollTo) {
            scrollableContainer.scrollTo(0, 0);
        }
    }, [router.asPath]);

    useEffect(() => {
        if (
            router &&
            permissions &&
            authorizationList.filter((item) => item.route === router.pathname).length > 0 &&
            authorizationList
                .filter((item) => item.route === router.pathname)
                .map((item) => {
                    return permissions?.some(
                        (permission) =>
                            permission.table === item.permission && permission.mode === item.mode
                    );
                })
                .filter((item) => item === true).length === 0
        ) {
            console.warn(
                `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
            );
            showError(t('errors:APP-000200'));
            router.replace('/');
        }
    }, [router, permissions]);

    const token = cookie.get('token');
    const requestHeader = {
        authorization: `Bearer ${token}`
    };
    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );
    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });

    const theme = generalUserSettings?.valueJson?.theme ?? 'light';
    const lang = generalUserSettings?.valueJson?.lang
        ? generalUserSettings?.valueJson?.lang
        : router.locale;

    const getUserSettings = useCallback(async () => {
        const query = gql`
            query getUserSettings($warehouseWorkerId: String!) {
                warehouseWorkerSettings(
                    filters: { warehouseWorkerId: $warehouseWorkerId }
                    itemsPerPage: 1000
                ) {
                    results {
                        id
                        code
                        valueJson
                    }
                }
            }
        `;
        const variables = {
            warehouseWorkerId: user.id
        };

        try {
            const queryInfo: any = await graphqlRequestClient.request(query, variables);

            if (queryInfo.warehouseWorkerSettings.results.length > 0) {
                setGetUserSettingsQuery(true);
            }

            const containsTestCode = queryInfo.warehouseWorkerSettings.results.some(
                (item: any) => item.code === 'globalParameters'
            );

            const newSettings = containsTestCode
                ? queryInfo.warehouseWorkerSettings.results
                : [...queryInfo.warehouseWorkerSettings.results, ...userSettings];
            dispatchUser({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: newSettings
            });
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching user settings');
        }
    }, [dispatchUser, user]);

    const getTranslations = useCallback(async () => {
        const query = gql`
            query {
                translations(filters: { type: "wm" }, itemsPerPage: 999999999) {
                    count
                    results {
                        type
                        category
                        language
                        code
                        value
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query);
            dispatchUser({
                type: 'SET_TRANSLATIONS',
                translations: queryInfo.translations.results
            });
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching translations');
            setGetTranslationSettingsQuery(true);
        }
    }, [dispatchUser, user]);

    const getConfigs = useCallback(async () => {
        const query = gql`
            query {
                configs(filters: {}, itemsPerPage: 999999999) {
                    count
                    results {
                        id
                        translation
                        scope
                        code
                        value
                        system
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query);
            dispatchUser({
                type: 'SET_CONFIGS',
                configs: queryInfo.configs.results
            });
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching configs');
            setGetConfigSettingsQuery(true);
        }
    }, [dispatchUser, user]);

    const getParameters = useCallback(async () => {
        const query = gql`
            query {
                parameters(filters: {}, itemsPerPage: 999999999) {
                    count
                    results {
                        id
                        translation
                        scope
                        code
                        value
                        system
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query);
            dispatchUser({
                type: 'SET_PARAMETERS',
                parameters: queryInfo.parameters.results
            });
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching parameters');
            setGetParameterSettingsQuery(true);
        }
    }, [dispatchUser, user]);

    useEffect(() => {
        if (user && user?.id && router.pathname !== '/login') {
            getUserSettings();
            getTranslations();
            getConfigs();
            getParameters();
        } else {
            if (router.pathname === '/login') {
                setUserSettingsLoading(false);
                setGetUserSettingsQuery(false);
            }
        }
    }, [user, router.pathname]);

    useEffect(() => {
        if (
            (getTranslationSettingsQuery || translations?.length > 0) &&
            (getConfigSettingsQuery || configs?.length > 0) &&
            (getParameterSettingsQuery || parameters?.length > 0)
        ) {
            if (
                (getUserSettingsQuery && userSettings.length > 1) ||
                (!getUserSettingsQuery && userSettings.length == 1)
            ) {
                setUserSettingsLoading(true);
            }
        } else {
            setUserSettingsLoading(false);
        }
    }, [user, translations, configs, parameters, getUserSettingsQuery, userSettings]);

    useEffect(() => {
        if (lang) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
    }, [lang]);

    if (
        userSettingsLoading === false &&
        router.pathname !== '/login' &&
        router.pathname !== '/reset-password' &&
        user?.id != null
    ) {
        return <ScreenSpin />;
    }

    return (
        <ThemeSwitcherProvider defaultTheme={theme} themeMap={themes}>
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
