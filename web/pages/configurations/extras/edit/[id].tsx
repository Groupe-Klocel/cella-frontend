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
import { META_DEFAULTS } from '@helpers';
import MainLayout from '../../../../components/layouts/MainLayout';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ConfigModelV2 as model } from 'models/ConfigModelV2';
import { configurationsRoutes } from 'modules/Configurations/Static/configurationRoutes';
import { EditConfigurationExtraForm } from 'modules/Configurations/Forms/EditConfigurationExtraForm';

type PageComponent = FC & { layout: typeof MainLayout };

const EditParameterExtraPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // #region extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );
    const breadsCrumb = [
        ...configurationsRoutes,
        {
            breadcrumbName: `${router.query.parameterName}`
        }
    ];

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <HeaderContent
                title={`${t('common:configurations')}${router.query.parameterName}`}
                routes={breadsCrumb}
                onBack={() => router.push(`/configurations/${router.query.id}`)}
            />
            <EditConfigurationExtraForm detailFields={detailFields} />
        </>
    );
};

EditParameterExtraPage.layout = MainLayout;

export default EditParameterExtraPage;
