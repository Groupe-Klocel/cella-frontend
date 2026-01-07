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
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import configs from '../../../../common/configs.json';
import { HookConfigModelV2 } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addHookConfigRoutes } from 'modules/HookConfigs/Static/hookConfigsRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const AddHookConfigPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();

    return (
        <>
            <AppHead title={t('actions:add-hook-config')} />
            <AddEditItemComponent
                dataModel={HookConfigModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-hook-config')}
                        routes={addHookConfigRoutes}
                        onBack={() => router.push(`/hook-configs`)}
                    />
                }
                routeAfterSuccess={`/hook-configs/:id`}
                routeOnCancel={`/hook-configs`}
                stringCodeScopes={['object_name', 'operation_type', 'hook_config_hook_type']}
            />
        </>
    );
};

AddHookConfigPage.layout = MainLayout;

export default AddHookConfigPage;
