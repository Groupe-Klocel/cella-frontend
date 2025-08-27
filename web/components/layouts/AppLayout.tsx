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
    const { userSettings, user, permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<number>(0);

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
        const queryInfo: any = await graphqlRequestClient.request(query, variables);

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
        setUserSettingsLoading((prev) => prev + 1);
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
            setUserSettingsLoading((prev) => prev + 1);
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching translations');
            setUserSettingsLoading((prev) => prev + 1);
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
            setUserSettingsLoading((prev) => prev + 1);
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching configs');
            setUserSettingsLoading((prev) => prev + 1);
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
            setUserSettingsLoading((prev) => prev + 1);
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching parameters');
            setUserSettingsLoading((prev) => prev + 1);
        }
    }, [dispatchUser, user]);

    useEffect(() => {
        if (user?.id) {
            getUserSettings();
            getTranslations();
            getConfigs();
            getParameters();
        } else {
            setUserSettingsLoading(4);
        }
    }, [user]);

    useEffect(() => {
        if (lang) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
    }, [lang]);

    if (userSettingsLoading < 4) {
        return <ScreenSpin />;
    }

    return (
        <ThemeSwitcherProvider defaultTheme={theme} themeMap={themes}>
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
