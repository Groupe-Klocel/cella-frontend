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
import { ArticleSetModelV2 } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { articleSetsRoutes } from 'modules/ArticleSets/Static/articleSetRoutes';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, ArticleSetModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditArticleSetPage: PageComponent = (props) => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...articleSetsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:set')} ${data?.name}`} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={ArticleSetModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:set')} ${data?.name}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/article-sets/:id`}
            />
        </>
    );
};

EditArticleSetPage.layout = MainLayout;

export default EditArticleSetPage;
