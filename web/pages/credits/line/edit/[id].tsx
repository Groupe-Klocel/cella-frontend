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
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { CreditLineModelV2 } from 'models/CreditLineModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { META_DEFAULTS } from '@helpers';
import { creditsRoutes } from 'modules/Credits/Static/creditsRoutes';
import MainLayout from 'components/layouts/MainLayout';

type PageComponent = FC & { layout: typeof MainLayout };

const EditCreditLinePage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...creditsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${data?.name} - ${t('common:line')} ${data?.lineNumber}`;

    return (
        <>
            <AppHead title={pageTitle} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={CreditLineModelV2}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={pageTitle}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/credits/line/${id}`)}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/credits/line/${id}`}
                routeOnCancel={`/credits/line/${id}`}
            />
        </>
    );
};

EditCreditLinePage.layout = MainLayout;

export default EditCreditLinePage;
