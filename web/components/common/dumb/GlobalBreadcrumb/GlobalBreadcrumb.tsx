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
import {
    BreadcrumbTrailItem,
    BreadcrumbType,
    isNumeric,
    previewBreadcrumbTrail,
    registerBreadcrumbPage
} from '@helpers';
import { Breadcrumb } from 'antd';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';

export interface IBreadcrumbProps {
    routes?: Array<BreadcrumbType>;
}

const StyledBreadcrumb = styled(Breadcrumb)<{ $isDarkTheme: boolean }>`
    ${({ $isDarkTheme }) =>
        $isDarkTheme &&
        css`
            .ant-breadcrumb-separator {
                color: rgba(255, 255, 255, 0.45);
            }

            li:last-child,
            li:last-child a {
                color: rgba(255, 255, 255, 0.85);
            }
        `}
`;

// True once React has hydrated on the client. The very first render of a hard-loaded page must
// match the server markup (the page's static routes); every later mount — a client-side
// navigation — can render the trail straight away, without a flash of the static routes.
let isHydrated = false;

/**
 * The page breadcrumb. `routes` are the page's own static routes (see
 * `modules/<X>/Static/<x>Routes.ts`); what is displayed is the trail of pages the user actually
 * went through, which these routes are merged into — see `helpers/utils/breadcrumbTrail.ts` for
 * the rules (append on navigation, truncate on a breadcrumb click, reset on a side-menu click).
 *
 * Without `routes` (section headers inside forms, sub-lists embedded in a detail page) nothing is
 * rendered and the trail is left untouched.
 */
const GlobalBreadcrumb: FC<IBreadcrumbProps> = ({ routes }: IBreadcrumbProps) => {
    const { userSettings, tempTheme } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const [hydrated, setHydrated] = useState<boolean>(isHydrated);

    useEffect(() => {
        if (!hydrated) {
            isHydrated = true;
            setHydrated(true);
        }
    }, []);

    const pageRoutes = routes ?? [];
    // routes arrays are rebuilt on every render by the pages: compare by content
    const routesKey = JSON.stringify(pageRoutes);
    // `router.asPath` is only reliable once the router is ready (hard load of a dynamic route)
    const isPageBreadcrumb = hydrated && router.isReady && pageRoutes.length > 0;

    const trail: Array<BreadcrumbTrailItem> | null = useMemo(
        () => (isPageBreadcrumb ? previewBreadcrumbTrail(pageRoutes, router.asPath) : null),
        [isPageBreadcrumb, routesKey, router.asPath]
    );

    useEffect(() => {
        if (isPageBreadcrumb) {
            registerBreadcrumbPage(pageRoutes, router.asPath);
        }
    }, [isPageBreadcrumb, routesKey, router.asPath]);

    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });

    const theme = tempTheme ?? generalUserSettings?.valueJson?.theme;

    const displayedItems: Array<BreadcrumbType & { pageHref?: string }> = trail ?? pageRoutes;

    const breadcrumbItems = displayedItems.map((item, index) => {
        const isLast = index === displayedItems.length - 1;
        // a previous page links back to the exact URL that was visited; the static path otherwise
        const href = (!isLast && item.pageHref) || item.path;
        const label = isNumeric(item.breadcrumbName) ? item.breadcrumbName : t(item.breadcrumbName);
        return {
            title: href ? <Link href={href}>{label}</Link> : label
        };
    });

    const isDarkTheme = theme !== 'light';

    return <StyledBreadcrumb items={breadcrumbItems} $isDarkTheme={isDarkTheme} />;
};

GlobalBreadcrumb.displayName = 'GlobalBreadcrumb';

export { GlobalBreadcrumb };
