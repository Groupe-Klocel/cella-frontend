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
import MainLayout from 'components/layouts/MainLayout';
import { AddSchedulerConfigArgument } from 'modules/SchedulerConfigs/PageContainer/AddSchedulerConfigArgument';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { SchedulerConfigModelV2 as model } from 'models/SchedulerConfigModelV2';
import { schedulerConfigsRoutes } from 'modules/SchedulerConfigs/Static/schedulerConfigsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const AddSchedulerConfigArgumentPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // #region extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );
    const breadsCrumb = [
        ...schedulerConfigsRoutes,
        {
            breadcrumbName: `${router.query.schedulerConfigName}`
        }
    ];
    return (
        <>
            <AppHead title={`${t('common:scheduler-config')}${router.query.schedulerConfigName}`} />
            <HeaderContent
                title={`${t('common:scheduler-config')}${router.query.schedulerConfigName}`}
                routes={breadsCrumb}
                onBack={() => router.push(`/scheduler-configs/${router.query.id}`)}
            />
            <AddSchedulerConfigArgument
                schedulerConfigId={router.query.id}
                schedulerConfigName={router.query.schedulerConfigName}
                detailFields={detailFields}
            />
        </>
    );
};

AddSchedulerConfigArgumentPage.layout = MainLayout;

export default AddSchedulerConfigArgumentPage;
