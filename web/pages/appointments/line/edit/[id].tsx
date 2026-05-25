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
import MainLayout from 'components/layouts/MainLayout';
import { AppointmentLineModelV2 } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { appointmentsRoutes as itemRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { GetServerSideProps } from 'next';

interface PageProps {
    id: string;
    initialData?: any;
    AppointmentLineModelV2: any;
    error?: boolean;
    errorMessage?: string;
}

type PageComponent = FC<PageProps> & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, AppointmentLineModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditAppointmentPage: PageComponent = (props) => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id, count } = router.query;

    const appointmentDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.appointment_name}`,
            path: '/appointments/' + data?.appointmentId
        }
    ];

    const breadCrumb = [
        ...appointmentDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${count}`
        }
    ];

    const pageTitle = `${data?.appointment_name} - ${t('common:line')} ${count}`;

    return (
        <>
            <AppHead title={pageTitle} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={AppointmentLineModelV2}
                headerComponent={
                    <HeaderContent
                        title={pageTitle}
                        routes={breadCrumb}
                        onBack={() => router.push(`/appointments/line/${id}`)}
                    />
                }
                routeAfterSuccess={`/appointments/line/:id`}
            />
        </>
    );
};

EditAppointmentPage.layout = MainLayout;

export default EditAppointmentPage;
