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
import MainLayout from '../../../../components/layouts/MainLayout';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { boxesRoutes as itemRoutes } from 'modules/Boxes/Static/boxesRoutes';
import { HandlingUnitContentOutboundModelV2 } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, HandlingUnitContentOutboundModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditBoxLinePage: PageComponent = (props) => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const boxDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.handlingUnitOutbound_name}`,
            path: '/boxes/' + data?.handlingUnitOutboundId
        }
    ];

    const breadCrumb = [
        ...boxDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.handlingUnitOutbound_name} - ${t('common:line')} ${
        data?.lineNumber
    }`;

    return (
        <>
            <AppHead title={pageTitle} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={HandlingUnitContentOutboundModelV2}
                headerComponent={
                    <HeaderContent
                        title={pageTitle}
                        routes={breadCrumb}
                        onBack={() => router.push(`/boxes/boxLine/${id}`)}
                    />
                }
                routeAfterSuccess={`/boxes/boxLine/:id`}
            />
        </>
    );
};

EditBoxLinePage.layout = MainLayout;

export default EditBoxLinePage;
