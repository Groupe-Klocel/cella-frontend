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
import { BoxLineFeatureModel } from 'models/BoxLineFeatureModel';
import { ItemDetailComponent } from 'modules/Crud/ItemDetailComponent';
import { BoxLineFeatureDetailsHeader } from 'modules/Boxes/Elements/BoxLineFeatureDetailsHeader';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
// import { BoxLineFeatureDetailsExtra } from 'modules/Boxes/Elements/BoxLineFeatureDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxLineFeaturePage: PageComponent = () => {
    const router = useRouter();
    const { id, name } = router.query;

    const [data, setData] = useState<any>();

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <></>
                    // <BoxLineFeatureDetailsExtra boxLineId={id!} />
                }
                headerComponent={
                    <BoxLineFeatureDetailsHeader
                        name={name + ' / ' + data?.featureCode_name}
                        id={id!}
                        dataModel={BoxLineFeatureModel}
                    />
                }
                id={id!}
                dataModel={BoxLineFeatureModel}
                setData={setData}
            />
        </>
    );
};

BoxLineFeaturePage.layout = MainLayout;

export default BoxLineFeaturePage;
