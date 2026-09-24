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
import { GlobalBreadcrumb } from '@components';
import { BreadcrumbType, getBreadcrumbBackHref } from '@helpers';
// import { PageHeader } from 'antd';
import CustomPageHeader from 'components/common/dumb/PageHeader/CustomPageHeader';
import { useRouter } from 'next/router';
import { FC, ReactNode } from 'react';

export interface IHeaderContentProps {
    children?: ReactNode;
    title: string;
    routes?: Array<BreadcrumbType>;
    onBack?: any;
    actionsRight?: ReactNode;
    actionsLeft?: ReactNode;
    tags?: ReactNode;
}

const HeaderContent: FC<IHeaderContentProps> = ({
    children,
    title,
    routes,
    actionsRight,
    actionsLeft,
    onBack,
    tags
}: IHeaderContentProps) => {
    const router = useRouter();
    // the back arrow follows the breadcrumb trail: back to the page the user actually came from
    // (the delivery line an article was opened from…); the page's own `onBack` applies when the
    // trail holds nothing before the page. Resolved at click time, once the trail is registered.
    const handleBack = onBack
        ? () => {
              const href =
                  routes && routes.length > 0 ? getBreadcrumbBackHref(routes, router.asPath) : null;
              if (href) {
                  router.push(href);
              } else {
                  onBack();
              }
          }
        : undefined;
    return (
        <CustomPageHeader
            title={title}
            breadcrumb={<GlobalBreadcrumb routes={routes} />}
            onBack={handleBack}
            subTitle={actionsLeft}
            extra={actionsRight}
            tags={tags}
        >
            {children}
        </CustomPageHeader>
    );
};

HeaderContent.displayName = 'HeaderContent';

export { HeaderContent };
