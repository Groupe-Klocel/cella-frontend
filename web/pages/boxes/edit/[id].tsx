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
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';

import { HandlingUnitOutboundModelV2 as model } from 'models/HandlingUnitOutboundModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { META_DEFAULTS } from '@helpers';
import { boxesRoutes as itemRoutes } from 'modules/Boxes/Static/boxesRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const EditBoxPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

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
                            title={`${t('common:box')} ${data?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/boxes/${id}`)}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/boxes/${id}`}
                routeOnCancel={`/boxes/${id}`}
            />
        </>
    );
};

EditBoxPage.layout = MainLayout;

export default EditBoxPage;
