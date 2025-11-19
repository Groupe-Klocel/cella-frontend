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
        returnReception
    } = useAppState();
    const router = useRouter();
    const [storage, setStorage] = useState<any>(null);
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<number>(0);

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
        const queryInfo: any = await graphqlRequestClient.request(query, variables);
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
        setUserSettingsLoading((prev) => prev + 1);
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
            setUserSettingsLoading((prev) => prev + 1);
        } catch (error) {
            console.log('error', error);
            showError('Error while fetching translations');
            setUserSettingsLoading((prev) => prev + 1);
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
        if (user && user?.id) {
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
            <MessagePositionManager />
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
