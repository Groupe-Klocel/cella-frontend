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
import { FC, useMemo, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { LoadModelV2, getReservedCarrierExclusionFilters, findCodeByScopeAndValue } from '@helpers';
import { fetchInitialData, useTranslationWithFallback as useTranslation } from '@helpers';
import { loadsRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { useAppState } from 'context/AppContext';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, LoadModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditLoadsPage: PageComponent = (props) => {
    const { t } = useTranslation();
    const { configs: appConfigs } = useAppState();

    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    // Exclude reserved carriers (virtual / closed) from the carrier dropdown. The closed status
    // code is resolved from AppState configs (scope 'carrier_status', value 'closed').
    const carrierExclusionFilters = useMemo(() => {
        // status is an Int -> parse the resolved code (undefined stays undefined so the
        // status clause is dropped and only isVirtual is applied).
        const code = findCodeByScopeAndValue(appConfigs ?? [], 'carrier_status', 'closed');
        return getReservedCarrierExclusionFilters(code != null ? parseInt(code, 10) : undefined);
    }, [appConfigs]);

    const breadsCrumb = [
        ...loadsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:load')} ${data?.name}`} />
            <AddEditItemComponent
                id={id as string}
                initialProps={props}
                setData={setData}
                dataModel={LoadModelV2}
                // Exclude reserved carriers (virtual / closed) from the carrier dropdown — generic
                // option-list constraint, applied only here (the loads list/filter is unaffected).
                optionsConstraints={{
                    carrierId: { advancedFilters: carrierExclusionFilters }
                }}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={`${t('common:load')} ${data?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/loads/${id}`)}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/loads/:id`}
                routeOnCancel={`/loads/:id`}
            />
        </>
    );
};

EditLoadsPage.layout = MainLayout;

export default EditLoadsPage;
