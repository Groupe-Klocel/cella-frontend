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
import { WarehouseWorkerUserRoleModelV2 } from '@helpers';
import { WarehouseWorkerStockOwnerModelV2 } from '@helpers';
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
    const [idToDeleteUserRole, setIdToDeleteUserRole] = useState<string | undefined>();
    const [idToDisableUserRole, setIdToDisableUserRole] = useState<string | undefined>();
    const [idToDeleteWarehouseWorkerStockOwner, setIdToDeleteWarehouseWorkerStockOwner] = useState<
        string | undefined
    >();
    const [idToDisableWarehouseWorkerStockOwner, setIdToDisableWarehouseWorkerStockOwner] =
        useState<string | undefined>();

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

    const WarehouseWorkerStockOwnerData: HeaderData = {
        title: t('common:warehouse-worker-stock-owners'),
        routes: [],
        actionsComponent:
            userRoleModes.length > 0 && userRoleModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:warehouse-worker-stock-owners') })}
                    path={pathParamsFromDictionary('/warehouse-worker-stock-owners/add', {
                        id
                    })}
                    type="primary"
                />
            ) : null
    };

    // Delete
    const {
        isLoading: deleteLoadingUserRole,
        result: deleteResultUserRole,
        mutate: deleteUserRole
    } = useDelete(WarehouseWorkerUserRoleModelV2.endpoints.delete);

    useEffect(() => {
        if (!(deleteResultUserRole && deleteResultUserRole.data)) return;

        if (deleteResultUserRole.success) {
            showSuccess(t('messages:success-deleted'));
            router.reload();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResultUserRole]);

    const {
        isLoading: deleteLoadingWarehouseWorkerStockOwner,
        result: deleteResultWarehouseWorkerStockOwner,
        mutate: deleteWarehouseWorkerStockOwner
    } = useDelete(WarehouseWorkerStockOwnerModelV2.endpoints.delete);

    useEffect(() => {
        if (!(deleteResultWarehouseWorkerStockOwner && deleteResultWarehouseWorkerStockOwner.data))
            return;

        if (deleteResultWarehouseWorkerStockOwner.success) {
            showSuccess(t('messages:success-deleted'));
            router.reload();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResultWarehouseWorkerStockOwner]);

    return (
        <>
            <Divider />
            <ListComponent
                searchCriteria={{ warehouseWorkerId: id, integratorUserId: null }}
                dataModel={WarehouseWorkerUserRoleModelV2}
                headerData={UserRoleData}
                triggerDelete={{ idToDeleteUserRole, setIdToDeleteUserRole }}
                triggerSoftDelete={{ idToDisableUserRole, setIdToDisableUserRole }}
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
            <ListComponent
                searchCriteria={{ warehouseWorkerId: id }}
                dataModel={WarehouseWorkerStockOwnerModelV2}
                headerData={WarehouseWorkerStockOwnerData}
                triggerDelete={{
                    idToDeleteWarehouseWorkerStockOwner,
                    setIdToDeleteWarehouseWorkerStockOwner
                }}
                triggerSoftDelete={{
                    idToDisableWarehouseWorkerStockOwner,
                    setIdToDisableWarehouseWorkerStockOwner
                }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; name: string }) => (
                            <Space>
                                {RoleModes.length > 0 && RoleModes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            `/warehouse-worker-stock-owners/[id]`,
                                            record?.id
                                        )}
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
                                                        deleteWarehouseWorkerStockOwner(record.id);
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
