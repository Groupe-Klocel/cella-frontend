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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LoadExtrasModelV2 as model } from '@helpers';
import { loadsRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { EditLoadExtraForm } from 'modules/Loads/Forms/EditLoadExtraForm';

type PageComponent = FC & { layout: typeof MainLayout };

const EditLoadExtraPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // Extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );
    const breadsCrumb = [
        ...loadsRoutes,
        {
            breadcrumbName: `${router.query.loadName} / ${t('menu:edit-extra-information')} : ${router.query.extra_key}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:extra-information')} ${router.query.loadName}`} />
            <HeaderContent
                title={`${t('common:extra-information')} ${router.query.loadName}`}
                routes={breadsCrumb}
                onBack={() => router.push(`/loads/${router.query.id}`)}
            />
            <EditLoadExtraForm detailFields={detailFields} />
        </>
    );
};

EditLoadExtraPage.layout = MainLayout;

export default EditLoadExtraPage;
