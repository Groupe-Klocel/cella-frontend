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
import { LinkButton } from '@components';
import { LoadExtrasListComponent } from './LoadExtrasListComponent';
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider } from 'antd';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponentV2';
import { DocumentAttachedListComponent } from 'components/common/DocumentAttachedListComponent';
import {
    HandlingUnitOutboundModelV2,
    DeliveryModelV2,
    CustomerOrderModelV2,
    PurchaseOrderModelV2,
    LoadExtrasModelV2
} from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';
import { useState } from 'react';
import { getModesFromPermissions, classifyLoadType, isPreloadLinkEnabled } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { PreAssignedEntitySection } from './PreAssignedEntitySection';

export interface IItemDetailsProps {
    loadId?: string | any;
    loadData?: any;
    loadName?: string | any;
    setDocumentAttachmentsData?: any;
    isExtrasDisplayed?: boolean | any;
}
const LoadDetailsExtra = ({
    loadId,
    loadData,
    loadName,
    setDocumentAttachmentsData,
    isExtrasDisplayed
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions, configs: dbConfigs } = useAppState();
    const loadModes = getModesFromPermissions(permissions, LoadExtrasModelV2.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    //veriffy if load is not dispatched to show or not the assign delivery button
    const canModifyLoad = loadData?.status < configs.LOAD_STATUS_DISPATCHED;
    // an inbound load links to purchase orders / buying orders; an outbound load to
    // deliveries / sales orders. Left undefined when the type can't be classified (load type
    // absent from DB configs) so no pre-assignment section is shown rather than a wrong one.
    const direction = classifyLoadType(loadData?.type, dbConfigs);
    // DB configs (scope "load") gate which entity types can be pre-assigned to this load
    const preloadDeliveries = isPreloadLinkEnabled(dbConfigs, 'deliveries');
    const preloadOrders = isPreloadLinkEnabled(dbConfigs, 'orders');
    const preloadPurchaseOrders = isPreloadLinkEnabled(dbConfigs, 'purchase_orders');

    // header RELATED to Boxes
    const loadBoxesHeaderData: HeaderData = {
        title: `${t('common:associatedLoadsBoxes')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            {loadModes.length > 0 && loadModes.includes(ModeEnum.Read) && isExtrasDisplayed ? (
                <>
                    <LoadExtrasListComponent
                        searchCriteria={{ id: loadId }}
                        loadId={loadId}
                        loadName={loadName}
                        dataModel={LoadExtrasModelV2}
                        canModify={canModifyLoad}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        searchable={false}
                        refresh={true}
                    />
                </>
            ) : (
                <></>
            )}
            <Divider />
            <ListComponent
                searchCriteria={{ objectId: loadId }}
                dataModel={StatusHistoryDetailExtraModelV2}
                headerData={statusHistoryHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ loadId: loadId }}
                dataModel={HandlingUnitOutboundModelV2}
                headerData={loadBoxesHeaderData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams('/boxes/[id]', record.id)}
                            />
                        )
                    }
                ]}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
            />
            <Divider />
            <DocumentAttachedListComponent
                objectId={loadId}
                objectName="Load"
                objectData={loadData}
                canModify={canModifyLoad}
                setData={setDocumentAttachmentsData}
            />
            {direction === 'outbound' && (
                <>
                    {preloadDeliveries && (
                        <>
                            <Divider />
                            <PreAssignedEntitySection
                                dataModel={DeliveryModelV2}
                                loadId={loadId}
                                loadName={loadData?.name}
                                canModify={canModifyLoad}
                                title={`${t('common:deliveries-pre-assigned')}`}
                                assignTitle={t('actions:assign-deliveries')}
                                assignPath="/deliveries/pre-assigned-load"
                                detailRoute="/deliveries/[id]"
                                removeMutation={{
                                    mutation: 'updateDelivery',
                                    inputType: 'UpdateDeliveryInput'
                                }}
                            />
                        </>
                    )}
                    {preloadOrders && (
                        <>
                            <Divider />
                            <PreAssignedEntitySection
                                dataModel={CustomerOrderModelV2}
                                loadId={loadId}
                                loadName={loadData?.name}
                                canModify={canModifyLoad}
                                title={`${t('common:orders-pre-assigned')}`}
                                assignTitle={t('actions:assign-orders')}
                                assignPath="/customer-orders/pre-assigned-load"
                                detailRoute="/customer-orders/[id]"
                                removeMutation={{
                                    mutation: 'updateOrder',
                                    inputType: 'UpdateOrderInput'
                                }}
                            />
                        </>
                    )}
                </>
            )}
            {direction === 'inbound' && preloadPurchaseOrders && (
                <>
                    <Divider />
                    <PreAssignedEntitySection
                        dataModel={PurchaseOrderModelV2}
                        loadId={loadId}
                        loadName={loadData?.name}
                        canModify={canModifyLoad}
                        title={`${t('common:purchase-orders-pre-assigned')}`}
                        assignTitle={t('actions:assign-purchase-orders')}
                        assignPath="/purchase-orders/pre-assigned-load"
                        detailRoute="/purchase-orders/[id]"
                        removeMutation={{
                            mutation: 'updatePurchaseOrder',
                            inputType: 'UpdatePurchaseOrderInput'
                        }}
                    />
                </>
            )}
        </>
    );
};

export { LoadDetailsExtra };
