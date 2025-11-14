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
import MainLayout from 'components/layouts/MainLayout';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { FeatureTypeDetailModelV2 } from 'models/FeatureTypeDetailModelV2';
import { featureTypesRoutes } from 'modules/FeatureTypes/Static/featureTypesRoutes';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, FeatureTypeDetailModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditFeatureTypeDetailPage: PageComponent = (props) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...featureTypesRoutes,
        {
            breadcrumbName: `${t('common:features-types-details')} / ${t('common:feature-code')} ${
                data?.featureTypeText
            }`
        }
    ];

    return (
        <>
            <AppHead
                title={`${t('common:features-types')} / ${t('common:feature-code')} / ${t(
                    'actions:edit'
                )} ${data?.featureTypeText}`}
            />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={FeatureTypeDetailModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:features-types')} / ${t('common:feature-code')} / ${t(
                            'actions:edit'
                        )} ${data?.featureTypeText}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/feature-types/details/:id`}
            />
        </>
    );
};

EditFeatureTypeDetailPage.layout = MainLayout;

export default EditFeatureTypeDetailPage;
