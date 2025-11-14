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
import { HandlingUnitModelModelV2 as model } from 'models/HandlingUnitModelModelV2';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { handlingUnitModelsRoutes } from 'modules/HandlingUnitModels/Static/handlingUnitModelsRoutes';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, model);
    return {
        props: {
            ...initialData
        }
    };
};

const EditHandlingUnitModelPage: PageComponent = (props) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...handlingUnitModelsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:handling-unit-model')} ${data?.name}`} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={model}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:handling-unit-model')} ${data?.name}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/handling-unit-models/:id`}
            />
        </>
    );
};

EditHandlingUnitModelPage.layout = MainLayout;

export default EditHandlingUnitModelPage;
