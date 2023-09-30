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
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS } from '@helpers';
import { EquipmentDetailDetailsExtra } from 'modules/Equipment/Elements/EquipmentDetailDetailsExtra';
import { EquipmentDetailModel } from 'models/EquipmentDetailModel';
import { EquipmentDetailDetailsHeader } from 'modules/Equipment/Elements/EquipmentDetailDetailsHeader';

type PageComponent = FC & { layout: typeof MainLayout };

const EquipmentDetailPage: PageComponent = () => {
    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<EquipmentDetailDetailsExtra equipmentDetailId={id!} />}
                headerComponent={
                    <EquipmentDetailDetailsHeader
                        equipmentId={data?.equipmentId}
                        equipmentName={data?.equipment_name}
                        handlingUnitModelName={data?.handlingUnitModel_name}
                        name={data?.lu_name}
                        id={id!}
                        dataModel={EquipmentDetailModel}
                    />
                }
                id={id!}
                dataModel={EquipmentDetailModel}
                setData={setData}
            />
        </>
    );
};

EquipmentDetailPage.layout = MainLayout;

export default EquipmentDetailPage;
