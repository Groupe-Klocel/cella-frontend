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
import { BreadcrumbType, isNumeric } from '@helpers';
import { Breadcrumb } from 'antd';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import Link from 'next/link';
import { FC } from 'react';
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

const GlobalBreadcrumb: FC<IBreadcrumbProps> = ({ routes }: IBreadcrumbProps) => {
    const { userSettings, tempTheme } = useAppState();
    const { t } = useTranslation();

    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });

    const theme = tempTheme ?? generalUserSettings?.valueJson?.theme;

    const breadcrumbItems =
        routes?.map((item) => ({
            title: item.path ? (
                <Link href={item.path}>
                    {isNumeric(item.breadcrumbName) ? item.breadcrumbName : t(item.breadcrumbName)}
                </Link>
            ) : isNumeric(item.breadcrumbName) ? (
                item.breadcrumbName
            ) : (
                t(item.breadcrumbName)
            )
        })) || [];

    const isDarkTheme = theme !== 'light';

    return <StyledBreadcrumb items={breadcrumbItems} $isDarkTheme={isDarkTheme} />;
};

GlobalBreadcrumb.displayName = 'GlobalBreadcrumb';

export { GlobalBreadcrumb };
