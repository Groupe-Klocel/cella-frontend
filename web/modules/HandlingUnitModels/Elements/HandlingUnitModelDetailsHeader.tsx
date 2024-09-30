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
import { handlingUnitModelsRoutes } from 'modules/HandlingUnitModels/Static/handlingUnitModelsRoutes';
import useTranslation from 'next-translate/useTranslation';

import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent, NumberOfPrintsModal } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    SoftDeleteHandlingUnitModelMutation,
    SoftDeleteHandlingUnitModelMutationVariables,
    useSoftDeleteHandlingUnitModelMutation,
    useUpdateHandlingUnitModelMutation,
    UpdateHandlingUnitModelMutation,
    UpdateHandlingUnitModelMutationVariables
} from 'generated/graphql';
import { ModeEnum } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const HandlingUnitModelDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);

    const breadsCrumb = [
        ...handlingUnitModelsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    //  DISABLE PACKAGING
    const { mutate: softDeleteMutate, isPending: softDeleteLoading } =
        useSoftDeleteHandlingUnitModelMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteHandlingUnitModelMutation,
                _variables: SoftDeleteHandlingUnitModelMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    if (data.softDeleteHandlingUnitModel) {
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

    const softDeleteHandlingUnitModel = ({ id }: SoftDeleteHandlingUnitModelMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE PACKAGING
    const { mutate: updateHandlingUnitModelMutate, isPending: enableLoading } =
        useUpdateHandlingUnitModelMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdateHandlingUnitModelMutation,
                _variables: UpdateHandlingUnitModelMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    if (data.updateHandlingUnitModel) {
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

    const enableHandlingUnitModel = ({
        id,
        input: input
    }: UpdateHandlingUnitModelMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updateHandlingUnitModelMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            <HeaderContent
                title={`${t('common:handling-unit-models')} ${props.name}`}
                routes={breadsCrumb}
                onBack={() => router.push('/handling-unit-models')}
                actionsRight={
                    modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                        props.status != configs.HANDLING_UNIT_MODEL_STATUS_CLOSED ? (
                            <Space>
                                <Button
                                    type="primary"
                                    onClick={() => setShowNumberOfPrintsModal(true)}
                                >
                                    {t('actions:print-label')}
                                </Button>
                                <LinkButton
                                    title={t('actions:edit')}
                                    path={`/handling-unit-models/edit/${props.id}`}
                                    type="primary"
                                />
                                <Button
                                    loading={softDeleteLoading}
                                    onClick={() => softDeleteHandlingUnitModel({ id: props.id })}
                                >
                                    {t('actions:disable')}
                                </Button>
                            </Space>
                        ) : (
                            <Space>
                                <Button
                                    loading={enableLoading}
                                    onClick={() =>
                                        enableHandlingUnitModel({
                                            id: props.id,
                                            input: {
                                                status: configs.HANDLING_UNIT_MODEL_STATUS_IN_PROGRESS
                                            }
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
            <NumberOfPrintsModal
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                id={props.id}
                path="/api/handling-unit-models/print/label"
            />
        </>
    );
};

export { HandlingUnitModelDetailsHeader };
