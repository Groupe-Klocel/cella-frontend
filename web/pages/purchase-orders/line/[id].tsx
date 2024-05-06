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
import { PurchaseOrderLineModelV2 as model } from 'models/PurchaseOrderLineModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, useUpdate } from '@helpers';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { PurchaseOrderLineDetailsExtra } from 'modules/PurchaseOrders/Elements/PurchaseOrderLineDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const PurchaseOrderLinePage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id, poId, type } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();

    // #region to customize information
    const parentBreadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.purchaseOrder_name}`,
            path: `${itemRoutes[itemRoutes.length - 1].path}/${data?.purchaseOrderId}`
        }
    ];

    const breadCrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.lineNumber}`
        }
    ];

    const pageTitle = `${t('common:purchase-order-line')} ${data?.purchaseOrder_name} #${
        data?.lineNumber
    }`;
    // #endregions

    console.log('DLA-data', data);

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (info: any | undefined, setInfo: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath + '/' + data?.purchaseOrderId,
        actionsComponent:
            data?.status !== configs.PURCHASE_ORDER_LINE_STATUS_CLOSED ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    parseInt(type as string, 10) !== configs.PURCHASE_ORDER_TYPE_L3 &&
                    parseInt(type as string, 10) !== configs.PURCHASE_ORDER_TYPE_L3_RETURN ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/line/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isSoftDeletable &&
                    data?.status < configs.PURCHASE_ORDER_LINE_STATUS_CLOSED ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable)()}
                            type="primary"
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isDeletable &&
                    parseInt(type as string, 10) !== configs.PURCHASE_ORDER_TYPE_L3 &&
                    parseInt(type as string, 10) !== configs.PURCHASE_ORDER_TYPE_L3_RETURN &&
                    data?.receivedQuantity <= 0 &&
                    data?.reservedQuantity <= 0 &&
                    data?.status <= configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS ? (
                        <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : modes.length > 0 &&
              modes.includes(ModeEnum.Update) &&
              model.isSoftDeletable &&
              data.purchaseOrder_status !== configs.PURCHASE_ORDER_STATUS_CLOSED ? (
                <Button
                    onClick={() =>
                        confirmAction(
                            { id, status: configs.PURCHASE_ORDER_LINE_STATUS_IN_PROGRESS },
                            setReopenInfo
                        )()
                    }
                    type="primary"
                >
                    {t('actions:reopen')}
                </Button>
            ) : (
                <></>
            )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
                extraDataComponent={
                    <PurchaseOrderLineDetailsExtra purchaseOrderLineId={id} type={type} />
                }
            />
        </>
    );
};

PurchaseOrderLinePage.layout = MainLayout;

export default PurchaseOrderLinePage;
