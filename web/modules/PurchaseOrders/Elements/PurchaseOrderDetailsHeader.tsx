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
import { purchaseOrdersRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';
import useTranslation from 'next-translate/useTranslation';
import moment from 'moment';
import 'moment/min/locales';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeletePurchaseOrderMutation,
    DeletePurchaseOrderMutationVariables,
    ModeEnum,
    SoftDeletePurchaseOrderMutation,
    SoftDeletePurchaseOrderMutationVariables,
    useDeletePurchaseOrderMutation,
    useSoftDeletePurchaseOrderMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
    type: string | any;
    poLinesCount: number | any;
}

const PurchaseOrderDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...purchaseOrdersRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // PRINT
    const printPurchaseOrder = async (purchaseOrderId: string) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        const res = await fetch(`/api/purchase-orders/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                purchaseOrderId,
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

    // DISABLE PUCHASE ORDER
    const { mutate: softDeleteMutate, isLoading: softDeleteLoading } =
        useSoftDeletePurchaseOrderMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeletePurchaseOrderMutation,
                _variables: SoftDeletePurchaseOrderMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    if (data.softDeletePurchaseOrder) {
                        showSuccess(t('messages:success-disabled'));
                        router.push(`/purchase-orders/`);
                    } else {
                        showError(t('messages:error-disabling-data'));
                    }
                }
            },
            onError: () => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeletePurchaseOrder = ({ id }: SoftDeletePurchaseOrderMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:back')
        });
    };

    //DELETE
    const { mutate: deleteMutate, isLoading: deleteLoading } =
        useDeletePurchaseOrderMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeletePurchaseOrderMutation,
                _variables: DeletePurchaseOrderMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    showSuccess(t('messages:success-deleted'));
                    router.push(`/purchase-orders/`);
                }
            },
            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deletePurchaseOrder = ({ id }: DeletePurchaseOrderMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                deleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:back')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:purchase-order')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/purchase-orders')}
            actionsRight={
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Read) &&
                    props.status != configs.PURCHASE_ORDER_STATUS_CLOSED ? (
                        <Button type="primary" onClick={() => printPurchaseOrder(props.id)}>
                            {t('actions:print')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.status <= configs.PURCHASE_ORDER_STATUS_IN_PROGRESS ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/purchase-orders/edit/${props.id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.status < configs.PURCHASE_ORDER_STATUS_CLOSED &&
                    props.poLinesCount > 0 ? (
                        <Button
                            loading={softDeleteLoading}
                            onClick={() =>
                                softDeletePurchaseOrder({
                                    id: props.id
                                })
                            }
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    props.status < configs.PURCHASE_ORDER_STATUS_IN_PROGRESS &&
                    props.type != configs.DELIVERY_PO_TYPE_L3 &&
                    props.type != configs.DELIVERY_PO_TYPE_L3_RETURN &&
                    props.poLinesCount <= 0 ? (
                        <Button
                            loading={deleteLoading}
                            onClick={() =>
                                deletePurchaseOrder({
                                    id: props.id
                                })
                            }
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            }
        />
    );
};

export { PurchaseOrderDetailsHeader };
