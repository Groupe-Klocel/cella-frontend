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
import { AppHead, LinkButton, SinglePrintModal } from '@components';
import { PurchaseOrderModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { PurchaseOrderDetailsExtra } from 'modules/PurchaseOrders/Elements/PurchaseOrderDetailsExtra';
import moment from 'moment';

type PageComponent = FC & { layout: typeof MainLayout };

const PurchaseOrderPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [refetchSubList, setRefetchSubList] = useState(false);
    const [documentToPrint, setDocumentToPrint] = useState<string>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`,
            path: `/purchase-orders/${data?.purchaseOrderId}`
        }
    ];

    const pageTitle = `${t('common:purchase-order')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                    //to replace
                    // router.reload();
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    // PRINT
    const local = moment();
    local.locale();
    const dateLocal = local.format('l') + ', ' + local.format('LT');

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status != configs.PURCHASE_ORDER_STATUS_CLOSED &&
                model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}

                {modes.includes(ModeEnum.Read) &&
                data?.status != configs.PURCHASE_ORDER_STATUS_CLOSED ? (
                    <Button
                        type="primary"
                        onClick={() => {
                            setShowSinglePrintModal(true);
                            setIdToPrint(data.id);
                            setDocumentToPrint('K_OrderForm');
                        }}
                    >
                        {t('actions:print-order-form')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.includes(ModeEnum.Read) ? (
                    <Button
                        type="primary"
                        onClick={() => {
                            setShowSinglePrintModal(true);
                            setIdToPrint(data.id);
                            setDocumentToPrint('K_PurchaseOrder');
                        }}
                    >
                        {t('actions:print-receipt')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                data?.status < configs.PURCHASE_ORDER_STATUS_CLOSED &&
                !data?.purchaseOrderLines ? (
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
                data?.type !== configs.PURCHASE_ORDER_TYPE_L3 &&
                data?.type !== configs.PURCHASE_ORDER_TYPE_L3_RETURN &&
                // WARNING : if purchaseOrderLines exists, it means that there is no po line
                data?.purchaseOrderLines ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                <SinglePrintModal
                    showModal={{
                        showSinglePrintModal,
                        setShowSinglePrintModal
                    }}
                    dataToPrint={{ id: idToPrint, date: dateLocal }}
                    documentName={documentToPrint!}
                    documentReference={data?.name}
                />
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                extraDataComponent={
                    <PurchaseOrderDetailsExtra
                        purchaseOrderId={id!}
                        type={data?.type}
                        purchaseOrderName={data?.name}
                        stockOwnerName={data?.stockOwner_name}
                        stockOwnerId={data?.stockOwnerId}
                        status={data?.status}
                        refetchSubList={refetchSubList}
                    />
                }
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetchSubList={{ refetchSubList, setRefetchSubList }}
            />
        </>
    );
};

PurchaseOrderPage.layout = MainLayout;

export default PurchaseOrderPage;
