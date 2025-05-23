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
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { SingleParameterModelV2 } from 'models/SingleParameterModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { articlesFamiliesRoutes } from 'modules/ArticlesFamilies/Static/articlesFamiliesRoutes';
import { META_DEFAULTS } from '@helpers';
import { EditConfigParamComponent } from 'modules/Crud/EditConfigParamComponentV2';

type PageComponent = FC & { layout: typeof MainLayout };

const EditArticleFamilyPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...articlesFamiliesRoutes,
        {
            breadcrumbName: `${data?.value}`
        }
    ];

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditConfigParamComponent
                id={id!}
                setData={setData}
                dataModel={SingleParameterModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('actions:edit-articles-family')} ${data?.value}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                comeFromFiltered={true}
                routeAfterSuccess={`/articles-families/:id`}
            />
        </>
    );
};

EditArticleFamilyPage.layout = MainLayout;

export default EditArticleFamilyPage;
