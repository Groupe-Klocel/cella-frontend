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
import { BoxLineModel } from 'models/BoxLineModel';
import { ItemDetailComponent } from 'modules/Crud/ItemDetailComponent';
import { BoxLineDetailsHeader } from 'modules/Boxes/Elements/BoxLineDetailsHeader';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { BoxLineDetailsExtra } from 'modules/Boxes/Elements/BoxLineDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxLinePage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;

    const [data, setData] = useState<any>();

    const contentId = data?.handlingUnitContentId;
    const BoxLineName =
        data?.handlingUnitContent_handlingUnit_handlingUnitOutbound_name + '-' + data?.lineNumber;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <BoxLineDetailsExtra
                        boxLineId={id!}
                        contentId={contentId!}
                        boxLineName={BoxLineName!}
                    />
                }
                headerComponent={
                    <BoxLineDetailsHeader
                        name={BoxLineName}
                        id={id!}
                        dataModel={BoxLineModel}
                        status={data?.status}
                    />
                }
                id={id!}
                dataModel={BoxLineModel}
                setData={setData}
            />
        </>
    );
};

BoxLinePage.layout = MainLayout;

export default BoxLinePage;
