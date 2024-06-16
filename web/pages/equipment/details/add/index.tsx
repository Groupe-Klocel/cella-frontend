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
import MainLayout from 'components/layouts/MainLayout';
import { AddEquipmentDetail } from 'modules/Equipment/PagesContainer/AddEquipmentDetail';
import { useRouter } from 'next/router';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const AddEquipmentDetailPage: PageComponent = () => {
    const router = useRouter();

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddEquipmentDetail
                equipmentId={router.query.equipmentId}
                equipmentName={router.query.equipmentName}
                stockOwnerId={router.query.stockOwnerId}
                carrierShippingModeId={router.query.carrierShippingModeId}
                carrierShippingModeName={router.query.carrierShippingModeName}
            />
        </>
    );
};

AddEquipmentDetailPage.layout = MainLayout;

export default AddEquipmentDetailPage;
