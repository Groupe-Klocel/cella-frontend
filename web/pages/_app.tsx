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
import { META_DEFAULTS } from 'helpers/configs/misc';
import 'antd/dist/reset.css';
import { AppProvider, useAppState } from 'context/AppContext';
import { AuthProvider } from 'context/AuthContext';
import { PageWithMainLayoutType } from 'helpers/types/pageWithLayout';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Fragment } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../styles/globals.css';
import HomePage from 'pages';
import AppLayout from '../components/layouts/AppLayout'; // Import the new AppLayout component

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

const App = ({ Component, pageProps }: AppLayoutProps) => {
    const getLayout = Component.getLayout ?? ((page) => page);
    const Layout = Component.layout ?? Fragment;

    let isAllowed = true;

    const ComponentToRender = isAllowed ? Component : HomePage;

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
                <AuthProvider>
                    <AppProvider>
                        <AppLayout
                            Component={ComponentToRender}
                            pageProps={pageProps}
                            getLayout={getLayout}
                            Layout={Layout}
                        />
                    </AppProvider>
                </AuthProvider>
                {/* <ReactQueryDevtools initialIsOpen={false} /> */}
            </QueryClientProvider>
        </>
    );
};

export default App;
