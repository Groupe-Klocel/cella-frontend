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
import { AddHookConfigArgument } from 'modules/HookConfigs/PageContainer/AddHookConfigArgument';
import { useRouter } from 'next/router';
import { FC } from 'react';
import useTranslation from 'next-translate/useTranslation';
import { HookConfigModelV2 as model } from 'models/HookConfigModelV2';
import { hookConfigsRoutes } from 'modules/HookConfigs/Static/hookConfigsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const AddHookConfigArgumentPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // #region extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );
    const breadsCrumb = [
        ...hookConfigsRoutes,
        {
            breadcrumbName: `${router.query.hookConfigName}`
        }
    ];
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <HeaderContent
                title={`${t('common:hook-config')}${router.query.hookConfigName}`}
                routes={breadsCrumb}
                onBack={() => router.push(`/hook-configs/${router.query.id}`)}
            />
            <AddHookConfigArgument
                hookConfigId={router.query.id}
                hookConfigName={router.query.hookConfigName}
                detailFields={detailFields}
            />
        </>
    );
};

AddHookConfigArgumentPage.layout = MainLayout;

export default AddHookConfigArgumentPage;