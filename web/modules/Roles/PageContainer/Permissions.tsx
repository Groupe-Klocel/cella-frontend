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
import { useCallback, useEffect, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { ContentSpin, HeaderContent, LinkButton } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { Space, Form, Button, Alert, Modal } from 'antd';
import { useDrawerDispatch } from 'context/DrawerContext';
import { getModesFromPermissions, showError, showSuccess, useGetRoles } from '@helpers';
import { useAppState } from 'context/AppContext';
import {
    ModeEnum,
    PermissionInput,
    Table,
    UpdateRoleMutation,
    UpdateRoleMutationVariables,
    useListConfigsForAScopeQuery,
    useUpdateRoleMutation
} from 'generated/graphql';
import { PermissionList } from '../Elements/PermissionList';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { rolesRoutes } from '../Static/rolesRoutes';

export interface IItemDetailsProps {
    roleId?: any;
    roleName?: any;
}

const Permissions = ({ roleId, roleName }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Permission);
    const [enableUpdate, setEnableUpdate] = useState<any>();
    const [updatedRows, setUpdatedRows] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    const roleData = useGetRoles({ id: roleId }, 1, 100, null);

    // prompt the user if they try and leave with unsaved changes
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page'));
        };
        const handleBrowseAway = () => {
            if (!unsavedChanges) return;
            if (window.confirm(t('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges]);

    const roleDetailBreadCrumb = [
        ...rolesRoutes,
        {
            breadcrumbName: `${roleName}`,
            path: '/roles/' + roleId
        }
    ];
    const breadCrumbs = [
        ...roleDetailBreadCrumb,
        {
            breadcrumbName: t('common:permissions')
        }
    ];

    // Update
    const { mutate: updateMutate, isLoading: softDeleteLoading } = useUpdateRoleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateRoleMutation,
                _variables: UpdateRoleMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    showSuccess(t('messages:success-updated'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateRole = ({ id, permissions }: UpdateRoleMutationVariables) => {
        Modal.confirm({
            title: t('messages:update-permissions-confirm'),
            onOk: () => {
                updateMutate({ id, permissions });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:back')
        });
    };

    const handleSubmit = () => {
        setUnsavedChanges(false);
        const updatedPermissions: any[] = [];
        //Convert rows to PermissionInput
        Object.values(updatedRows).forEach((row: any) => {
            Object.keys(row).forEach((mode: any) => {
                if (row[mode] === true) {
                    updatedPermissions.push({
                        table: row.key.toUpperCase(),
                        mode: mode.toUpperCase()
                    });
                }
            });
        });
        updateRole({
            id: roleId,
            permissions: updatedPermissions
        });
    };

    //To render Simple tables list
    const tablesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'object_name',
        language: router.locale
    });

    const [tables, setTables] = useState<any>();
    useEffect(() => {
        if (tablesList) {
            tablesList?.data?.listConfigsForAScope.sort((a, b) => a.text.localeCompare(b.text));
            setTables(tablesList?.data?.listConfigsForAScope);
        }
    }, [tablesList.data]);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={roleName + ' - ' + t('common:permissions')}
                            routes={breadCrumbs}
                            onBack={() => router.push('/roles/' + roleId)}
                            actionsRight={
                                <>
                                    {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                        <>
                                            <Button
                                                type="primary"
                                                disabled={!enableUpdate}
                                                onClick={() => handleSubmit()}
                                            >
                                                {t('actions:submit')}
                                            </Button>
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </>
                            }
                        />
                        {tables && (
                            <PermissionList
                                searchCriteria={{ roleId: roleId }}
                                setEnableUpdate={setEnableUpdate}
                                setUpdatedRows={setUpdatedRows}
                                setUnsavedChanges={setUnsavedChanges}
                                warehouseId={roleData.data?.roles?.results[0].warehouseId}
                                tables={tables!}
                            />
                        )}
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

Permissions.displayName = 'Permissions';

export { Permissions };
