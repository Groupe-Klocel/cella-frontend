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
import { logisticUnitsRoutes } from 'modules/LogisticUnits/Static/logisticUnitsRoutes';
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    ModeEnum,
    SoftDeleteLogisticUnitMutation,
    SoftDeleteLogisticUnitMutationVariables,
    UpdateLogisticUnitMutation,
    UpdateLogisticUnitMutationVariables,
    useSoftDeleteLogisticUnitMutation,
    useUpdateLogisticUnitMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const LogisticUnitDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...logisticUnitsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // DISABLE LOGISTIC UNIT
    const { mutate: softDeleteMutate, isPending: softDeleteLoading } =
        useSoftDeleteLogisticUnitMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteLogisticUnitMutation,
                _variables: SoftDeleteLogisticUnitMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    if (data.softDeleteLogisticUnit) {
                        showSuccess(t('messages:success-disabled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-disabling-data'));
                    }
                }
            },
            onError: () => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeleteLogisticUnit = ({ id }: SoftDeleteLogisticUnitMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE LOGISTIC UNIT
    const { mutate: updateLogisticUnitMutate, isPending: enableLoading } =
        useUpdateLogisticUnitMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdateLogisticUnitMutation,
                _variables: UpdateLogisticUnitMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    showSuccess(t('messages:success-enabled'));
                    router.reload();
                }
            },
            onError: () => {
                showError(t('messages:error-enabling-data'));
            }
        });

    const enableLogisticUnit = ({ id, input: input }: UpdateLogisticUnitMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updateLogisticUnitMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:logistic-unit')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/logistic-units')}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    props.status != configs.LOGISTIC_UNIT_STATUS_CLOSED ? (
                        <Space>
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/logistic-units/edit/${props.id}`}
                                type="primary"
                            />
                            <Button
                                loading={softDeleteLoading}
                                onClick={() => softDeleteLogisticUnit({ id: props.id })}
                            >
                                {t('actions:delete')}
                            </Button>
                        </Space>
                    ) : (
                        <Space>
                            <Button
                                loading={enableLoading}
                                onClick={() =>
                                    enableLogisticUnit({
                                        id: props.id,
                                        input: { status: configs.LOGISTIC_UNIT_STATUS_IN_PROGRESS }
                                    })
                                }
                            >
                                {t('actions:enable')}
                            </Button>
                        </Space>
                    )
                ) : (
                    <></>
                )
            }
        />
    );
};

export { LogisticUnitDetailsHeader };
