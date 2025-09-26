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
import { useEffect, useState } from 'react';
import { ContentSpin, HeaderContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Alert, Modal } from 'antd';
import { getModesFromPermissions, showError, showSuccess, useGetRoles } from '@helpers';
import { useAppState } from 'context/AppContext';
import {
    ModeEnum,
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

const ScreenPermissions = ({ roleId, roleName }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Permission);
    const [enableUpdate, setEnableUpdate] = useState<any>();
    const [mobileUpdatedRows, setMobileUpdatedRows] = useState<any>();
    const [wmUpdatedRows, setWmUpdatedRows] = useState<any>();
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
            breadcrumbName: t('common:screenPermissions')
        }
    ];

    // Update
    const { mutate: updateMutate, isPending: softDeleteLoading } = useUpdateRoleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateRoleMutation,
                _variables: UpdateRoleMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-updated'));
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
        const getPermissions = (rows: any) =>
            Object.values(rows || {}).flatMap((row: any) =>
                Object.entries(row)
                    .filter(([mode, value]) => value === true && mode !== 'key')
                    .map(([mode]) => ({
                        table: row.key,
                        mode: mode.toUpperCase() as ModeEnum
                    }))
            );

        const updatedPermissions = [
            ...getPermissions(mobileUpdatedRows),
            ...getPermissions(wmUpdatedRows)
        ];

        updateRole({
            id: roleId,
            permissions: updatedPermissions
        });
    };

    //To render Simple tables list
    const tablesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'screen',
        language: router.locale
    });

    const [mobileTables, setMobileTables] = useState<any>();
    const [wmTables, setWmTables] = useState<any>();
    useEffect(() => {
        if (tablesList) {
            tablesList?.data?.listConfigsForAScope.sort(
                (a, b) =>
                    a.code.split('_')[0].localeCompare(b.code.split('_')[0]) ||
                    a.text.localeCompare(b.text)
            );
            setMobileTables(
                tablesList?.data?.listConfigsForAScope.filter(
                    (table: any) => table.code.split('_')[0] === 'mobile'
                )
            );
            setWmTables(
                tablesList?.data?.listConfigsForAScope.filter(
                    (table: any) => table.code.split('_')[0] === 'wm'
                )
            );
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
                            title={roleName + ' - ' + t('common:screenPermissions')}
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
                        {mobileTables && wmTables && (
                            <div style={{ padding: '0 20px' }}>
                                <h2>{t('d:mobile') + ' ' + t('common:permissions')}</h2>
                                <PermissionList
                                    searchCriteria={{ roleId: roleId }}
                                    setEnableUpdate={setEnableUpdate}
                                    updatedRows={mobileUpdatedRows}
                                    setUpdatedRows={setMobileUpdatedRows}
                                    setUnsavedChanges={setUnsavedChanges}
                                    warehouseId={roleData.data?.roles?.results[0].warehouseId}
                                    tables={mobileTables!}
                                />

                                <h2>WM {t('common:permissions')}</h2>
                                <PermissionList
                                    searchCriteria={{ roleId: roleId }}
                                    setEnableUpdate={setEnableUpdate}
                                    updatedRows={wmUpdatedRows}
                                    setUpdatedRows={setWmUpdatedRows}
                                    setUnsavedChanges={setUnsavedChanges}
                                    warehouseId={roleData.data?.roles?.results[0].warehouseId}
                                    tables={wmTables!}
                                />
                            </div>
                        )}
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

ScreenPermissions.displayName = 'ScreenPermissions';

export { ScreenPermissions };
