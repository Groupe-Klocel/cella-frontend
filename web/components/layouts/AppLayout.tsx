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
import { cookie, showError, FIELD_RULES_SUFFIX } from '@helpers';
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
    // true once the app bootstrap data (user settings, translations, configs, parameters)
    // has been fetched at least once for the logged-in user
    const [appDataLoaded, setAppDataLoaded] = useState<boolean>(false);

    useEffect(() => {
        const scrollableContainer = document.querySelector('.app-content-scroll');
        if (scrollableContainer && !router.query?.scrollTo) {
            scrollableContainer.scrollTo(0, 0);
        }
    }, [router.asPath]);

    useEffect(() => {
        // Permissions arrive asynchronously (GetMyInfo dispatched by ProtectRoute/LoginForm):
        // never reject while they are not loaded yet — an undefined or transiently empty list
        // means "still booting", not "no access".
        if (!permissions || permissions.length === 0) {
            return;
        }
        const routeRules = authorizationList.filter((item) => item.route === router.pathname);
        if (routeRules.length === 0) {
            return;
        }
        const isAllowed = routeRules.some((item) =>
            permissions.some(
                (permission) =>
                    permission.table === item.permission && permission.mode === item.mode
            )
        );
        if (!isAllowed) {
            console.warn(
                `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`,
                { routeRules, permissions }
            );
            showError(t('errors:APP-000200'));
            router.replace('/');
        }
    }, [router.pathname, permissions]);

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
            let queryInfo: any = await graphqlRequestClient.request(query, variables);

            const containsTestCode = queryInfo.warehouseWorkerSettings.results.some(
                (item: any) => item.code === 'globalParameters'
            );

            if (
                queryInfo.warehouseWorkerSettings.results.find(
                    (item: any) => item.code === 'globalParameters'
                )?.valueJson?.lang === 'fr'
            ) {
                queryInfo.warehouseWorkerSettings.results.find(
                    (item: any) => item.code === 'globalParameters'
                ).valueJson.lang = 'fr-FR';
            }

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
                translations(filters: { type: ["wm", "*"] }, itemsPerPage: 999999999) {
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
                        extras
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
                        extras
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
        }
    }, [dispatchUser, user]);

    // Which entities have a `<TABLE>_FIELD_RULES` rule (see helpers/utils/fieldRules.ts). Only the
    // names: the rows themselves are evaluated by the backend, per screen and per context. Knowing
    // the list up front is what keeps the feature free for the entities nobody configured — without
    // it, every detail/add/edit screen would fire an executeRule that can only fail.
    //
    // Failure is expected and must stay silent: a warehouse worker without read access to RULE gets
    // no field rules, not an error toast on every login. `null` tells the consumers "unknown", and
    // they fall back to trying once per entity.
    //
    // Unbounded page size, like the other boot fetches, and it has to be: the query has no `orderBy`
    // and rows come back ordered by a random nanoid, so a bounded page would return an ARBITRARY
    // subset rather than a prefix. A `*_FIELD_RULES` rule left out of it would make the feature
    // silently inert for that entity, with no error and possibly differently on each load. Only
    // `name` is selected, so a large page costs next to nothing.
    const getFieldRuleNames = useCallback(async () => {
        const query = gql`
            query {
                rules(filters: {}, itemsPerPage: 999999999) {
                    count
                    results {
                        name
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query);
            dispatchUser({
                type: 'SET_FIELD_RULE_NAMES',
                fieldRuleNames: (queryInfo?.rules?.results ?? [])
                    .map((rule: any) => rule?.name)
                    .filter(
                        (name: any) => typeof name === 'string' && name.endsWith(FIELD_RULES_SUFFIX)
                    )
            });
        } catch (error) {
            console.info('field rules unavailable, falling back to the model defaults', error);
            dispatchUser({ type: 'SET_FIELD_RULE_NAMES', fieldRuleNames: null });
        }
    }, [dispatchUser, user]);

    useEffect(() => {
        if (user && user?.id && router.pathname !== '/login') {
            // Each getter dispatches into AppContext and handles its own errors, so a failed
            // fetch never rejects here and never blocks the app. The flag is not reset on
            // navigation: the data refreshes in the background, only the first load gates
            // the rendering.
            Promise.allSettled([
                getUserSettings(),
                getTranslations(),
                getConfigs(),
                getParameters(),
                getFieldRuleNames()
            ]).then(() => setAppDataLoaded(true));
        } else if (router.pathname === '/login') {
            setAppDataLoaded(false);
        }
    }, [user, router.pathname]);

    useEffect(() => {
        if (lang) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
    }, [lang]);

    if (
        !appDataLoaded &&
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
