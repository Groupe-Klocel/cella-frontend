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
import { LinkButton, AppHead } from '@components';
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, META_DEFAULTS } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { PurchaseOrderLineFeatureModelV2 as model } from 'models/PurchaseOrderLineFeatureModelV2';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';

export interface IItemDetailsProps {
    purchaseOrderLineId?: string | any;
    type?: number | any;
}

const PurchaseOrderLineDetailsExtra = ({ purchaseOrderLineId, type }: IItemDetailsProps) => {
    const { t } = useTranslation();
    let rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    rootPath += '/feature';
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PurchaseOrderLine);

    const headerData: HeaderData = {
        title: t('common:purchase-order-line-features'),
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            <Divider />
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                searchCriteria={{ purchaseOrderLineId: purchaseOrderLineId }}
                dataModel={model}
                headerData={headerData}
                searchable={true}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={'/purchase-orders/feature/:id'}
            />
            <Divider />
        </>
    );
};

export { PurchaseOrderLineDetailsExtra };
