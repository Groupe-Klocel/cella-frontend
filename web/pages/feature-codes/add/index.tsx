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
import { FeatureCodeModelV2 } from 'models/FeatureCodeModelV2';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { addFeatureCodeRoutes } from 'modules/FeatureCodes/Static/featureCodesRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const AddFeatureCodePage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddItemComponent
                dataModel={FeatureCodeModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-feature-code')}
                        routes={addFeatureCodeRoutes}
                        onBack={() => router.push(`/feature-codes`)}
                    />
                }
                routeAfterSuccess={`/feature-codes`}
            />
        </>
    );
};

AddFeatureCodePage.layout = MainLayout;

export default AddFeatureCodePage;
