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
import MainLayout from '../../../components/layouts/MainLayout';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { blocksRoutes } from 'modules/Blocks/Static/blocksRoutes';
import { BlockModelV2 } from '@helpers';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, BlockModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditBlockPage: PageComponent = (props) => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...blocksRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:block')} ${data?.name}`} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                dataModel={BlockModelV2}
                setData={setData}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={`${t('common:block')} ${data?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/blocks/${id}`)}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/blocks/${id}`}
                routeOnCancel={`/blocks/${id}`}
            />
        </>
    );
};

EditBlockPage.layout = MainLayout;

export default EditBlockPage;
