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
import { FC } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { META_DEFAULTS } from '@helpers';
import { AddFeatureComponent } from 'modules/HandlingUnits/PagesContainer/AddFeatureComponent';

type PageComponent = FC & { layout: typeof MainLayout };

const AddConversionPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();

    const onFinishRoute = `/handling-unit-contents/${router.query.handlingUnitContentId}`;

    const hucDetailBreadcrumb = [
        ...itemRoutes,
        {
            path: `/handling-unit-contents/${router.query.handlingUnitContentId}`,
            breadcrumbName: `${router.query.handlingUnitName} - ${router.query.articleName} x ${router.query.quantity}`
        }
    ];
    const breadCrumb = [
        ...hucDetailBreadcrumb,
        {
            breadcrumbName: 'actions:add-content-feature'
        }
    ];

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = {
        handlingUnitContentId: router.query.handlingUnitContentId,
        featureType: router.query.featureType
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddFeatureComponent
                dataModel={model}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-content-feature')}
                        routes={breadCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={onFinishRoute}
                routeOnCancel={onFinishRoute}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddConversionPage.layout = MainLayout;

export default AddConversionPage;
