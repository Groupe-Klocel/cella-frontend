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
import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { boxesRoutes as itemRoutes } from 'modules/Boxes/Static/boxesRoutes';
// import { BoxLineFeatureDetailsExtra } from 'modules/Boxes/Elements/BoxLineFeatureDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxLineFeaturePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const pageTitle = `${data?.featureCode_name}`;

    const headerData: HeaderData = {
        title: pageTitle,
        routes: itemRoutes,
        actionsComponent: undefined
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

BoxLineFeaturePage.layout = MainLayout;

export default BoxLineFeaturePage;
