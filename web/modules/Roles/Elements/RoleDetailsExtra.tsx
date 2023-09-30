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
import { RoleUserRoleModelV2 } from 'models/RoleUserRoleModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const { Title } = Typography;

export interface IItemDetailsProps {
    roleId?: string | any;
    roleName?: string | any;
}

const RoleDetailsExtra = ({ roleId, roleName }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();
    const userRoleModes = getModesFromPermissions(permissions, Table.UserRole);
    const warehouseWorkerModes = getModesFromPermissions(permissions, Table.WarehouseWorker);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const UserRoleData: HeaderData = {
        title: t('common:associated-warehouse-workers'),
        routes: [],
        actionsComponent:
            userRoleModes.length > 0 && userRoleModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:warehouse-worker') })}
                    path={pathParamsFromDictionary('/roles/warehouse-worker/add', {
                        roleId: roleId,
                        roleName: roleName
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
    } = useDelete(RoleUserRoleModelV2.endpoints.delete);

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
                searchCriteria={{ roleId: roleId, integratorUserId: null }}
                dataModel={RoleUserRoleModelV2}
                headerData={UserRoleData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            name: string;
                            warehouseWorkerId: string;
                        }) => (
                            <Space>
                                {warehouseWorkerModes.length > 0 &&
                                warehouseWorkerModes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            `/warehouse-workers/[id]`,
                                            record?.warehouseWorkerId
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

export { RoleDetailsExtra };
