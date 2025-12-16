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
import { META_DEFAULTS } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { configurationsRoutes } from 'modules/Configurations/Static/configurationRoutes';
import MainLayout from '../../../components/layouts/MainLayout';
import { EditConfigParamComponent } from 'modules/Crud/EditConfigParamComponentV2';
import { ConfigModelV2 } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditConfigurationPage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useTranslation();
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...configurationsRoutes,
        {
            breadcrumbName: `${data?.scope} - ${data?.code}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('actions:edit-configuration')} ${data?.scope} - ${data?.code}`} />
            <EditConfigParamComponent
                id={id!}
                setData={setData}
                dataModel={ConfigModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('actions:edit-configuration')} ${data?.scope} - ${data?.code}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/configurations/:id`}
            />
        </>
    );
};

EditConfigurationPage.layout = MainLayout;

export default EditConfigurationPage;
