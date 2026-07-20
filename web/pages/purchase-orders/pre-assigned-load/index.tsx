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

import { PurchaseOrderModelV2 as model } from '@helpers';
import { getModesFromPermissions, useTranslationWithFallback as useTranslation } from '@helpers';
import { Result } from 'antd';
import { AppHead } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import AssignPreloadPanel from 'modules/Preload/AssignPreloadPanel';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const PurchaseOrdersPreAssignedLoadPage: PageComponent = () => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    // fail closed: menu gating alone doesn't stop a direct URL hit — this page is exposed behind
    // the dedicated wm_purchase-orders-pre-assigned-load permission, so enforce READ here too.
    const canRead = getModesFromPermissions(
        permissions,
        'wm_purchase-orders-pre-assigned-load'
    ).includes(ModeEnum.Read);

    if (!canRead) {
        return (
            <>
                <AppHead title={t('common:assign-purchase-orders-to-load')} />
                <Result status="403" title={t('messages:access-denied')} />
            </>
        );
    }

    return (
        <AssignPreloadPanel
            dataModel={model}
            direction="inbound"
            bulkUpdate={{ mutation: 'updatePurchaseOrders', inputType: 'UpdatePurchaseOrderInput' }}
            itemRoutes={itemRoutes}
            title={t('common:assign-purchase-orders-to-load')}
        />
    );
};

PurchaseOrdersPreAssignedLoadPage.layout = MainLayout;

export default PurchaseOrdersPreAssignedLoadPage;
