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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton, ManageAssignmentModal } from '@components';
import { getModesFromPermissions, pathParams, showError, showSuccess } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { MovementModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useMemo, useState } from 'react';
import { movementsRoutes as itemRoutes } from 'modules/Movements/Static/MovementRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
type PageComponent = FC & { layout: typeof MainLayout };

const MovementPages: PageComponent = () => {
    const { permissions, configs, parameters } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<any>([]);
    const [showManageAssignmentModal, setShowManageAssignmentModal] = useState(false);
    const [assignmentManagementLoading, setAssignmentManagementLoading] = useState(false);
    const [selectedMovementsHaveUser, setSelectedMovementsHaveUser] = useState(false);
    const [selectionState, setSelectionState] = useState<'none' | 'assign' | 'unassign' | 'mixed'>(
        'none'
    );
    const [allSelectedHaveValidStatusForAssignment, setAllSelectedHaveValidStatusForAssignment] =
        useState(false);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const toBeProcessedStatusCode = findCodeByScope(
            configs,
            'movement_status',
            'to be processed'
        );
        const processingInCourseStatusCode = findCodeByScope(
            configs,
            'movement_status',
            'processing in course'
        );
        const errorStatusCode = findCodeByScope(configs, 'movement_status', 'error');

        return {
            toBeProcessedStatusCode,
            processingInCourseStatusCode,
            errorStatusCode
        };
    }, [configs, parameters]);

    const headerData: HeaderData = {
        title: t('common:movements'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:movement') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
        checkSelectedRowsStatus(newSelectedRowKeys as string[]);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            name: record.name
        })
    };

    const [isMovementConfirmLoading, setIsMovementConfirmLoading] = useState(false);
    const [isMovementCancelLoading, setIsMovementCancelLoading] = useState(false);
    const [isReprocessErrorsLoading, setIsReprocessErrorsLoading] = useState(false);

    const cancelMovements = () => {
        Modal.confirm({
            title: t('messages:cancel'),
            onOk: async () => {
                setIsMovementCancelLoading(true);
                const movementIds: Array<any> = [];
                selectedRowKeys?.forEach((movementId: 'string') => {
                    movementIds.push(movementId);
                });

                const deleteMutation = gql`
                    mutation deleteMovements($ids: [String!]!, $isHardDelete: Boolean!) {
                        deleteMovements(ids: $ids, isHardDelete: $isHardDelete)
                    }
                `;

                const variables = {
                    ids: movementIds,
                    isHardDelete: false
                };

                try {
                    const result = await graphqlRequestClient.request(deleteMutation, variables);
                    setRefetch((current) => !current);
                    setIsMovementCancelLoading(false);
                    setSelectedRowKeys([]);
                    showSuccess(t('messages:success-canceled'));
                    return result;
                } catch (error) {
                    console.error('Error canceling movement:', error);
                    showError(t('messages:error-cancel-data'));
                    setIsMovementCancelLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const confirmMovement = () => {
        Modal.confirm({
            title: t('messages:validate-movement'),
            onOk: async () => {
                setIsMovementConfirmLoading(true);
                const movementIds: Array<any> = [];
                selectedRowKeys?.forEach((movementId: 'string') => {
                    movementIds.push(movementId);
                });

                const updateMutation = gql`
                    mutation updateMovements($ids: [String!]!, $input: UpdateMovementInput!) {
                        updateMovements(ids: $ids, input: $input)
                    }
                `;

                const variables = {
                    ids: movementIds,
                    input: {
                        status: parseInt(configsParamsCodes.processingInCourseStatusCode)
                    }
                };

                try {
                    const result = await graphqlRequestClient.request(updateMutation, variables);
                    setRefetch((current) => !current);
                    setIsMovementConfirmLoading(false);
                    setSelectedRowKeys([]);
                    return result;
                } catch (error) {
                    console.error('Error updating movement:', error);
                    setIsMovementConfirmLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const reprocessErrors = () => {
        Modal.confirm({
            title: t('messages:reprocess-errors'),
            onOk: async () => {
                const input = {
                    status: parseInt(configsParamsCodes.processingInCourseStatusCode)
                };
                await updateMovements(input, setIsReprocessErrorsLoading);
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const updateMovements = async (input: any, setLoading: (loading: boolean) => void) => {
        setLoading(true);
        const mutation = gql`
            mutation updateMovements($input: UpdateMovementInput!, $ids: [String!]!) {
                updateMovements(input: $input, ids: $ids)
            }
        `;

        const variables = {
            ids: selectedRowKeys,
            input: input
        };

        try {
            const result = await graphqlRequestClient.request(mutation, variables);
            setLoading(false);
            showSuccess(t('messages:success-updated'));
            setRefetch((prev) => !prev);
            setSelectedRowKeys([]);
        } catch (error) {
            showError(t('messages:error-update-data'));
            setLoading(false);
            console.log(error);
        }
    };

    const hasSelected = selectedRowKeys.length > 0;
    const [allSelectedHaveCorrectStatus, setAllSelectedHaveCorrectStatus] = useState(false);
    const [allSelectedCanBeCanceled, setAllSelectedCanBeCanceled] = useState(false);
    const [allSelectedAreInErrorStatus, setAllSelectedAreInErrorStatus] = useState(false);
    const [refetch, setRefetch] = useState<boolean>(false);

    // Check status of selected rows when selection changes
    const checkSelectedRowsStatus = async (selectedIds: any[]) => {
        if (selectedIds.length === 0) {
            setAllSelectedHaveCorrectStatus(false);
            setAllSelectedCanBeCanceled(false);
            setSelectedMovementsHaveUser(false);
            setAllSelectedAreInErrorStatus(false);
            setSelectionState('none');
            setAllSelectedHaveValidStatusForAssignment(false);
            return;
        }

        const query = gql`
            query movements($filters: MovementSearchFilters) {
                movements(filters: $filters, itemsPerPage: 1000) {
                    results {
                        id
                        status
                        assignedUser
                    }
                }
            }
        `;

        const variables = {
            filters: { id: selectedIds }
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            const selectedMovements = result.movements.results;

            const allHaveCorrectStatus = selectedMovements.every(
                (movement: any) =>
                    movement.status === parseInt(configsParamsCodes.toBeProcessedStatusCode)
            );

            // Check status to allow cancellation
            const allCanBeCanceled = selectedMovements.every((movement: any) => {
                const status = movement.status;
                const processingInCourse = parseInt(
                    configsParamsCodes.processingInCourseStatusCode
                );
                return status < processingInCourse;
            });

            // Check status to allow Assignment/Unassignment
            const allHaveValidStatusForAssignment = selectedMovements.every((movement: any) => {
                const status = movement.status;
                const toBeProcessed = parseInt(configsParamsCodes.toBeProcessedStatusCode);
                const processingInCourse = parseInt(
                    configsParamsCodes.processingInCourseStatusCode
                );
                return status >= toBeProcessed && status <= processingInCourse;
            });

            // Check selected movements have assigned user or not
            const movementsWithUser = selectedMovements.filter(
                (movement: any) => movement.assignedUser
            );
            const hasMovementsWithUser = movementsWithUser.length > 0;
            const hasMovementsWithoutUser = movementsWithUser.length < selectedMovements.length;

            // Handle assignment state with priority to unassignment if at least one movement has a user
            const hasUsersToProcess = hasMovementsWithUser;
            const newSelectionState: 'assign' | 'unassign' | 'mixed' =
                hasMovementsWithUser && hasMovementsWithoutUser
                    ? 'mixed'
                    : hasMovementsWithUser
                      ? 'unassign'
                      : 'assign';

            // Handle errors relaunching
            const allAreInErrorStatus = selectedMovements.every(
                (movement: any) => movement.status === parseInt(configsParamsCodes.errorStatusCode)
            );

            setAllSelectedHaveCorrectStatus(allHaveCorrectStatus);
            setAllSelectedCanBeCanceled(allCanBeCanceled);
            setSelectedMovementsHaveUser(hasUsersToProcess);
            setSelectionState(newSelectionState);
            setAllSelectedHaveValidStatusForAssignment(allHaveValidStatusForAssignment);
            setAllSelectedAreInErrorStatus(allAreInErrorStatus);
        } catch (error) {
            console.error('Error checking movement status:', error);
            setAllSelectedHaveCorrectStatus(false);
            setAllSelectedCanBeCanceled(false);
            setSelectedMovementsHaveUser(false);
            setAllSelectedAreInErrorStatus(false);
        }
    };
    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <span className="selected-items-span" style={{ marginLeft: 16 }}>
                        {hasSelected
                            ? `${t('messages:selected-items-number', {
                                  number: selectedRowKeys.length
                              })}`
                            : ''}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={confirmMovement}
                            disabled={!hasSelected || !allSelectedHaveCorrectStatus}
                            loading={isMovementConfirmLoading}
                        >
                            {t('actions:validate-movement')}
                        </Button>
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={() => setShowManageAssignmentModal(true)}
                            disabled={!hasSelected || !allSelectedHaveValidStatusForAssignment}
                            loading={assignmentManagementLoading}
                        >
                            {selectionState === 'unassign'
                                ? t('actions:unassign-users')
                                : selectionState === 'mixed'
                                  ? t('actions:unassign-users')
                                  : t('actions:assign-user')}
                        </Button>
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            danger
                            onClick={cancelMovements}
                            disabled={!hasSelected || !allSelectedCanBeCanceled}
                            loading={isMovementCancelLoading}
                        >
                            {t('actions:cancel')}
                        </Button>
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            danger
                            onClick={reprocessErrors}
                            disabled={!hasSelected || !allSelectedAreInErrorStatus}
                            loading={isReprocessErrorsLoading}
                        >
                            {t('actions:reprocess-error')}
                        </Button>
                    </span>
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
                checkbox={true}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
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
                                model.isSoftDeletable &&
                                record.status < configsParamsCodes.processingInCourseStatusCode ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
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
            <ManageAssignmentModal
                showModal={{
                    showManageAssignmentModal,
                    setShowManageAssignmentModal
                }}
                updateFunction={updateMovements}
                loading={setAssignmentManagementLoading}
                userAssigned={selectedMovementsHaveUser ? 'at least one user' : undefined}
                additionalInfoToUpdate={
                    selectedMovementsHaveUser
                        ? { status: parseInt(configsParamsCodes.toBeProcessedStatusCode) }
                        : undefined
                }
            />
        </>
    );
};

MovementPages.layout = MainLayout;

export default MovementPages;
