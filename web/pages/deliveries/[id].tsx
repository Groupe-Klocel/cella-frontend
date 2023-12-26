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
import { DeliveryModelV2 as model } from 'models/DeliveryModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import {
    META_DEFAULTS,
    getModesFromPermissions,
    showError,
    showSuccess,
    useDeliveryLineIds
} from '@helpers';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { Button, Modal, Space } from 'antd';
import {
    CancelDeliveryMutation,
    CancelDeliveryMutationVariables,
    ModeEnum,
    useCancelDeliveryMutation
} from 'generated/graphql';
import configs from '../../../common/configs.json';
import { DeliveryDetailsExtra } from 'modules/Deliveries/Elements/DeliveryDetailsExtra';
import moment from 'moment';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const [shippingAddress, setShippingAddress] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const { graphqlRequestClient } = useAuth();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:delivery')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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
    const { mutate: cancelDeliveryMutate, isLoading: cancelLoading } =
        useCancelDeliveryMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: CancelDeliveryMutation,
                _variables: CancelDeliveryMutationVariables,
                _context: any
            ) => {
                if (!cancelLoading) {
                    if (data.softDeleteDelivery) {
                        showSuccess(t('messages:success-canceled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-canceling-data'));
                    }
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

    // CUBING
    const [isCubingLoading, setIsCubingLoading] = useState(false);
    const cubingDelivery = (deliveryId: string) => {
        Modal.confirm({
            title: t('messages:cubing-confirm'),
            onOk: async () => {
                setIsCubingLoading(true);
                const deliveries: Array<any> = [];
                deliveries.push({ id: deliveryId });

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'K_customCubing',
                    event: {
                        deliveries: deliveries
                    }
                };

                try {
                    const cubingResult = await graphqlRequestClient.request(query, variables);
                    if (cubingResult.executeFunction.status === 'ERROR') {
                        showError(cubingResult.executeFunction.output);
                    } else if (
                        cubingResult.executeFunction.status === 'OK' &&
                        cubingResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${cubingResult.executeFunction.output.output.code}`));
                        console.log('Backend_message', cubingResult.executeFunction.output.output);
                    } else {
                        showSuccess(t('messages:success-cubing'));
                        router.reload();
                    }
                    setIsCubingLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCubingLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // START
    const startDelivery = (deliveryId: string, status: Number) => {
        Modal.confirm({
            title: t('messages:start-confirm'),
            onOk: async () => {
                const deliveries: Array<any> = [];
                deliveries.push({ id: deliveryId, status: status });

                const res = await fetch(`/api/preparation/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        deliveries: deliveries
                    })
                });

                const response = await res.json();

                if (res.ok) {
                    // start success
                    showSuccess(t('messages:success-start'));
                    router.reload();
                } else {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:error-start'));
                    }
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const associateToRound = ({ id }: CancelDeliveryMutationVariables) => {
        Modal.confirm({
            title: t('messages:round-association-confirm'),
            onOk: () => {
                // TODO:  CALL MUTATE HERE
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== configs.DELIVERY_STATUS_CANCELED ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status < configs.DELIVERY_STATUS_DISPATCHED ? (
                        <Space>
                            {
                                // CUBING button
                                data?.status <= configs.DELIVERY_STATUS_TO_BE_ESTIMATED &&
                                deliveryLines?.data?.deliveryLines &&
                                deliveryLines?.data?.deliveryLines?.count > 0 ? (
                                    <Button
                                        loading={isCubingLoading}
                                        onClick={() => cubingDelivery(data?.id)}
                                    >
                                        {t('actions:cubing')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                            {
                                // RECUBING button only if TO_BE_ESTIMATED < status <= ESTIMATED
                                data?.status > configs.DELIVERY_STATUS_TO_BE_ESTIMATED &&
                                data?.status <= configs.DELIVERY_STATUS_ESTIMATED &&
                                deliveryLines?.data?.deliveryLines &&
                                deliveryLines?.data?.deliveryLines?.count > 0 ? (
                                    <Button onClick={() => cubingDelivery(data?.id)}>
                                        {t('actions:recubing')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                            {
                                // Start button
                                data?.status ==
                                /*configs.DELIVERY_STATUS_ESTIMATED - de-activation for Findit*/ -99999 ? (
                                    <Button onClick={() => startDelivery(data?.id, data?.status)}>
                                        {t('actions:start')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                            {
                                // ASSOCIATE TO ROUND button
                                // IKI 20230403 : intentionally disabled for demo
                                // props.status == configs.DELIVERY_STATUS_ESTIMATED ? (
                                //     <Button
                                //         loading={cancelLoading}
                                //         onClick={() => associateToRound({ deliveryId: props.id })}
                                //     >
                                //         {t('actions:associateToRound')}
                                //     </Button>
                                // ) : (
                                //     <></>
                                // )
                            }
                            {/* EDIT button */}
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/deliveries/edit/${data?.id}`}
                                type="primary"
                            />
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Read) &&
                            data?.status <= configs.DELIVERY_STATUS_CANCELED ? (
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        if (shippingAddress) {
                                            setShowSinglePrintModal(true);
                                            setIdToPrint(shippingAddress.id);
                                        } else {
                                            showError(t('messages:no-delivery-address'));
                                        }
                                    }}
                                >
                                    {t('actions:print')}
                                </Button>
                            ) : (
                                <></>
                            )}
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Delete) &&
                            model.isSoftDeletable ? (
                                data?.status < configs.DELIVERY_STATUS_PREPARED ? (
                                    <Button
                                        onClick={() =>
                                            confirmAction(id as string, setIdToDisable)()
                                        }
                                        type="primary"
                                    >
                                        {t('actions:cancel')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            ) : (
                                <></>
                            )}
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Delete) &&
                            model.isDeletable ? (
                                <Button
                                    onClick={() => confirmAction(id as string, setIdToDelete)()}
                                >
                                    {t('actions:delete')}
                                </Button>
                            ) : (
                                <></>
                            )}
                        </Space>
                    ) : (
                        <>
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Read) &&
                            data?.status >= configs.DELIVERY_STATUS_STARTED &&
                            data?.status <= configs.DELIVERY_STATUS_DISPATCHED ? (
                                <>
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            if (shippingAddress) {
                                                setShowSinglePrintModal(true);
                                                setIdToPrint(shippingAddress.id);
                                            } else {
                                                showError(t('messages:no-delivery-address'));
                                            }
                                        }}
                                    >
                                        {t('actions:print')}
                                    </Button>
                                </>
                            ) : (
                                <></>
                            )}
                        </>
                    )}
                    <SinglePrintModal
                        showModal={{
                            showSinglePrintModal,
                            setShowSinglePrintModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        documentName="K_Delivery"
                        documentReference={data?.name}
                    />
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
