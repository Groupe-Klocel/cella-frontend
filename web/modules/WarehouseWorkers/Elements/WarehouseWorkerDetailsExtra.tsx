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
import { DeleteOutlined, EyeTwoTone } from '@ant-design/icons';
import { LinkButton } from '@components';
import {
    getModesFromPermissions,
    pathParams,
    pathParamsFromDictionary,
    showError,
    showSuccess,
    useDelete
} from '@helpers';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { WarehouseWorkerUserRoleModelV2 } from 'models/WarehouseWorkerUserRoleModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface IItemDetailsProps {
    id?: string | any;
    username?: string | any;
}

const WarehouseWorkerDetailsExtra = ({ id, username }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();
    const userRoleModes = getModesFromPermissions(permissions, Table.UserRole);
    const RoleModes = getModesFromPermissions(permissions, Table.Role);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const UserRoleData: HeaderData = {
        title: t('common:associated-roles'),
        routes: [],
        actionsComponent:
            userRoleModes.length > 0 && userRoleModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:role') })}
                    path={pathParamsFromDictionary('/warehouse-workers/role/add', {
                        id: id,
                        username: username
                    })}
                    type="primary"
                />
            ) : null
    };

    // Delete
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: deleteUserRole
    } = useDelete(WarehouseWorkerUserRoleModelV2.endpoints.delete);

    useEffect(() => {
        if (!(deleteResult && deleteResult.data)) return;

        if (deleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            router.reload();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResult]);

    return (
        <>
            <Divider />
            <ListComponent
                searchCriteria={{ warehouseWorkerId: id, integratorUserId: null }}
                dataModel={WarehouseWorkerUserRoleModelV2}
                headerData={UserRoleData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; name: string; roleId: string }) => (
                            <Space>
                                {RoleModes.length > 0 && RoleModes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`/roles/[id]`, record?.roleId)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {userRoleModes.length == 0 ||
                                !userRoleModes.includes(ModeEnum.Delete) ? (
                                    <></>
                                ) : (
                                    <>
                                        <Button
                                            icon={<DeleteOutlined />}
                                            onClick={() =>
                                                Modal.confirm({
                                                    title: t('messages:delete-confirm'),
                                                    onOk: () => {
                                                        deleteUserRole(record.id);
                                                    },

                                                    okText: t('messages:confirm'),
                                                    cancelText: t('messages:cancel')
                                                })
                                            }
                                            danger
                                        />
                                    </>
                                )}
                            </Space>
                        )
                    }
                ]}
                searchable={false}
            />
        </>
    );
};

export { WarehouseWorkerDetailsExtra };
