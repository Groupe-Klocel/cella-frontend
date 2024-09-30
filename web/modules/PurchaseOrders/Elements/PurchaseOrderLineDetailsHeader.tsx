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
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeletePurchaseOrderLineMutation,
    DeletePurchaseOrderLineMutationVariables,
    ModeEnum,
    SoftDeletePurchaseOrderLineMutation,
    SoftDeletePurchaseOrderLineMutationVariables,
    useDeletePurchaseOrderLineMutation,
    useSoftDeletePurchaseOrderLineMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { purchaseOrdersRoutes } from '../Static/purchaseOrdersRoutes';

export interface ISingleItemProps {
    id: string | any;
    dataModel: ModelType;
    purchaseOrderName?: string | any;
    purchaseOrderId: string | any;
    purchaseOrderLine?: string | any;
    purchaseOrderType: number | any;
    purchaseOrderStatus: number | any;
    lineNumber: Number | any;
}

const PurchaseOrderLineDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const purchaseOrderDetailBreadCrumb = [
        ...purchaseOrdersRoutes,
        {
            breadcrumbName: `${props.purchaseOrderName}`,
            path: '/purchase-orders/' + props.purchaseOrderId
        }
    ];
    const breadCrumb = [
        ...purchaseOrderDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${props.lineNumber}`
        }
    ];

    // DISABLE PURCHASE ORDER LINE
    const { mutate: softDeleteMutate, isPending: softDeleteLoading } =
        useSoftDeletePurchaseOrderLineMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeletePurchaseOrderLineMutation,
                _variables: SoftDeletePurchaseOrderLineMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    showSuccess(t('messages:success-disabled'));
                    router.push(`/purchase-orders/${props.purchaseOrderId}`);
                }
            },
            onError: (err) => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeletePurchaseOrderLine = ({ id }: SoftDeletePurchaseOrderLineMutationVariables) => {
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
    const { mutate: deleteMutate, isPending: deleteLoading } =
        useDeletePurchaseOrderLineMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeletePurchaseOrderLineMutation,
                _variables: DeletePurchaseOrderLineMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    showSuccess(t('messages:success-deleted'));
                    router.push(`/purchase-orders/${props.purchaseOrderId}`);
                }
            },
            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deletePurchaseOrderLine = ({ id }: DeletePurchaseOrderLineMutationVariables) => {
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
            title={`${t('common:purchase-order')} ${props.purchaseOrderName} - ${t(
                'common:line'
            )} ${props.lineNumber}`}
            routes={breadCrumb}
            onBack={() => router.push(`/purchase-orders/${props.purchaseOrderId}`)}
            actionsRight={
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.purchaseOrderStatus <= configs.PURCHASE_ORDER_STATUS_IN_PROGRESS ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={pathParamsFromDictionary(`/purchase-orders/line/edit/[id]`, {
                                id: props.id
                            })}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.purchaseOrderStatus < configs.PURCHASE_ORDER_STATUS_CLOSED ? (
                        <Button
                            loading={softDeleteLoading}
                            onClick={() =>
                                softDeletePurchaseOrderLine({
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
                    props.purchaseOrderType != configs.DELIVERY_PO_TYPE_L3 &&
                    props.purchaseOrderType != configs.DELIVERY_PO_TYPE_L3_RETURN &&
                    props.purchaseOrderStatus <= configs.PURCHASE_ORDER_STATUS_IN_PROGRESS ? (
                        <Button
                            loading={deleteLoading}
                            onClick={() =>
                                deletePurchaseOrderLine({
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

export { PurchaseOrderLineDetailsHeader };
