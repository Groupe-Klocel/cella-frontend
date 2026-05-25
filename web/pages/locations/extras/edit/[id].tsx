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
import { useRouter } from 'next/router';
import { FC } from 'react';
import { EditLocationExtrasForm } from 'modules/Locations/Forms/EditLocationExtrasForm';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { locationsRoutes } from 'modules/Locations/Static/locationsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const EditLocationExtrasPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { id, locationName } = router.query;

    const breadCrumb = [
        ...locationsRoutes,
        {
            breadcrumbName: `${locationName ?? id} / ${t('menu:edit-extra-information')}`
        }
    ];

    return (
        <>
            <AppHead
                title={`${t('common:location')} ${locationName ?? id} - ${t('common:dock-extras-information')}`}
            />
            <HeaderContent
                title={`${t('common:dock-extras-information')} - ${locationName ?? id}`}
                routes={breadCrumb}
                onBack={() => router.push(`/locations/${id}`)}
            />
            <EditLocationExtrasForm
                locationId={id as string}
                locationName={locationName as string | undefined}
            />
        </>
    );
};

EditLocationExtrasPage.layout = MainLayout;

export default EditLocationExtrasPage;
