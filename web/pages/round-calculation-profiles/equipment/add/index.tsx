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
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';
import { META_DEFAULTS } from '@helpers';
import { useRouter } from 'next/router';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { roundCalculationProfilesRoutes } from 'modules/RoundCalculationProfiles/Static/roundCalculationProfilesRoutes';
import { RoundCalculationProfileEquipmentModelV2 as model } from 'models/RoundCalculationProfileEquipmentModelV2';

type PageComponent = FC & { layout: typeof MainLayout };

const AddEquipmentPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');

    //enter between {} the default values for the form (for instance status "In progress"))
    const { roundCalculationProfileId, prevMaxOrder, roundCalculationProfileName } = router.query;

    const defaultValues = {
        roundCalculationProfileId: router.query.roundCalculationProfileId,
        order: prevMaxOrder ? parseInt(prevMaxOrder as string) + 1 : 1
    };

    const roundCalculationProfileRoutes = [
        ...roundCalculationProfilesRoutes,
        {
            breadcrumbName: `${roundCalculationProfileName}`,
            path: '/round-calculation-profiles/' + roundCalculationProfileId
        }
    ];

    const addRoundCalculationProfileEquipmentRoutes = [
        ...roundCalculationProfileRoutes,
        {
            breadcrumbName: 'actions:associate-equipment'
        }
    ];

    return (
        <>
            <AppHead
                title={t('associate', {
                    name: t('common:equipment')
                })}
            />
            <AddEditItemComponent
                headerComponent={
                    <HeaderContent
                        title={t('associate', {
                            name: t('common:equipment')
                        })}
                        routes={addRoundCalculationProfileEquipmentRoutes}
                        onBack={() => router.push('/round-calculation-profiles/')}
                    />
                }
                dataModel={model}
                routeAfterSuccess={`/round-calculation-profiles/${roundCalculationProfileId}`}
                routeOnCancel={`/round-calculation-profiles/${roundCalculationProfileId}`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddEquipmentPage.layout = MainLayout;

export default AddEquipmentPage;
