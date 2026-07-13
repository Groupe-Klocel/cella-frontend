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

import { AppHead, ContentSpin, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC, useMemo } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import {
    getVisitStatusCodes,
    getVisitTypeCode,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { VisitorModelV2 } from '@helpers';
import { preRegisterVisitorRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';

type PageComponent = FC & { layout: typeof MainLayout };

const PreRegisterVisitorPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { configs } = useAppState();

    const visitTypeCode = useMemo(() => getVisitTypeCode(configs), [configs]);
    const visitStatuses = useMemo(() => getVisitStatusCodes(configs), [configs]);

    // the visit is created as type Visit / status Pre-registered; the reference
    // number (name) is generated server-side
    const extraData = {
        appointmentType: visitTypeCode,
        status: visitStatuses.preRegistered
    };

    return (
        <>
            <AppHead title={t('actions:pre-register-visitor')} />
            {visitTypeCode !== undefined && visitStatuses.preRegistered !== undefined ? (
                <AddEditItemComponent
                    dataModel={VisitorModelV2}
                    extraData={extraData}
                    extraRules={[
                        {
                            fieldsInfo: 'driverEmail',
                            type: 'email',
                            message: t('messages:error-wrong-email-format')
                        }
                    ]}
                    headerComponent={
                        <HeaderContent
                            title={t('actions:pre-register-visitor')}
                            routes={preRegisterVisitorRoutes}
                            onBack={() => router.push(`/visitors`)}
                        />
                    }
                    routeAfterSuccess={`/visitors/:id`}
                    routeOnCancel={`/visitors`}
                />
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

PreRegisterVisitorPage.layout = MainLayout;

export default PreRegisterVisitorPage;
