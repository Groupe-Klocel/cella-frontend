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
import { cookie, showError, LsIsSecured } from '@helpers';
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import { gql, GraphQLClient } from 'graphql-request';
import { ScreenSpin } from '@components';
import MessagePositionManager from 'components/common/dumb/Message/MessagePositionManager';

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
    const {
        userSettings,
        user: userFromState,
        pickAndPack,
        reception,
        returnReception,
        translations,
        configs,
        parameters,
        movementToProcess
    } = useAppState();
    const router = useRouter();
    const [storage, setStorage] = useState<any>(null);
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<boolean>(false);
    const [getUserSettingsQuery, setGetUserSettingsQuery] = useState<boolean>(false);
    const [getTranslationSettingsQuery, setGetTranslationSettingsQuery] = useState<boolean>(false);
    const [getConfigSettingsQuery, setGetConfigSettingsQuery] = useState<boolean>(false);
    const [getParameterSettingsQuery, setGetParameterSettingsQuery] = useState<boolean>(false);

    // Initialize secure storage on client side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setStorage(LsIsSecured());
        }
    }, []);

    const token = cookie.get('token');
    const user = userFromState ?? (cookie.get('user') ? JSON.parse(cookie.get('user')!) : {});
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
        return 'globalParametersMobile' === item.code;
    });

    const [lang, setLang] = useState(generalUserSettings?.valueJson?.lang ?? router.locale);

    useEffect(() => {
        if (generalUserSettings?.valueJson?.lang) {
            setLang(generalUserSettings?.valueJson?.lang);
        }
    }, [generalUserSettings?.valueJson]);

    const theme = generalUserSettings?.valueJson?.theme ?? 'light';

    // #region save RF in LS
    const debounceTimeout = 1000; // 1 second delay

    // Only run localStorage operations when storage is available
    useEffect(() => {
        if (storage && pickAndPack) {
            const timer = setTimeout(() => {
                storage.set('pickAndPack', JSON.stringify(pickAndPack));
            }, debounceTimeout);
            return () => clearTimeout(timer);
        }
    }, [pickAndPack, storage]);

    useEffect(() => {
        if (storage && reception) {
            const timer = setTimeout(() => {
                storage.set('reception', JSON.stringify(reception));
            }, debounceTimeout);
            return () => clearTimeout(timer);
        }
    }, [reception, storage]);

    useEffect(() => {
        if (storage && returnReception) {
            const timer = setTimeout(() => {
                storage.set('returnReception', JSON.stringify(returnReception));
            }, debounceTimeout);
            return () => clearTimeout(timer);
        }
    }, [returnReception, storage]);

    useEffect(() => {
        if (storage && movementToProcess) {
            const timer = setTimeout(() => {
                storage.set('movementToProcess', JSON.stringify(movementToProcess));
            }, debounceTimeout);
            return () => clearTimeout(timer);
        }
    }, [movementToProcess, storage]);

    useEffect(() => {
        if (storage) {
            dispatchUser({
                type: 'UPDATE_BY_PROCESS',
                processName: 'pickAndPack',
                object: JSON.parse(storage.get('pickAndPack') || '{}')
            });
            dispatchUser({
                type: 'UPDATE_BY_PROCESS',
                processName: 'reception',
                object: JSON.parse(storage.get('reception') || '{}')
            });
            dispatchUser({
                type: 'UPDATE_BY_PROCESS',
                processName: 'returnReception',
                object: JSON.parse(storage.get('returnReception') || '{}')
            });
            dispatchUser({
                type: 'UPDATE_BY_PROCESS',
                processName: 'movementToProcess',
                object: JSON.parse(storage.get('movementToProcess') || '{}')
            });
        }
    }, [storage]);

    // #endregion

    const getUserSettings = useCallback(async () => {
        const query = gql`
            query getUserSettings($warehouseWorkerId: String!) {
                warehouseWorkerSettings(filters: { warehouseWorkerId: $warehouseWorkerId }) {
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
                (item: any) => item.code === 'globalParametersMobile'
            );

            const newSettings = containsTestCode
                ? queryInfo.warehouseWorkerSettings.results
                : [...queryInfo.warehouseWorkerSettings.results, ...userSettings];
            setLang(newSettings[0].valueJson.lang);
            dispatchUser({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: newSettings
            });
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching user settings');
        }
    }, [dispatchUser, userFromState]);

    const getTranslations = useCallback(async () => {
        const query = gql`
            query {
                translations(filters: { type: "mobile" }, itemsPerPage: 999999999) {
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
    }, [dispatchUser, userFromState]);

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
            <MessagePositionManager />
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
