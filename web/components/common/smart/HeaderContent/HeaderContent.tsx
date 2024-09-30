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
import { BreadcrumbType } from '@helpers';
// import { PageHeader } from 'antd';
import CustomPageHeader from 'components/common/dumb/PageHeader/CustomPageHeader';
import { FC, ReactNode } from 'react';

export interface IHeaderContentProps {
    children?: ReactNode;
    title: string;
    routes?: Array<BreadcrumbType>;
    onBack?: any;
    actionsRight?: ReactNode;
    actionsLeft?: ReactNode;
}

const HeaderContent: FC<IHeaderContentProps> = ({
    children,
    title,
    routes,
    actionsRight,
    actionsLeft,
    onBack
}: IHeaderContentProps) => {
    return (
        <CustomPageHeader
            title={title}
            breadcrumb={<GlobalBreadcrumb routes={routes} />}
            onBack={onBack}
            subTitle={actionsLeft}
            extra={actionsRight}
        >
            {children}
        </CustomPageHeader>
    );
};

HeaderContent.displayName = 'HeaderContent';

export { HeaderContent };
