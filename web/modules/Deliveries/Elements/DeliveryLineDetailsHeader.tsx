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

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    CancelDeliveryLineMutation,
    CancelDeliveryLineMutationVariables,
    ModeEnum,
    useCancelDeliveryLineMutation
} from 'generated/graphql';
import { deliveriesRoutes } from '../Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    deliveryId: string | any;
    deliveryName: string | any;
    articleName: string | any;
    status: any;
}

const DeliveryLineDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { id } = router.query;

    const deliveryDetailBreadCrumb = [
        ...deliveriesRoutes,
        {
            breadcrumbName: `${props.deliveryName}`,
            path: '/deliveries/' + props.deliveryId
        }
    ];
    const breadsCrumb = [
        ...deliveryDetailBreadCrumb,
        {
            breadcrumbName: `${props.articleName}`
        }
    ];

    // CANCEL DELIVERY LINE
    const { mutate: CancelDeliveryLineMutate, isLoading: cancelLoading } =
        useCancelDeliveryLineMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: CancelDeliveryLineMutation,
                _variables: CancelDeliveryLineMutationVariables,
                _context: any
            ) => {
                if (!cancelLoading) {
                    if (data.softDeleteDeliveryLine) {
                        showSuccess(t('messages:success-canceled'));
                        router.push(`/deliveries/${props.deliveryId}`);
                    } else {
                        showError(t('messages:error-canceling-data'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-canceling-data'));
            }
        });

    const cancelDeliveryLine = ({ id }: CancelDeliveryLineMutationVariables) => {
        Modal.confirm({
            title: t('messages:cancel-confirm'),
            onOk: () => {
                CancelDeliveryLineMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const title = props.deliveryName + ' / ' + props.articleName;

    return (
        <HeaderContent
            title={`${t('common:delivery-line')} ${title}`}
            routes={breadsCrumb}
            onBack={() => router.push('/deliveries/' + props.deliveryId)}
            actionsRight={
                modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                props.status <= configs.DELIVERY_STATUS_CREATED ? (
                    <Space>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/deliveries/lines/edit/${props.id}`}
                            type="primary"
                        />
                        <Button
                            loading={cancelLoading}
                            onClick={() => cancelDeliveryLine({ id: props.id })}
                        >
                            {t('actions:cancel')}
                        </Button>
                    </Space>
                ) : (
                    <></>
                )
            }
        />
    );
};

export { DeliveryLineDetailsHeader };
