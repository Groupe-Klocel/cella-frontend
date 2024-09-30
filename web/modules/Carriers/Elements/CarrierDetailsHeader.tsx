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
import { Space, Button, Modal } from 'antd';
import { carriersRoutes } from 'modules/Carriers/Static/carriersRoutes';
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent, LinkButton } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    ModeEnum,
    SoftDeleteCarrierMutation,
    SoftDeleteCarrierMutationVariables,
    UpdateCarrierMutation,
    UpdateCarrierMutationVariables,
    useSoftDeleteCarrierMutation,
    useUpdateCarrierMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    status: number | any;
    dataModel: ModelType;
}

const CarrierDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...carriersRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // DISABLE CARRIER
    const { mutate: softDeleteMutate, isPending: softDeleteLoading } =
        useSoftDeleteCarrierMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteCarrierMutation,
                _variables: SoftDeleteCarrierMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    if (data.softDeleteCarrier) {
                        showSuccess(t('messages:success-disabled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-disabling-data'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeleteCarrier = ({ id }: SoftDeleteCarrierMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },

            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE CARRIER
    const { mutate: updateCarrierMutate, isPending: enableLoading } =
        useUpdateCarrierMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdateCarrierMutation,
                _variables: UpdateCarrierMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    if (data.updateCarrier) {
                        showSuccess(t('messages:success-enabled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-enabling-data'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-enabling-data'));
            }
        });

    const enableCarrier = ({ id, input: input }: UpdateCarrierMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updateCarrierMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:carrier')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/carriers')}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    props.status != configs.CARRIER_STATUS_CLOSED ? (
                        <Space>
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/carriers/edit/${props.id}`}
                                type="primary"
                            />
                            <Button
                                loading={softDeleteLoading}
                                onClick={() => softDeleteCarrier({ id: props.id })}
                            >
                                {t('actions:disable')}
                            </Button>
                        </Space>
                    ) : (
                        <Button
                            loading={enableLoading}
                            onClick={() =>
                                enableCarrier({
                                    id: props.id,
                                    input: { status: configs.CARRIER_STATUS_IN_PROGRESS }
                                })
                            }
                        >
                            {t('actions:enable')}
                        </Button>
                    )
                ) : (
                    <></>
                )
            }
        />
    );
};

export { CarrierDetailsHeader };
