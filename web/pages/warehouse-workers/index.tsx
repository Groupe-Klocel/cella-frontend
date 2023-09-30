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
import { DeleteOutlined, EditTwoTone, EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import {
    DeleteWarehouseWorkerMutation,
    DeleteWarehouseWorkerMutationVariables,
    ModeEnum,
    useDeleteWarehouseWorkerMutation
} from 'generated/graphql';
import { WarehouseWorkerModelV2 as model } from 'models/WarehouseWorkerModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { warehouseWorkersRoutes as itemRoutes } from 'modules/WarehouseWorkers/Static/warehouseWorkersRoutes';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
type PageComponent = FC & { layout: typeof MainLayout };

const RolePages: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient, logout } = useAuth();
    const { user, permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [isDeletingActualUser, setIsDeletingActualUser] = useState<boolean>(false);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:warehouse-workers'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:warehouse-worker') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    // DELETE MUTATION
    const { mutate: DeleteWarehouseWorkerMutate, isLoading: DeleteLoading } =
        useDeleteWarehouseWorkerMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteWarehouseWorkerMutation,
                _variables: DeleteWarehouseWorkerMutationVariables,
                _context: any
            ) => {
                if (!DeleteLoading) {
                    showSuccess(t('messages:success-deleted'));
                    if (isDeletingActualUser) logout();
                    else {
                        router.reload();
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const DeleteWarehouseWorker = ({ id }: DeleteWarehouseWorkerMutationVariables) => {
        if (id == user.id) {
            setIsDeletingActualUser(true);
            Modal.confirm({
                title: t('messages:delete-own-user-confirm'),
                onOk: () => {
                    DeleteWarehouseWorkerMutate({ id });
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        } else {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    DeleteWarehouseWorkerMutate({ id });
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        }
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            userRoles_id: string;
                            warehouseId: string;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        loading={DeleteLoading}
                                        onClick={() => DeleteWarehouseWorker({ id: record?.id })}
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
        </>
    );
};

RolePages.layout = MainLayout;

export default RolePages;
