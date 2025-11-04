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
import { META_DEFAULTS } from '@helpers';
import { cookie, getDefaultTheme } from '@helpers';
import 'antd/dist/reset.css';
import { AppProvider } from 'context/AppContext';
import { AuthProvider } from 'context/AuthContext';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Fragment, useEffect } from 'react';
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../styles/globals.css';
import AppLayout from 'components/layouts/AppLayout';
import { SessionProvider } from 'next-auth/react';

const themes = {
    dark: `/dark-theme.css`,
    light: `/light-theme.css`
};

// Query should not invalidate until 5 secs
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 1000
        }
    }
});

type AppLayoutProps = AppProps & {
    Component: PageWithMainLayoutType;
};

const App = ({ Component, pageProps: { session, ...pageProps } }: AppLayoutProps) => {
    const getLayout = Component.getLayout ?? ((page) => page);
    const Layout = Component.layout ?? Fragment;

    return (
        <>
            <Head>
                <title>{`${META_DEFAULTS.title} | ${META_DEFAULTS.description}`}</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=5"
                />
            </Head>
            <QueryClientProvider client={queryClient}>
                <SessionProvider session={session}>
                    <AuthProvider>
                        <AppProvider>
                            <AppLayout
                                Component={Component}
                                pageProps={pageProps}
                                getLayout={getLayout}
                                Layout={Layout}
                            />
                        </AppProvider>
                    </AuthProvider>
                    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
                </SessionProvider>
            </QueryClientProvider>
        </>
    );
};

export default App;
