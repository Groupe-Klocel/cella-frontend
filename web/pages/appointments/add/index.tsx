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
import { FC, useMemo } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { AppointmentModelV2 } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addAppointmentRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { useAppState } from 'context/AppContext';
import { AddEditAppointmentForm } from 'modules/Appointments/Forms/AddEditAppointmentForm';

type PageComponent = FC & { layout: typeof MainLayout };

const AddAppointmentPage: PageComponent = () => {
    const { t } = useTranslation();
    const { parameters, configs } = useAppState();
    const router = useRouter();
    const { locale } = router;
    const language = (locale === 'en-US' ? 'en' : locale) ?? 'en';

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };
        const appointmentStatusInCreation = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'In Creation'
        );
        return {
            appointmentStatusInCreation
        };
    }, [configs, parameters, language]);

    const defaultValues = {
        status: parseInt(configsParamsCodes.appointmentStatusInCreation)
    };

    return (
        <>
            <AppHead title={t('actions:add2', { name: t('common:appointment') })} />

            <AddEditAppointmentForm
                dataModel={AppointmentModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-appointment')}
                        routes={addAppointmentRoutes}
                        onBack={() => router.push(`/appointments`)}
                    />
                }
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                routeAfterSuccess={`/appointments/:id`}
            />
        </>
    );
};

AddAppointmentPage.layout = MainLayout;

export default AddAppointmentPage;
