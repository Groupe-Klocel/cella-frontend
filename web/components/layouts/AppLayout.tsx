import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import { cookie } from '@helpers';
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
    const { userSettings, user } = useAppState();
    const router = useRouter();
    const dispatchUser = useAppDispatch();
    const [userSettingsLoading, setUserSettingsLoading] = useState<boolean>(true);

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
            (item: any) => item.code === 'globalParameters'
        );
        const newSettings = containsTestCode
            ? queryInfo.warehouseWorkerSettings.results
            : [...queryInfo.warehouseWorkerSettings.results, ...userSettings];
        dispatchUser({
            type: 'SWITCH_USER_SETTINGS',
            userSettings: newSettings
        });
        setUserSettingsLoading(false);
    }, [dispatchUser, user]);

    useEffect(() => {
        if (user?.id) {
            getUserSettings();
        } else {
            setUserSettingsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (lang) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
    }, [lang]);

    if (userSettingsLoading) {
        return <ScreenSpin />;
    }

    return (
        <ThemeSwitcherProvider defaultTheme={theme} themeMap={themes}>
            <Layout>{getLayout(<Component {...pageProps} />)}</Layout>
        </ThemeSwitcherProvider>
    );
};

export default AppLayout;
