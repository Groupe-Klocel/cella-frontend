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

import { AppHead, LinkButton, SinglePrintDocumentSetModal, SinglePrintModal } from '@components';
import { findCodeByScopeAndValue, DeliveryModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions, showError, showSuccess, useDeliveryLineIds } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { Button, Modal, Space } from 'antd';
import { CancelDeliveryMutationVariables, ModeEnum } from 'generated/graphql';
import { DeliveryDetailsExtra } from 'modules/Deliveries/Elements/DeliveryDetailsExtra';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { cancelHuoDeliveryStatus as statusForCancelation } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { parameters, configs } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const [shippingAddress, setShippingAddress] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [cancelInfo, setCancelInfo] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [refetchHUO, setRefetchHUO] = useState(false);
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();
    const [defaultDeliveryDocuments, setDefaultDeliveryDocuments] = useState<any>();

    useEffect(() => {
        const fetchRuleResult = async () => {
            const ruleVariables = {
                context: {
                    object_name: 'delivery',
                    stock_owner: data?.stockOwner_name ?? undefined,
                    shipping_type: data?.shippingType ?? undefined,
                    carrier: data?.carrierShippingMode_carrier_name ?? undefined,
                    delivery_po_type: data?.type ?? undefined,
                    delivery_customer_code: data?.thirdPartyCodeStr ?? undefined,
                    dangerous: data?.extras_dangereux ?? undefined
                }
            };
            const ruleQuery = gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "DOCUMENT_LIST", context: $context)
                }
            `;
            const ruleResult = await graphqlRequestClient.request(ruleQuery, ruleVariables);
            setDefaultDeliveryDocuments(ruleResult?.executeRule?.document_list?.value);
        };

        fetchRuleResult();
    }, [data]);

    const configsParamsCodes = useMemo(() => {
        const toBeEstimatedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `To be estimated`)
        );

        const estimatedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `Estimated`)
        );
        const startedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `Started`)
        );
        const toBeLoadedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `To be loaded`)
        );
        const loadedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `Loaded`)
        );

        const dispatchedDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `Dispatched`)
        );

        const canceledDeliveryStatus = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', `Canceled`)
        );

        const l3AfterSaleDeliveryType = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_po_type', `L3 After-Sales`)
        );

        return {
            startedDeliveryStatus,
            estimatedDeliveryStatus,
            toBeEstimatedDeliveryStatus,
            loadedDeliveryStatus,
            toBeLoadedDeliveryStatus,
            dispatchedDeliveryStatus,
            canceledDeliveryStatus,
            l3AfterSaleDeliveryType
        };
    }, [configs, parameters]);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:delivery')} ${data?.name}`;

    const isExtrasDisplayed = Object.keys(data || {}).some((key) => key.startsWith('extras_'))
        ? true
        : false;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmDelete = (id: string | undefined, setId: any) => {
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

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: async () => {
                    setId({ id, status: configsParamsCodes.canceledDeliveryStatus });
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const deliveryLines = useDeliveryLineIds({ deliveryId: `${data?.id}%` }, 1, 100, null);

    // CUBING
    const [isCubingLoading, setIsCubingLoading] = useState(false);
    // AUTO PREPARATION
    const [isAutoPrepareLoading, setIsAutoPrepareLoading] = useState(false);
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
                    functionName: 'custom_cubing',
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
                        setRefetchHUO((prev) => !prev);
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
            data?.status !== configsParamsCodes.canceledDeliveryStatus ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status < configsParamsCodes.dispatchedDeliveryStatus ? (
                        <Space>
                            {
                                // CUBING button
                                data?.status <= configsParamsCodes.toBeEstimatedDeliveryStatus &&
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
                                data?.status > configsParamsCodes.toBeEstimatedDeliveryStatus &&
                                data?.status <= configsParamsCodes.estimatedDeliveryStatus &&
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
                                /*configsParamsCodes.delivery_status_estimated - de-activation for Findit*/ -99999 ? (
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
                                // props.status == configsParamsCodes.delivery_status_estimated ? (
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
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Update) &&
                            model.isEditable &&
                            data?.status < configsParamsCodes.loadedDeliveryStatus ? (
                                <LinkButton
                                    title={t('actions:edit')}
                                    path={`/deliveries/edit/${data?.id}`}
                                    type="primary"
                                />
                            ) : (
                                <></>
                            )}
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Read) &&
                            data?.status <= configsParamsCodes.canceledDeliveryStatus ? (
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        if (shippingAddress) {
                                            setShowSinglePrintModal(true);
                                            setIdToPrint(data?.id);
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
                            modes.includes(ModeEnum.Update) &&
                            model.isEditable &&
                            statusForCancelation.delivery.includes(data?.status) ? (
                                <Button
                                    type="primary"
                                    danger
                                    loading={cancelInfo ? true : false}
                                    onClick={() => {
                                        confirmAction(id as string, setCancelInfo)();
                                    }}
                                >
                                    {t('actions:cancel')}
                                </Button>
                            ) : (
                                <></>
                            )}
                            {modes.length > 0 &&
                            modes.includes(ModeEnum.Delete) &&
                            model.isDeletable ? (
                                <Button
                                    onClick={() => confirmDelete(id as string, setIdToDelete)()}
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
                            data?.status >= configsParamsCodes.startedDeliveryStatus &&
                            data?.status <= configsParamsCodes.dispatchedDeliveryStatus ? (
                                <>
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            if (data?.id) {
                                                setShowSinglePrintModal(true);
                                                setIdToPrint(data.id);
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
                    <SinglePrintDocumentSetModal
                        showModal={{
                            showSinglePrintModal,
                            setShowSinglePrintModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        allDocumentName={defaultDeliveryDocuments}
                        documentReference={data?.name}
                        customLanguage={data?.printLanguage ?? undefined}
                        documentAttachmentsData={documentAttachmentsData}
                    />
                </Space>
            ) : (
                <></>
            )
    };

    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <DeliveryDetailsExtra
                        deliveryId={id}
                        deliveryName={data?.name}
                        deliveryStatus={data?.status}
                        deliveryType={data?.type}
                        stockOwnerName={data?.stockOwner_name}
                        stockOwnerId={data?.stockOwnerId}
                        setShippingAddress={setShippingAddress}
                        refetchHUO={refetchHUO}
                        setRefetchHUO={setRefetchHUO}
                        setDocumentAttachmentsData={setDocumentAttachmentsData}
                        isExtrasDisplayed={isExtrasDisplayed}
                    />
                }
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerCancel={{ cancelInfo, setCancelInfo }}
            />
        </>
    );
};

DeliveryPage.layout = MainLayout;

export default DeliveryPage;
