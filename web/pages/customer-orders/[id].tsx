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
import { META_DEFAULTS, getModesFromPermissions, showError } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { CustomerOrderModelV2 as model } from 'models/CustomerOrderModelV2';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { CustomerOrderDetailsExtra } from 'modules/CustomerOrders/Elements/CustomerOrderDetailsExtra';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../common/configs.json';
import { PaymentModal } from 'modules/CustomerOrders/Modals/PaymentModal';

type PageComponent = FC & { layout: typeof MainLayout };

const CustomerOrderPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const { id } = router.query;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [documentToPrint, setDocumentToPrint] = useState<string>();
    const [invoiceAddress, setInvoiceAddress] = useState<any>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:customer-order')} ${data?.name}`;
    // #endregions

    //#region : Specific functions for this page
    function getNextStatus(status: number) {
        switch (status) {
            case configs.ORDER_STATUS_CREATED:
                return configs.ORDER_STATUS_QUOTE_TRANSMITTED;
            case configs.ORDER_STATUS_QUOTE_TRANSMITTED:
                return configs.ORDER_STATUS_TO_INVOICE;
            case configs.ORDER_STATUS_TO_BE_DELIVERED:
                return configs.ORDER_STATUS_DELIVERY_IN_PROGRESS;
            default:
                return configs.ORDER_STATUS_CREATED;
        }
    }

    const switchNextStatus = async (id: string, currentStatus: number, nextStatus?: number) => {
        const newStatus = nextStatus ?? getNextStatus(currentStatus);
        const updateVariables = {
            id: id,
            input: {
                status: newStatus
            }
        };

        const updateMutation = gql`
            mutation updateOrder($id: String!, $input: UpdateOrderInput!) {
                updateOrder(id: $id, input: $input) {
                    id
                    name
                    status
                }
            }
        `;

        const result = await graphqlRequestClient.request(updateMutation, updateVariables);
        if (result) {
            setTriggerRefresh(!triggerRefresh);
        }
        return result;
    };

    const buttonName = (() => {
        switch (data?.status) {
            case configs.ORDER_STATUS_CREATED:
                return 'confirm-quote';
            case configs.ORDER_STATUS_QUOTE_TRANSMITTED:
                return 'confirm-order';
            case configs.ORDER_STATUS_TO_INVOICE:
                return 'confirm-payment';
            case configs.ORDER_STATUS_TO_BE_DELIVERED:
                return 'confirm-delivery';
            default:
                return 'to-be-defined';
        }
    })();
    //#endregion

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status < configs.ORDER_STATUS_TO_INVOICE ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status != configs.ORDER_STATUS_TO_INVOICE &&
                data?.status < configs.ORDER_STATUS_DELIVERY_IN_PROGRESS ? (
                    <Button
                        onClick={() => switchNextStatus(data.id, data.status)}
                        style={{ color: 'green' }}
                    >
                        {t(`actions:${buttonName}`)}
                    </Button>
                ) : modes.length > 0 &&
                  modes.includes(ModeEnum.Update) &&
                  model.isEditable &&
                  data?.status == configs.ORDER_STATUS_TO_INVOICE ? (
                    <Button
                        onClick={() => {
                            setShowPaymentModal(true);
                            // setOrderId(data?.id);
                        }}
                        style={{ color: 'orange' }}
                    >
                        {t(`actions:enter-payment`)}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                    <>
                        <Button
                            type="primary"
                            onClick={() => {
                                if (invoiceAddress) {
                                    setShowSinglePrintModal(true);
                                    setIdToPrint(invoiceAddress.id);
                                    setDocumentToPrint('CGP_Quote');
                                } else {
                                    showError(t('messages:no-invoice-address'));
                                }
                            }}
                        >
                            {t('actions:print-quote')}
                        </Button>
                    </>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Read) &&
                data?.status >= configs.ORDER_STATUS_TO_INVOICE ? (
                    <>
                        <Button
                            type="primary"
                            onClick={() => {
                                if (invoiceAddress) {
                                    setShowSinglePrintModal(true);
                                    setIdToPrint(invoiceAddress.id);
                                    setDocumentToPrint('CGP_Invoice');
                                } else {
                                    showError(t('messages:no-invoice-address'));
                                }
                            }}
                        >
                            {t('actions:print-invoice')}
                        </Button>
                    </>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status >= configs.ORDER_STATUS_TO_INVOICE &&
                data?.status < configs.ORDER_STATUS_DELIVERY_IN_PROGRESS ? (
                    <Button
                        onClick={() =>
                            switchNextStatus(
                                data.id,
                                data.status,
                                configs.ORDER_STATUS_CREDIT_TO_BE_ISSUED
                            )
                        }
                        style={{ background: 'orange', fontStyle: 'italic' }}
                    >
                        {t(`actions:generate-credit`)}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status > configs.ORDER_STATUS_CREATED &&
                data?.status < configs.ORDER_STATUS_TO_INVOICE ? (
                    <Button onClick={() => confirmAction(data.id, setIdToDelete, 'disable')()}>
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status <= configs.ORDER_STATUS_CREATED ? (
                    <Button onClick={() => confirmAction(data.id, setIdToDelete, 'delete')()}>
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
                    dataToPrint={{ id: idToPrint }}
                    documentName={documentToPrint!}
                    documentReference={data?.name}
                    customLanguage={data?.printLanguage ?? undefined}
                />
            </Space>
        )
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <CustomerOrderDetailsExtra
                        orderId={id}
                        orderName={data?.name}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                        thirdPartyId={data?.thirdPartyId}
                        priceType={data?.priceType}
                        status={data?.status}
                        setInvoiceAddress={setInvoiceAddress}
                    />
                }
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                refetch={triggerRefresh}
            />
            <PaymentModal
                showModal={{
                    showPaymentModal,
                    setShowPaymentModal
                }}
                orderId={id as string}
            />
        </>
    );
};

CustomerOrderPage.layout = MainLayout;

export default CustomerOrderPage;