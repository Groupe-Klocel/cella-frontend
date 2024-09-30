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
import { Space, Button, Modal } from 'antd';
import { deliveriesRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import useTranslation from 'next-translate/useTranslation';
import moment from 'moment';
import 'moment/min/locales';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess, useDeliveryLineIds } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    ModeEnum,
    CancelDeliveryMutation,
    CancelDeliveryMutationVariables,
    useCancelDeliveryMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: number | any;
}

const DeliveryDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...deliveriesRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const deliveryLines = useDeliveryLineIds({ deliveryId: `${props.id}%` }, 1, 100, null);

    // PRINT
    const printDelivery = async (deliveryId: string) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        const res = await fetch(`/api/deliveries/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deliveryId,
                dateLocal
            })
        });
        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };

    // CANCEL DELIVERY
    const { mutate: cancelDeliveryMutate, isPending: cancelLoading } =
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
    const cubingDelivery = (deliveryId: string) => {
        Modal.confirm({
            title: t('messages:cubing-confirm'),
            onOk: async () => {
                const deliveries: Array<any> = [];
                deliveries.push({ id: deliveryId });

                const res = await fetch(`/api/preparation/cubing`, {
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
                    // cubing success
                    showSuccess(t('messages:success-cubing'));
                    router.reload();
                } else {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:error-cubing'));
                    }
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

    return (
        <HeaderContent
            title={`${t('common:delivery')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/deliveries')}
            actionsRight={
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Read) &&
                    props.status <= configs.DELIVERY_STATUS_CANCELED ? (
                        <Button type="primary" onClick={() => printDelivery(props.id)}>
                            {t('actions:print')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.status < configs.DELIVERY_STATUS_DISPATCHED ? (
                        <Space>
                            {/* EDIT button */}
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/deliveries/edit/${props.id}`}
                                type="primary"
                            />
                            {
                                // CUBING button
                                props.status <= configs.DELIVERY_STATUS_TO_BE_ESTIMATED &&
                                deliveryLines?.data?.deliveryLines &&
                                deliveryLines?.data?.deliveryLines?.count > 0 ? (
                                    <Button onClick={() => cubingDelivery(props.id)}>
                                        test{t('actions:cubing')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                            {
                                // RECUBING button only if TO_BE_ESTIMATED < status <= ESTIMATED
                                props.status > configs.DELIVERY_STATUS_TO_BE_ESTIMATED &&
                                props.status <= configs.DELIVERY_STATUS_ESTIMATED &&
                                deliveryLines?.data?.deliveryLines &&
                                deliveryLines?.data?.deliveryLines?.count > 0 ? (
                                    <Button onClick={() => cubingDelivery(props.id)}>
                                        {t('actions:recubing')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                            {
                                // Start button
                                props.status == configs.DELIVERY_STATUS_ESTIMATED ? (
                                    <Button onClick={() => startDelivery(props.id, props.status)}>
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
                            {
                                // CANCEL button
                                props.status < configs.DELIVERY_STATUS_STARTED ? (
                                    <Button
                                        loading={cancelLoading}
                                        onClick={() => cancelDelivery({ id: props.id })}
                                    >
                                        {t('actions:cancel')}
                                    </Button>
                                ) : (
                                    <></>
                                )
                            }
                        </Space>
                    ) : (
                        <></>
                    )}
                </Space>
            }
        />
    );
};

export { DeliveryDetailsHeader };
