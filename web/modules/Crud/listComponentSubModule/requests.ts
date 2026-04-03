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

import { useEffect } from 'react';
import { gql } from 'graphql-request';
import {
    showError,
    showInfo,
    showSuccess,
    showWarning,
    useDelete,
    useSoftDelete,
    useUpdate
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';

export interface IRequestsHookParams {
    dataModel: any;
    triggerDelete?: any;
    triggerSoftDelete?: any;
    triggerReopen?: any;
    triggerPriorityChange?: any;
    isCreateAMovement?: boolean;
    dataToCreateMovement?: any;
    setSuccessDeleteResult?: any;
    reloadData: () => void;
    listFields: string[];
    permissions: any[];
    data?: any;
    setSort: (sort: any) => void;
}

export const useListRequests = (params: IRequestsHookParams) => {
    const {
        dataModel,
        triggerDelete,
        triggerSoftDelete,
        triggerReopen,
        triggerPriorityChange,
        isCreateAMovement,
        dataToCreateMovement,
        setSuccessDeleteResult,
        reloadData,
        listFields,
        permissions,
        data,
        setSort
    } = params;

    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    // Define pageName to retrieve screen permissions
    const pageName = router.pathname.split('/').filter(Boolean)[0];
    const permissionTableName = 'wm_' + pageName;

    // #region Movement Creation Function
    const createMovement = async (dataToCreateMovement: any, deleteResult: any) => {
        const executeFunctionQuery = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        let executeFunctionVariables = {
            functionName: 'create_movements',
            event: {
                input: {
                    content: dataToCreateMovement.content,
                    type: 'delete',
                    lastTransactionId: deleteResult.transactionId
                }
            }
        };

        const executeFunctionResult = await graphqlRequestClient.request(
            executeFunctionQuery,
            executeFunctionVariables
        );
    };
    // #endregion

    // #region DELETE MUTATION
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(
        dataModel.endpoints.delete,
        triggerPriorityChange
            ? {
                  tableName:
                      dataModel.resolverName.charAt(0).toLowerCase() +
                      dataModel.resolverName.slice(1),
                  orderingField: triggerPriorityChange.orderingField,
                  operation: 'delete',
                  parentId: triggerPriorityChange.parentId
              }
            : undefined,
        isCreateAMovement
    );

    useEffect(() => {
        if (triggerDelete && triggerDelete.idToDelete) {
            const deletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Delete
            );
            if (!deletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callDelete(triggerDelete.idToDelete);
                triggerDelete.setIdToDelete(undefined);
            }
        }
    }, [triggerDelete, permissions, router.pathname, t, callDelete, permissionTableName]);

    useEffect(() => {
        if (deleteLoading) {
            showInfo(t('messages:info-delete-wip'));
        }
    }, [deleteLoading, t]);

    useEffect(() => {
        if (!(deleteResult && deleteResult.data)) return;

        if (deleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            if (setSuccessDeleteResult) setSuccessDeleteResult(deleteResult);
            if (isCreateAMovement) {
                try {
                    createMovement(dataToCreateMovement, deleteResult);
                } catch (error) {
                    console.error('Error creating movement:', error);
                    showError(t('messages:error-creating-movement'));
                }
            }
            reloadData();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [
        deleteResult,
        isCreateAMovement,
        dataToCreateMovement,
        setSuccessDeleteResult,
        reloadData,
        t
    ]);
    // #endregion

    // #region SOFT DELETE MUTATION
    const {
        isLoading: softDeleteLoading,
        result: softDeleteResult,
        mutate: callSoftDelete
    } = useSoftDelete(dataModel.endpoints.delete!);

    useEffect(() => {
        if (triggerSoftDelete && triggerSoftDelete.idToDisable) {
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callSoftDelete(triggerSoftDelete.idToDisable);
                triggerSoftDelete.setIdToDisable(undefined);
            }
        }
    }, [triggerSoftDelete, permissions, router.pathname, t, callSoftDelete, permissionTableName]);

    useEffect(() => {
        if (softDeleteLoading) {
            showInfo(t('messages:info-disabling-wip'));
        }
    }, [softDeleteLoading, t]);

    useEffect(() => {
        if (!(softDeleteResult && softDeleteResult.data)) return;

        if (softDeleteResult.success) {
            showSuccess(t('messages:success-disabled'));
            reloadData();
        } else {
            showError(t('messages:error-disabling-element'));
        }
    }, [softDeleteResult, reloadData, t]);
    // #endregion

    // #region Enable (Re-Open)
    const {
        isLoading: enableLoading,
        result: enableResult,
        mutate: callReopen
    } = useUpdate(dataModel.resolverName, dataModel.endpoints.update, listFields);

    useEffect(() => {
        if (triggerReopen && triggerReopen.reopenInfo) {
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callReopen({
                    id: triggerReopen.reopenInfo.id,
                    input: { status: triggerReopen.reopenInfo.status }
                });
                triggerReopen.setReopenInfo(undefined);
            }
        }
    }, [triggerReopen, permissions, router.pathname, t, callReopen, permissionTableName]);

    useEffect(() => {
        if (enableLoading) {
            showInfo(t('messages:info-enabling-wip'));
        }
    }, [enableLoading, t]);

    useEffect(() => {
        if (!(enableResult && enableResult.data)) return;

        if (enableResult.success) {
            showSuccess(t('messages:success-enabled'));
            reloadData();
        } else {
            showError(t('messages:error-enabling-element'));
        }
    }, [enableResult, reloadData, t]);
    // #endregion

    // #region PRIORITY CHANGE MUTATION
    useEffect(() => {
        if (triggerPriorityChange?.orderingField) {
            setSort([{ field: triggerPriorityChange.orderingField, ascending: true }]);
        }
    }, [triggerPriorityChange, setSort]);

    useEffect(() => {
        if (
            triggerPriorityChange &&
            triggerPriorityChange.id &&
            data?.[dataModel.endpoints.list]?.results?.length > 0
        ) {
            const updateWithOrder = gql`
                mutation executeFunction($id: String!) {
                    executeFunction(
                        functionName: "reorder_priority"
                        event: {
                            input: {
                                ids: $id
                                tableName: "${dataModel.resolverName.charAt(0).toLowerCase() + dataModel.resolverName.slice(1)}"
                                orderingField: "${triggerPriorityChange.orderingField}"
                                operation: "update"
                                parentId: "${triggerPriorityChange.parentId}"
                                newOrder: ${triggerPriorityChange.newOrder}
                            }
                        }
                    ) {
                        status
                        output
                    }
                }
            `;
            graphqlRequestClient
                .request(updateWithOrder, {
                    id: triggerPriorityChange.id
                })
                .then((result: any) => {
                    if (result.executeFunction.status === 'ERROR') {
                        showError(result.executeFunction.output);
                    } else if (
                        result.executeFunction.status === 'OK' &&
                        result.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${result.executeFunction.output.output.code}`));
                        console.log('Backend_message', result.executeFunction.output.output);
                    } else {
                        console.log('Priority change successful');
                        reloadData();
                    }
                    triggerPriorityChange.setId({
                        id: null,
                        newOrder: null
                    });
                })
                .catch((error: any) => {
                    console.error('Error during priority change:', error);
                    showError(t('messages:error-priority-change'));
                    triggerPriorityChange.setId({
                        id: null,
                        newOrder: null
                    });
                });
        }
    }, [triggerPriorityChange, data, dataModel, graphqlRequestClient, reloadData, t]);
    // #endregion

    return {
        // Delete hooks
        deleteLoading,
        deleteResult,
        callDelete,
        // Soft Delete hooks
        softDeleteLoading,
        softDeleteResult,
        callSoftDelete,
        // Enable hooks
        enableLoading,
        enableResult,
        callReopen,
        // Utility functions
        createMovement
    };
};
