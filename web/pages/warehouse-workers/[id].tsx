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
import { AppHead, LinkButton } from '@components';
import { WarehouseWorkerModelV2 as model } from 'models/WarehouseWorkerModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { warehouseWorkersRoutes as itemRoutes } from 'modules/WarehouseWorkers/Static/warehouseWorkersRoutes';
import { Button, Modal, Space } from 'antd';
import { gql } from 'graphql-request';
import {
    DeleteWarehouseWorkerMutation,
    DeleteWarehouseWorkerMutationVariables,
    ModeEnum,
    ResetWarehouseWorkerPasswordMutation,
    ResetWarehouseWorkerPasswordMutationVariables,
    useDeleteWarehouseWorkerMutation,
    useResetWarehouseWorkerPasswordMutation
} from 'generated/graphql';
import { WarehouseWorkerDetailsExtra } from 'modules/WarehouseWorkers/Elements/WarehouseWorkerDetailsExtra';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const WarehouseWorkerPage: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient, logout } = useAuth();
    const { user, permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [isDeletingActualUser, setIsDeletingActualUser] = useState<boolean>(false);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.username}`
        }
    ];

    const pageTitle = `${t('common:warehouse-worker')} ${data?.username}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            if (id == user.id) {
                Modal.confirm({
                    title: t('messages:delete-own-user-confirm'),
                    onOk: () => {
                        setId(id);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel')
                });
            } else {
                Modal.confirm({
                    title: t('messages:delete-confirm'),
                    onOk: () => {
                        setId(id);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel')
                });
            }
        };
    };

    // RESET PASSWORD MUTATION
    const { mutate: ResetPasswordMutate, isPending: ResetPasswordLoading } =
        useResetWarehouseWorkerPasswordMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: ResetWarehouseWorkerPasswordMutation,
                _variables: ResetWarehouseWorkerPasswordMutationVariables,
                _context: any
            ) => {
                router.push(`/warehouse-workers`);
                showSuccess(t('messages:success-password-reset'));
            },
            onError: (err) => {
                showError(t('messages:error-password-reset'));
            }
        });

    const ResetWarehouseWorkerPassword = ({
        id
    }: ResetWarehouseWorkerPasswordMutationVariables) => {
        Modal.confirm({
            title: t('messages:password-reset-confirm'),
            onOk: () => {
                ResetPasswordMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ALLOW LOGIN WITHOUT SSO
    const [loadingAllowLoginWithoutSso, setLoadingAllowLoginWithoutSso] = useState(false);
    const AllowLoginWithoutSso = async (id: string) => {
        setLoadingAllowLoginWithoutSso(true);
        const warehouseWorkerMutation = gql`
            mutation ($id: String!, $input: UpdateWarehouseWorkerInput!) {
                updateWarehouseWorker(id: $id, input: $input) {
                    id
                }
            }
        `;

        let AllowLoginWithoutSsoValue;

        if (data?.allowLoginWithoutSso === false || data?.allowLoginWithoutSso == null) {
            AllowLoginWithoutSsoValue = {
                id: id,
                input: {
                    allowLoginWithoutSso: true
                }
            };
        } else if (data?.allowLoginWithoutSso === true) {
            AllowLoginWithoutSsoValue = {
                id: id,
                input: {
                    allowLoginWithoutSso: false
                }
            };
        }

        const result = await graphqlRequestClient.request(
            warehouseWorkerMutation,
            AllowLoginWithoutSsoValue
        );
        setLoadingAllowLoginWithoutSso(false);
        router.reload();

        return result;
    };

    // DELETE MUTATION
    const { mutate: DeleteWarehouseWorkerMutate, isPending: DeleteLoading } =
        useDeleteWarehouseWorkerMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteWarehouseWorkerMutation,
                _variables: DeleteWarehouseWorkerMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-deleted'));
                if (isDeletingActualUser) logout();
                else {
                    router.push(`/warehouse-workers/`);
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/edit/${id}`}
                            type="primary"
                        />
                        <Button
                            loading={ResetPasswordLoading}
                            onClick={() => ResetWarehouseWorkerPassword({ id: data?.id })}
                        >
                            {t('actions:reset-password')}
                        </Button>
                        <Button
                            type={data?.allowLoginWithoutSso}
                            danger={data?.allowLoginWithoutSso}
                            onClick={() => AllowLoginWithoutSso(data?.id)}
                            loading={loadingAllowLoginWithoutSso}
                        >
                            {data?.allowLoginWithoutSso
                                ? t('actions:disable-login-without-sso')
                                : t('actions:allow-login-without-sso')}
                        </Button>
                    </>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button
                        loading={DeleteLoading}
                        onClick={() => DeleteWarehouseWorker({ id: data?.id })}
                    >
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                extraDataComponent={
                    <WarehouseWorkerDetailsExtra id={id!} username={data?.username} />
                }
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

WarehouseWorkerPage.layout = MainLayout;

export default WarehouseWorkerPage;
