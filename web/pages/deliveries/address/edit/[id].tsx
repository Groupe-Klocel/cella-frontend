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
import { DeliveryAddressModelV2 } from 'models/DeliveryAddressModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditDeliveryPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const deliveryDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.delivery_name}`,
            path: '/deliveries/' + data?.deliveryId
        }
    ];

    const breadCrumb = [
        ...deliveryDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:delivery-address')} ${data?.categoryText}`
        }
    ];
    const pageTitle = `${t('common:delivery-address')} ${data?.categoryText}`;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={DeliveryAddressModelV2}
                headerComponent={
                    <HeaderContent
                        title={pageTitle}
                        routes={breadCrumb}
                        onBack={() => router.push(`/deliveries/address/${id}`)}
                    />
                }
                routeAfterSuccess={`/deliveries/address/:id`}
            />
        </>
    );
};

EditDeliveryPage.layout = MainLayout;

export default EditDeliveryPage;
