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
import { LogisticUnitModelV2 as model } from 'models/LogisticUnitModelV2';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addLogisticUnitRoutes } from 'modules/LogisticUnits/Static/logisticUnitsRoutes';
import { META_DEFAULTS } from '@helpers';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddLogisticUnitPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = { status: configs.LOGISTIC_UNIT_STATUS_IN_PROGRESS };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddItemComponent
                dataModel={model}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-logistic-unit-model')}
                        routes={addLogisticUnitRoutes}
                        onBack={() => router.push(`/logistic-units`)}
                    />
                }
                routeAfterSuccess={`/logistic-units/:id`}
                routeOnCancel={`/logistic-units`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddLogisticUnitPage.layout = MainLayout;

export default AddLogisticUnitPage;
