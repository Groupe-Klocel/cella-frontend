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
import Head from 'next/head';
import { FC, useMemo } from 'react';

export interface IAppHeadProps {
    title?: string;
    description?: string;
}

const AppHead: FC<IAppHeadProps> = ({ title, description }: IAppHeadProps) => {
    const pageTitle = useMemo(
        () =>
            title
                ? `${title} | ${META_DEFAULTS.title}`
                : `${META_DEFAULTS.title} | ${META_DEFAULTS.description}`,
        [title]
    );

    const pageDescription = useMemo(() => description ?? META_DEFAULTS.description, [description]);

    return (
        <Head>
            <title>{pageTitle}</title>

            <meta name="description" content={pageDescription} />

            <meta name="application-name" content={META_DEFAULTS.title} />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content={META_DEFAULTS.title} />
            <meta name="format-detection" content="telephone=no" />
            <meta name="mobile-web-app-capable" content="yes" />

            <meta property="og:type" content="website" />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />

            <meta name="msapplication-TileColor" content="#ffffff" />
            <meta name="theme-color" content="#dadada" />

            <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
            <link rel="mask-icon" href="/images/safari-pinned-tab.svg" color="#83ac9f" />
        </Head>
    );
};

AppHead.displayName = 'AppHead';

export { AppHead };
