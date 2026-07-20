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

import { CustomerOrderModelV2 as model } from '@helpers';
import { getOutboundOrderTypeCodes } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import AssignPreloadPanel from 'modules/Preload/AssignPreloadPanel';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const OrdersPreAssignedLoadPage: PageComponent = () => {
    const { t } = useTranslation();
    const { configs } = useAppState();
    return (
        <AssignPreloadPanel
            dataModel={model}
            direction="outbound"
            carrierFilterField="carrierShippingMode_CarrierId"
            bulkUpdate={{ mutation: 'updateOrders', inputType: 'UpdateOrderInput' }}
            itemRoutes={itemRoutes}
            title={t('common:assign-orders-to-load')}
            // an outbound load only accepts sales orders (Customer / Selling types)
            extraEntityFilters={[
                {
                    filter: [
                        {
                            searchType: 'EQUAL',
                            field: { orderType: getOutboundOrderTypeCodes(configs) }
                        }
                    ]
                }
            ]}
        />
    );
};

OrdersPreAssignedLoadPage.layout = MainLayout;

export default OrdersPreAssignedLoadPage;
