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
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { HeaderData } from 'modules/Crud/ListComponent';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';
import { EquipmentModelV2 } from 'models/EquipmentModelV2';
import { equipmentRoutes } from 'modules/Equipment/Static/equipmentRoutes';
import { EquipmentListComponent } from 'modules/Equipment/Elements/EquipmentListComponent';

type PageComponent = FC & { layout: typeof MainLayout };

const EquipmentPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, EquipmentModelV2.tableName);

    const headerData: HeaderData = {
        title: t('common:equipments'),
        routes: equipmentRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pieceOfEquipment') })}
                    path="/equipment/add"
                    type="primary"
                />
            ) : null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EquipmentListComponent
                headerData={headerData}
                dataModel={EquipmentModelV2}
                routeDetailPage={'/equipment/:id'}
            />
        </>
    );
};

EquipmentPage.layout = MainLayout;

export default EquipmentPage;
