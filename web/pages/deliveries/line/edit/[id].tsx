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
import { DeliveryLineModelV2 } from 'models/DeliveryLineModelV2';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { GetServerSideProps } from 'next';

interface PageProps {
    id: string;
    initialData?: any;
    DeliveryLineModelV2: any;
    error?: boolean;
    errorMessage?: string;
}

type PageComponent = FC<PageProps> & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, DeliveryLineModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditDeliveryPage: PageComponent = (props) => {
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
            breadcrumbName: `${t('common:line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.delivery_name} - ${t('common:line')} ${data?.lineNumber}`;

    return (
        <>
            <AppHead title={pageTitle} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={DeliveryLineModelV2}
                headerComponent={
                    <HeaderContent
                        title={pageTitle}
                        routes={breadCrumb}
                        onBack={() => router.push(`/deliveries/line/${id}`)}
                    />
                }
                routeAfterSuccess={`/deliveries/line/:id`}
            />
        </>
    );
};

EditDeliveryPage.layout = MainLayout;

export default EditDeliveryPage;
