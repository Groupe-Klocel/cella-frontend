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
import { FC, useState } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS } from '@helpers';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const EditStockOwnerPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const hucDetailBreadcrumb = [
        ...itemRoutes,
        {
            path: `/handling-unit-contents/${data?.handlingUnitContentId}`,
            breadcrumbName: `${data?.handlingUnitContent_handlingUnit_name} - ${data?.handlingUnitContent_article_name} x ${data?.handlingUnitContent_quantity}`
        }
    ];
    const breadCrumb = [
        ...hucDetailBreadcrumb,
        {
            breadcrumbName: `${data?.featureCode_name} - ${data?.value}`
        }
    ];
    const pageTitle = `${t('common:content-feature')} ${data?.featureCode_name} - ${data?.value}`;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={model}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={pageTitle}
                            routes={breadCrumb}
                            onBack={() => router.back()}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/handling-unit-contents/feature/${id}`}
                routeOnCancel={`/handling-unit-contents/feature/${id}`}
            />
        </>
    );
};

EditStockOwnerPage.layout = MainLayout;

export default EditStockOwnerPage;
