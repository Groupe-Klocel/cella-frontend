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

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    GetListOfPrioritiesQuery,
    ModeEnum,
    SoftDeleteEquipmentMutation,
    SoftDeleteEquipmentMutationVariables,
    UpdateEquipmentMutation,
    UpdateEquipmentMutationVariables,
    useGetListOfPrioritiesQuery,
    useSoftDeleteEquipmentMutation,
    useUpdateEquipmentMutation
} from 'generated/graphql';
import { equipmentRoutes } from '../Static/equipmentRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    priority: number;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const EquipmentDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [, setMaxPriority] = useState<number>(0);
    const [equipmentWithPriorities, setEquipmentWithPriorities] = useState<any>();

    const breadsCrumb = [
        ...equipmentRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const priorityList = useGetListOfPrioritiesQuery<Partial<GetListOfPrioritiesQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        const receivedList = priorityList?.data?.equipments?.results.map((e: any) => e.priority);
        if (receivedList) {
            setMaxPriority(Math.max(...receivedList));
        }
        setEquipmentWithPriorities(priorityList?.data?.equipments?.results);
    }, [priorityList]);

    //rework priorities list
    function compare(a: any, b: any) {
        if (a.priority < b.priority) {
            return -1;
        }
        if (a.priority > b.priority) {
            return 1;
        }
        return 0;
    }
    const inCourseEquipment = equipmentWithPriorities
        ?.filter((e: any) => e.priority !== null)
        .sort(compare);

    //For priority updates on Finish
    const { mutate: updateMutate, isPending: updateLoading } = useUpdateEquipmentMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateEquipmentMutation,
                _variables: UpdateEquipmentMutationVariables,
                _context: any
            ) => {
                // showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateEquipment = ({ id, input }: UpdateEquipmentMutationVariables) => {
        updateMutate({ id, input });
    };

    // DISABLE EQUIPMENT
    const { mutate: softDeleteMutate, isPending: softDeleteLoading } =
        useSoftDeleteEquipmentMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteEquipmentMutation,
                _variables: SoftDeleteEquipmentMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    router.push('/equipment');
                    showSuccess(t('messages:success-disabled'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeleteEquipment = ({ id }: SoftDeleteEquipmentMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
                const equipmentToUpdate = inCourseEquipment.filter(
                    (e: any) => e.priority > props.priority
                );
                if (equipmentToUpdate) {
                    equipmentToUpdate.forEach((e: any) =>
                        updateEquipment({ id: e.id, input: { priority: (e.priority - 1) as any } })
                    );
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE EQUIPMENT
    const { mutate: updateEquipmentMutate, isPending: enableLoading } =
        useUpdateEquipmentMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdateEquipmentMutation,
                _variables: UpdateEquipmentMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    if (data.updateEquipment) {
                        router.push('edit/' + props.id);
                        showSuccess(t('messages:success-enabled'));
                    } else {
                        showError(t('messages:error-enabling-data'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-enabling-data'));
            }
        });

    const enableEquipment = ({ id, input: input }: UpdateEquipmentMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updateEquipmentMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:pieceOfEquipment')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/equipment')}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    props.status != configs.EQUIPMENT_STATUS_CLOSED ? (
                        <Space>
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/equipment/edit/${props.id}`}
                                type="primary"
                            />
                            <Button
                                loading={softDeleteLoading}
                                onClick={() =>
                                    softDeleteEquipment({
                                        id: props.id
                                    })
                                }
                            >
                                {t('actions:delete')}
                            </Button>
                        </Space>
                    ) : (
                        <Button
                            loading={enableLoading}
                            onClick={() =>
                                enableEquipment({
                                    id: props.id,
                                    input: { status: configs.EQUIPMENT_STATUS_IN_PROGRESS }
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
export { EquipmentDetailsHeader };
