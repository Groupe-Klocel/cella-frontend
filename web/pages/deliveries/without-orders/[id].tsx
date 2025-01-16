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
import { DeliveryModelV2 as model } from 'models/DeliveryModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import {
    META_DEFAULTS,
    getModesFromPermissions,
    showError,
    showSuccess,
    useDeliveryLineIds
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { Button, Modal, Space } from 'antd';
import {
    CancelDeliveryMutation,
    CancelDeliveryMutationVariables,
    ModeEnum,
    useCancelDeliveryMutation
} from 'generated/graphql';
import { DeliveryDetailsExtra } from 'modules/Deliveries/Elements/DeliveryDetailsExtra';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';

type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const [, setShippingAddress] = useState<any>();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const { graphqlRequestClient } = useAuth();

    // #region to customize information
    const rootPath =
        (itemRoutes[itemRoutes.length - 1] as { path: string }).path + '/without-orders';

    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${t('common:deliveries-without-orders')}`,
            path: `${rootPath}`
        },
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:delivery-without-orders')} ${data?.name}`;

    // confirm and execute delivery creation function
    const [isCreateOrderLoading, setIsCreateOrderLoading] = useState(false);
    const createOrder = (deliveryIds: [string]) => {
        Modal.confirm({
            title: t('messages:create-order-confirm'),
            onOk: async () => {
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
                    functionName: 'K_deliveryOrder',
                    event: {
                        deliveryIds
                    }
                };

                try {
                    const orderCreatedResult = await graphqlRequestClient.request(query, variables);
                    if (orderCreatedResult.executeFunction.status === 'ERROR') {
                        showError(orderCreatedResult.executeFunction.output);
                    } else if (
                        orderCreatedResult.executeFunction.status === 'OK' &&
                        orderCreatedResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${orderCreatedResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            orderCreatedResult.executeFunction.output.output
                        );
                    } else {
                        showSuccess(t('messages:success-order-creation'));
                    }
                    setIsCreateOrderLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCreateOrderLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const confirmAction = (id: string | undefined, setId: any) => {
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

    const deliveryLines = useDeliveryLineIds({ deliveryId: `${data?.id}%` }, 1, 100, null);

    // CANCEL DELIVERY
    const { mutate: cancelDeliveryMutate, isPending: cancelLoading } =
        useCancelDeliveryMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: CancelDeliveryMutation,
                _variables: CancelDeliveryMutationVariables,
                _context: any
            ) => {
                if (data.softDeleteDelivery) {
                    showSuccess(t('messages:success-canceled'));
                    router.reload();
                } else {
                    showError(t('messages:error-canceling-data'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-canceling-data'));
            }
        });

    const cancelDelivery = ({ id }: CancelDeliveryMutationVariables) => {
        Modal.confirm({
            title: t('messages:cancel-confirm'),
            onOk: () => {
                cancelDeliveryMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // function that will retrieve order deliveryAddress for given deliveryId
    const getOrderDeliveryAddress = async (deliveryId: String[]) => {
        const query = gql`
            query getDeliveryAddress($filters: DeliveryAddressSearchFilters) {
                deliveryAddresses(filters: $filters) {
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
            filters: { deliveryId, category: configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE }
        };
        const deliveryOrderAddress = await graphqlRequestClient.request(query, variables);
        return deliveryOrderAddress;
    };

    const [isInvoiceAddressExist, setIsInvoiceAddressExist] = useState(false);

    useEffect(() => {
        const fetchOrderAddress = async () => {
            // Fetch order addresses
            const result = await getOrderDeliveryAddress(data?.id);
            let isInvoiceAddressExist = false;
            if (result) {
                const deliveryAddresses = result.deliveryAddresses.results;
                if (deliveryAddresses.length != 0) {
                    isInvoiceAddressExist = true;
                }
                setIsInvoiceAddressExist(isInvoiceAddressExist);
            }
        };
        fetchOrderAddress();
    }, [data]);

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== configs.DELIVERY_STATUS_CANCELED ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.extraStatus1 < parameters.DELIVERY_EXTRA_STATUS1_ORDERED ? (
                        <Button
                            type="primary"
                            loading={isCreateOrderLoading}
                            onClick={() => {
                                createOrder([data.id]);
                            }}
                            disabled={!isInvoiceAddressExist}
                        >
                            {t('actions:create-order')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <></>
            )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <DeliveryDetailsExtra
                        deliveryId={id}
                        deliveryName={data?.name}
                        deliveryStatus={data?.status}
                        stockOwnerName={data?.stockOwner_name}
                        stockOwnerId={data?.stockOwnerId}
                        setShippingAddress={setShippingAddress}
                    />
                }
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

DeliveryPage.layout = MainLayout;

export default DeliveryPage;
