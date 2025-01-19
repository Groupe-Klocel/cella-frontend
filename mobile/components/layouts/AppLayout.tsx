import { cookie, showError } from '@helpers';
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import { gql, GraphQLClient } from 'graphql-request';
import { ScreenSpin } from '@components';

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
    const { userSettings, user: userFromState } = useAppState();
    const router = useRouter();
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<number>(0);

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

    const [lang, setLang] = useState(
        generalUserSettings?.valueJson?.lang ? generalUserSettings?.valueJson?.lang : router.locale
    );

    const theme = generalUserSettings?.valueJson?.theme ?? 'light';

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

    useEffect(() => {
        if (user.id) {
            getUserSettings();
            getTranslations();
        } else {
            setUserSettingsLoading(2);
        }
    }, [user]);

    useEffect(() => {
        if (lang) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
    }, [lang]);

    if (userSettingsLoading < 2) {
        return <ScreenSpin />;
    }
    return (
        <ThemeSwitcherProvider defaultTheme={theme} themeMap={themes}>
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
