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
import { EditParameterExtraForm } from 'modules/Parameters/Forms/EditParameterExtraForm';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ParameterModelV2 as model } from 'models/ParameterModelV2';
import { parametersRoutes } from 'modules/Parameters/Static/ParametersRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const EditParameterExtraPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const urlBack = router.query.url ? `/${router.query.url}` : '/parameters';
    // #region extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );
    const breadsCrumb = [
        ...parametersRoutes,
        {
            breadcrumbName: `${router.query.parameterName}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:parameter')}${router.query.parameterName}`} />
            <HeaderContent
                title={`${t('common:parameter')}${router.query.parameterName}`}
                routes={breadsCrumb}
                onBack={() => router.push(`${urlBack}/${router.query.id}`)}
            />
            <EditParameterExtraForm detailFields={detailFields} urlBack={urlBack} />
        </>
    );
};

EditParameterExtraPage.layout = MainLayout;

export default EditParameterExtraPage;
