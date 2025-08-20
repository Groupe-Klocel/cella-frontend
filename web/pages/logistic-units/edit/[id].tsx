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
import { LogisticUnitModelV2 } from 'models/LogisticUnitModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { logisticUnitsRoutes } from 'modules/LogisticUnits/Static/logisticUnitsRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditLogisticUnitPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...logisticUnitsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:logistic-units')} ${data?.name}`} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={LogisticUnitModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:logistic-units')} ${data?.name}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/logistic-units/:id`}
            />
        </>
    );
};

EditLogisticUnitPage.layout = MainLayout;

export default EditLogisticUnitPage;
