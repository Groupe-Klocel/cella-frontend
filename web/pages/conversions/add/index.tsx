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
import { ConversionModelV2 } from '@helpers';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addConversionRoutes } from 'modules/Conversions/Static/conversionsRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const AddConversionPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = { status: configs.CONVERSION_STATUS_IN_PROGRESS };

    return (
        <>
            <AppHead title={t('actions:add-conversion')} />
            <AddEditItemComponent
                dataModel={ConversionModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-conversion')}
                        routes={addConversionRoutes}
                        onBack={() => router.push(`/conversions`)}
                    />
                }
                routeAfterSuccess={`/conversions/:id`}
                routeOnCancel={`/conversions`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddConversionPage.layout = MainLayout;

export default AddConversionPage;
