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
import { HandlingUnitOutboundBarcodeModelV2 } from 'models/HandlingUnitOutboundBarcodeModelV2';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addHandlingUnitOutboundBarcodeRoutes } from 'modules/HandlingUnitOutboundBarcodes/Static/handlingUnitOutboundBarcodesRoutes';
import { META_DEFAULTS } from '@helpers';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddHandlingUnitOutboundBarcodePage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = {};

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddItemComponent
                dataModel={HandlingUnitOutboundBarcodeModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-handling-unit-outbound-barcode')}
                        routes={addHandlingUnitOutboundBarcodeRoutes}
                        onBack={() => router.push(`/handling-unit-outbound-barcodes`)}
                    />
                }
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                routeAfterSuccess={`/handling-unit-outbound-barcodes`}
                stringCodeScopes={['barcode_type']}
            />
        </>
    );
};

AddHandlingUnitOutboundBarcodePage.layout = MainLayout;

export default AddHandlingUnitOutboundBarcodePage;
