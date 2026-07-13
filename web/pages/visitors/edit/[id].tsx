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
import { FC, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { Alert } from 'antd';
import { useAppState } from 'context/AppContext';
import { getVisitStatusCodes, useTranslationWithFallback as useTranslation } from '@helpers';
import { VisitorModelV2 } from '@helpers';
import { visitorsRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { fetchInitialData } from '@helpers';
import { GetServerSideProps } from 'next';

type PageComponent = FC & { layout: typeof MainLayout };

// edit with caution: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
export const getServerSideProps: GetServerSideProps = async (context) => {
    const initialData = await fetchInitialData(context, VisitorModelV2);
    return {
        props: {
            ...initialData
        }
    };
};

const EditVisitorPage: PageComponent = (props: any) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { configs } = useAppState();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const visitStatuses = useMemo(() => getVisitStatusCodes(configs), [configs]);

    const breadsCrumb = [
        ...visitorsRoutes,
        {
            breadcrumbName: `${data?.name ?? props?.initialData?.name ?? ''}`
        }
    ];

    const pageTitle = `${t('actions:edit')} ${data?.name ?? props?.initialData?.name ?? ''}`;

    // a pre-registration can only be modified while the visit is Pre-registered
    const isEditable = props?.initialData?.status === visitStatuses.preRegistered;

    return (
        <>
            <AppHead title={pageTitle} />
            {isEditable ? (
                <AddEditItemComponent
                    id={id as string}
                    initialProps={props}
                    setData={setData}
                    dataModel={VisitorModelV2}
                    extraRules={[
                        {
                            fieldsInfo: 'driverEmail',
                            type: 'email',
                            message: t('messages:error-wrong-email-format')
                        }
                    ]}
                    headerComponent={
                        <HeaderContent
                            title={pageTitle}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/visitors/${id}`)}
                        />
                    }
                    routeAfterSuccess={`/visitors/:id`}
                    routeOnCancel={`/visitors/${id}`}
                />
            ) : (
                <>
                    <HeaderContent
                        title={pageTitle}
                        routes={breadsCrumb}
                        onBack={() => router.push(`/visitors/${id}`)}
                    />
                    <Alert
                        type="warning"
                        showIcon
                        style={{ margin: 16 }}
                        message={t('messages:visit-not-editable')}
                    />
                </>
            )}
        </>
    );
};

EditVisitorPage.layout = MainLayout;

export default EditVisitorPage;
