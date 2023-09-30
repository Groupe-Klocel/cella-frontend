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
import { ItemDetailComponent } from 'modules/Crud/ItemDetailComponent';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import { META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { GoodsInMovementModel } from 'models/GoodsInMovementModel';
import { GoodsInMovementDetailsExtra } from 'modules/GoodsIns/Elements/GoodsInMovementDetailsExtra';
import { GoodsInMovementDetailsHeader } from 'modules/GoodsIns/Elements/GoodsInMovementDetailsHeader';

type PageComponent = FC & { layout: typeof MainLayout };

const GoodsInMovementPage: PageComponent = () => {
    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<GoodsInMovementDetailsExtra goodsInMovementId={id!} />}
                headerComponent={
                    <GoodsInMovementDetailsHeader
                        id={id!}
                        goodsInId={data?.handlingUnitInboundId}
                        goodsInName={data?.handlingUnitInbound_name}
                        dataModel={GoodsInMovementModel}
                    />
                }
                id={id!}
                dataModel={GoodsInMovementModel}
                setData={setData}
            />
        </>
    );
};

GoodsInMovementPage.layout = MainLayout;

export default GoodsInMovementPage;
