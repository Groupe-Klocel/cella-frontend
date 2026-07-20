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

import { AppHead } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AddAppointmentLine } from 'modules/Appointments/PageContainer/AddAppointmentLine';

type PageComponent = FC & { layout: typeof MainLayout };

const AddAppointmentLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');

    return (
        <>
            <AppHead title={t('add2', { name: t('common:appointment-line') })} />
            <AddAppointmentLine
                appointmentId={router.query.appointmentId}
                appointmentName={router.query.appointmentName}
                appointmentType={router.query.appointmentType}
                stockOwnerId={router.query.stockOwnerId}
                stockOwnerName={router.query.stockOwnerName}
                carrierId={router.query.carrierId}
            />
        </>
    );
};

AddAppointmentLinePage.layout = MainLayout;

export default AddAppointmentLinePage;
