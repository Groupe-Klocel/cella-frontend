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
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { CustomerOrderModelV2 as model } from 'models/CustomerOrderModelV2';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS } from '@helpers';
import configs from '../../../../common/configs.json';
import { addCustomerOrderRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { AddCustomerOrderComponent } from 'modules/CustomerOrders/PageContainer/AddCustomerOrder';

type PageComponent = FC & { layout: typeof MainLayout };

const AddCustomerOrderPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();

    const defaultValues = {
        status: configs.ORDER_STATUS_CREATED,
        type: configs.ORDER_TYPE_CUSTOMER_ORDER
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddCustomerOrderComponent
                dataModel={model}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add2', { name: t('common:customer-order') })}
                        routes={addCustomerOrderRoutes}
                        onBack={() => router.push(`/customer-orders`)}
                    />
                }
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                routeOnCancel={`/customer-orders`}
                routeAfterSuccess={''}
            />
        </>
    );
};

AddCustomerOrderPage.layout = MainLayout;

export default AddCustomerOrderPage;
