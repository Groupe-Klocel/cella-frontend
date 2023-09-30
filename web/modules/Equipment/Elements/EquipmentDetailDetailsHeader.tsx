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
    DeleteEquipmentDetailMutation,
    DeleteEquipmentDetailMutationVariables,
    ModeEnum,
    useDeleteEquipmentDetailMutation
} from 'generated/graphql';
import { equipmentRoutes } from '../Static/equipmentRoutes';
import { useAuth } from 'context/AuthContext';
export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    equipmentId: string | any;
    equipmentName: string | any;
    handlingUnitModelName: string | any;
}

const EquipmentDetailDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { id } = router.query;

    const equipmentDetailBreadCrumb = [
        ...equipmentRoutes,
        {
            breadcrumbName: `${props.equipmentName}`,
            path: '/equipment/' + props.equipmentId
        }
    ];
    const breadsCrumb = [
        ...equipmentDetailBreadCrumb,
        {
            breadcrumbName: `details/${props.handlingUnitModelName}`
        }
    ];

    // DELETE
    const { mutate: DeleteMutate, isLoading: deleteLoading } =
        useDeleteEquipmentDetailMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteEquipmentDetailMutation,
                _variables: DeleteEquipmentDetailMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    if (data.deleteEquipmentDetail) {
                        showSuccess(t('messages:success-deleted'));
                        router.push(`/equipment/${props.equipmentId}`);
                    } else {
                        showError(t('messages:error-delete-equipmentDetail-impossible'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deleteEquipmentDetail = ({ id }: DeleteEquipmentDetailMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                DeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const title = props.equipmentName + ' - ' + props.handlingUnitModelName;

    return (
        <HeaderContent
            title={`${t('common:equipment-detail')} ${title}`}
            routes={breadsCrumb}
            onBack={() => router.push('/equipment/' + props.equipmentId)}
            actionsRight={
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/equipment/details/edit/${props.id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                        <Button
                            loading={deleteLoading}
                            onClick={() => deleteEquipmentDetail({ id: props.id })}
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

export { EquipmentDetailDetailsHeader };
