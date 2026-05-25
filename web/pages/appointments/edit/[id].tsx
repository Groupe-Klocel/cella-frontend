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
import {
    AppointmentModelV2,
    fetchInitialData,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { GetServerSideProps } from 'next';
import { appointmentsRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { AddEditAppointmentForm } from 'modules/Appointments/Forms/AddEditAppointmentForm';

type PageComponent = FC & { layout: typeof MainLayout };

export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, AppointmentModelV2);
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
    const { id } = router.query;

    const breadsCrumb = [
        ...appointmentsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:appointments')} ${data?.name}`} />
            <AddEditAppointmentForm
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={AppointmentModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:appointments')} ${data?.name}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/appointments/:id`}
            />
        </>
    );
};

EditAppointmentPage.layout = MainLayout;

export default EditAppointmentPage;
