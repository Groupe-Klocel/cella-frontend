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
import { AppHead, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { CustomerOrderLineModelV2 } from 'models/CustomerOrderLineModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditCustomerOrderPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const customerOrderDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.order_name}`,
            path: '/customer-orders/' + data?.orderId
        }
    ];

    const breadCrumb = [
        ...customerOrderDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.order_name} - ${t('common:line')} ${data?.lineNumber}`;
    return (
        <>
            <AppHead title={pageTitle} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={CustomerOrderLineModelV2}
                headerComponent={
                    <HeaderContent
                        title={pageTitle}
                        routes={breadCrumb}
                        onBack={() => router.push(`/customer-orders/line/${id}`)}
                    />
                }
                routeAfterSuccess={`/customer-orders/line/:id`}
            />
        </>
    );
};

EditCustomerOrderPage.layout = MainLayout;

export default EditCustomerOrderPage;
