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
import {
    META_DEFAULTS,
    getModesFromPermissions,
    getOrderDirection,
    isAppointmentLinkEnabled,
    isPreloadLinkEnabled,
    showError,
    showSuccess
} from '@helpers';
import AssignLoadModal from 'modules/Preload/AssignLoadModal';
import AssignToAppointmentModal from 'modules/Appointments/AssignToAppointmentModal';
import { AppointmentLinesSection } from 'modules/Appointments/AppointmentLinesSection';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { CustomerOrderModelV2 as model } from '@helpers';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { CustomerOrderDetailsExtra } from 'modules/CustomerOrders/Elements/CustomerOrderDetailsExtra';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../common/configs.json';
import parameters from '../../../common/parameters.json';
import { PaymentModal } from 'modules/CustomerOrders/Modals/PaymentModal';

type PageComponent = FC & { layout: typeof MainLayout };

const CustomerOrderPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, configs: dbConfigs } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const [dataPayment, setDataPayment] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    // [id] is a single dynamic segment; normalize defensively (Next can type it as string[])
    const id = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    // order ↔ appointment gate + carrier (via the shipping mode; order has no direct carrierId)
    const apptLinkEnabled = isAppointmentLinkEnabled(dbConfigs, 'orders');
    const preloadLinkEnabled = isPreloadLinkEnabled(dbConfigs, 'orders');
    const orderCarrierId = data?.carrierShippingMode_carrierId;
    const deAssignLoad = () => {
        Modal.confirm({
            title: t('messages:remove-assignment-confirm'),
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel'),
            onOk: async () => {
                if (!id) {
                    showError(t('messages:error-removing-assignment'));
                    return;
                }
                try {
                    await graphqlRequestClient.request(
                        gql`
                            mutation u($id: String!, $input: UpdateOrderInput!) {
                                updateOrder(id: $id, input: $input) {
                                    id
                                    preAssignedLoadId
                                }
                            }
                        `,
                        { id, input: { preAssignedLoadId: null } }
                    );
                    showSuccess(t('messages:success-removed-assignment'));
                    setTriggerRefresh((p) => !p);
                } catch (e) {
                    console.error('Error removing load assignment:', e);
                    showError(t('messages:error-removing-assignment'));
                }
            }
        });
    };
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [assignLoadOpen, setAssignLoadOpen] = useState(false);
    const [assignApptOpen, setAssignApptOpen] = useState(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [documentToPrint, setDocumentToPrint] = useState<string>();
    const [invoiceAddress, setInvoiceAddress] = useState<any>();
    const [refetchPaymentLine, setRefetchPaymentLine] = useState<boolean>(false);

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
            default:
                return 'to-be-defined';
        }
    })();

    // function that will retrieve delivery orderAddress for given orderId
    const getDeliveryOrderAddress = async (orderId: String[]) => {
        const query = gql`
            query getOrderAddress($filters: OrderAddressSearchFilters) {
                orderAddresses(filters: $filters) {
                    results {
                        entityCode
                        entityName
                        entityAddress1
                        entityAddress2
                        entityAddress3
                        entityStreetNumber
                        entityPostCode
                        entityCity
                        entityState
                        entityDistrict
                        entityCountry
                        entityCountryCode
                        thirdPartyAddressId
                    }
                }
            }
        `;
        const variables = {
            filters: { orderId, category: configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY }
        };
        const deliveryOrderAddress = await graphqlRequestClient.request(query, variables);
        return deliveryOrderAddress;
    };
    const [isDeliveryAddressExist, setIsDeliveryAddressExist] = useState(false);

    useEffect(() => {
        const fetchDeliveryAddress = async () => {
            // Fetch order addresses
            const result = await getDeliveryOrderAddress(data?.id);
            let isDeliveryAddressExist = false;
            if (result) {
                const orderAddresses = result.orderAddresses.results;
                if (orderAddresses.length != 0) {
                    isDeliveryAddressExist = true;
                }
                setIsDeliveryAddressExist(isDeliveryAddressExist);
            }
        };
        fetchDeliveryAddress();
    }, [data]);

    // confirm and execute delivery creation function
    const [isCreateDeliveryLoading, setIsCreateDeliveryLoading] = useState(false);
    const createDelivery = (orderIds: [string], isMultiple: boolean = false) => {
        Modal.confirm({
            title: t('messages:create-delivery-confirm'),
            onOk: async () => {
                setIsCreateDeliveryLoading(true);

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'order_delivery',
                    event: {
                        orderIds,
                        isMultipleDelivery: isMultiple
                    }
                };

                try {
                    const deliveryCreatedResult = await graphqlRequestClient.request(
                        query,
                        variables
                    );
                    if (deliveryCreatedResult.executeFunction.status === 'ERROR') {
                        showError(deliveryCreatedResult.executeFunction.output);
                    } else if (
                        deliveryCreatedResult.executeFunction.status === 'OK' &&
                        deliveryCreatedResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${deliveryCreatedResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            deliveryCreatedResult.executeFunction.output.output
                        );
                    } else {
                        showSuccess(t('messages:success-delivery-creation'));
                    }
                    setIsCreateDeliveryLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCreateDeliveryLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const [deliveriesToDisplay, setDeliveriesToDisplay] = useState<any[]>([]);

    //to retrieve deliveries Ids from orderLines_deliveryLine attached to current order
    const getOrderLines = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query orderLines($filters: OrderLineSearchFilters) {
                orderLines(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        deliveryLines {
                            delivery {
                                id
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            filters: {
                orderId: id
            }
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
    };

    const [isCreateOrderLoading, setIsCreateOrderLoading] = useState(false);
    const duplicateOrder = async (orderIds: [string]) => {
        setIsCreateOrderLoading(true);

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'duplicate_orders',
            event: {
                orderIds
            }
        };

        try {
            const orderDuplicatedResult = await graphqlRequestClient.request(query, variables);
            if (orderDuplicatedResult.executeFunction.status === 'ERROR') {
                showError(orderDuplicatedResult.executeFunction.output);
            } else if (
                orderDuplicatedResult.executeFunction.status === 'OK' &&
                orderDuplicatedResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${orderDuplicatedResult.executeFunction.output.output.code}`));
                console.log('Backend_message', orderDuplicatedResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-order-duplication'));
            }
            setIsCreateOrderLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsCreateOrderLoading(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getOrderLines();
            if (result) {
                const orderLines = result.orderLines.results;
                const deliveries: any[] = [];
                // Iterate through results
                orderLines.forEach((result: any) => {
                    // Iterate through delivery lines
                    result.deliveryLines.forEach((deliveryLine: any) => {
                        // Extract delivery information
                        const delivery = deliveryLine.delivery;
                        const isDuplicate = deliveries.some((d) => d.id === delivery.id);
                        if (!isDuplicate) {
                            deliveries.push(delivery.id);
                        }
                    });
                });
                setDeliveriesToDisplay(deliveries);
            }
        }
        fetchData();
    }, [id]);

    //#endregion

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const confirmAction = (
        id: string | undefined,
        setId: any,
        action: 'delete' | 'disable' | 'update'
    ) => {
        const actionTxt =
            action === 'delete' ? t('messages:delete-confirm') : t('messages:close-confirm');
        return () => {
            Modal.confirm({
                title: actionTxt,
                onOk: () => {
                    if (action === 'delete') {
                        setId(id);
                    } else if (action === 'update') {
                        closeStatus(data.id);
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const closeStatus = async (id: string) => {
        const newStatus = configs.ORDER_STATUS_CLOSED;
        const updateVariables = {
            id: id,
            input: {
                status: newStatus
            }
        };
        const updateMutationStatus = gql`
            mutation updateOrder($id: String!, $input: UpdateOrderInput!) {
                updateOrder(id: $id, input: $input) {
                    id
                    status
                }
            }
        `;
        const result = await graphqlRequestClient.request(updateMutationStatus, updateVariables);
        if (result) {
            setTriggerRefresh(!triggerRefresh);
        }
        return result;
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
                {/* ASSIGN / DE-ASSIGN LOAD — only for order types with a load direction, not finished */}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                getOrderDirection(data?.orderType, dbConfigs) &&
                data?.status !== configs.ORDER_STATUS_CLOSED &&
                data?.status !== configs.ORDER_STATUS_CANCELED ? (
                    data?.preAssignedLoadId ? (
                        <Button danger onClick={deAssignLoad}>
                            {t('actions:deassign-load')}
                        </Button>
                    ) : preloadLinkEnabled ? (
                        <Button onClick={() => setAssignLoadOpen(true)}>
                            {t('actions:assign-to-load')}
                        </Button>
                    ) : (
                        <></>
                    )
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                apptLinkEnabled &&
                getOrderDirection(data?.orderType, dbConfigs) &&
                data?.status !== configs.ORDER_STATUS_CLOSED &&
                data?.status !== configs.ORDER_STATUS_CANCELED ? (
                    <Button onClick={() => setAssignApptOpen(true)}>
                        {t('actions:assign-to-appointment')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Read) &&
                data?.status < configs.ORDER_STATUS_CLOSED ? (
                    <Button
                        type="primary"
                        loading={isCreateOrderLoading}
                        onClick={() => duplicateOrder([data.id])}
                    >
                        {t(`actions:duplicate-order`, {
                            number: 1
                        })}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status < configs.ORDER_STATUS_TO_INVOICE ? (
                    <Button
                        onClick={() => switchNextStatus(data.id, data.status)}
                        style={{ color: 'green' }}
                    >
                        {t(`actions:${buttonName}`)}
                    </Button>
                ) : modes.length > 0 &&
                  modes.includes(ModeEnum.Update) &&
                  model.isEditable &&
                  data?.status >= configs.ORDER_STATUS_TO_INVOICE &&
                  data?.extraStatus1 !== parameters.ORDER_EXTRA_STATUS1_PAID ? (
                    <Button
                        onClick={() => {
                            setShowPaymentModal(true);
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
                                    setDocumentToPrint('K_Quote');
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
                                    setDocumentToPrint('K_Invoice');
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
                data?.status >= configs.ORDER_STATUS_TO_INVOICE ? (
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
                modes.includes(ModeEnum.Update) &&
                data?.extraStatus2 < parameters.ORDER_EXTRA_STATUS2_DELIVERED ? (
                    <Button
                        type="primary"
                        loading={isCreateDeliveryLoading}
                        onClick={() => {
                            createDelivery([data.id]);
                        }}
                        disabled={!isDeliveryAddressExist}
                    >
                        {t('actions:create-delivery')}
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
                {/* {modes.length > 0 && data?.status === configs.ORDER_STATUS_TO_INVOICE ? ( */}
                <Button onClick={() => confirmAction(data.id, setData, 'update')()}>
                    {t('actions:close')}
                </Button>
                {/* ) : (
                    <></>
                )} */}
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
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <>
                        <CustomerOrderDetailsExtra
                            orderId={id}
                            orderName={data?.name}
                            stockOwnerId={data?.stockOwnerId}
                            stockOwnerName={data?.stockOwner_name}
                            thirdPartyId={data?.thirdPartyId}
                            priceType={data?.priceType}
                            status={data?.status}
                            fixedPrice={data?.fixedPrice}
                            setInvoiceAddress={setInvoiceAddress}
                            refetchPaymentLine={refetchPaymentLine}
                        />
                        {apptLinkEnabled && id && (
                            <AppointmentLinesSection
                                fkField="orderId"
                                entityId={id as string}
                                canModify={modes.includes(ModeEnum.Update)}
                            />
                        )}
                    </>
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
                setRefetch={setRefetchPaymentLine}
                orderId={id as string}
            />
            <AssignLoadModal
                open={assignLoadOpen}
                onClose={() => setAssignLoadOpen(false)}
                entityIds={id ? [id as string] : []}
                direction={getOrderDirection(data?.orderType, dbConfigs) ?? 'outbound'}
                carrierId={orderCarrierId}
                update={{ mutation: 'updateOrders', inputType: 'UpdateOrderInput' }}
                onDone={() => setTriggerRefresh((prev) => !prev)}
            />
            <AssignToAppointmentModal
                open={assignApptOpen}
                onClose={() => setAssignApptOpen(false)}
                entityIds={id ? [id as string] : []}
                fkField="orderId"
                direction={getOrderDirection(data?.orderType, dbConfigs) ?? 'outbound'}
                carrierId={orderCarrierId}
                onDone={() => setTriggerRefresh((prev) => !prev)}
            />
        </>
    );
};

CustomerOrderPage.layout = MainLayout;

export default CustomerOrderPage;
