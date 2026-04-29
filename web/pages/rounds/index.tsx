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
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, pathParams, showError, showSuccess, showWarning } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { RoundModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useMemo, useState } from 'react';
import { roundsRoutes as itemRoutes } from 'modules/Rounds/Static/roundsRoutes';
import { ManageAssignmentModal } from 'components/common/smart/Modals/ManageAssignmentModal';
import { EditPriorityRoundsModal } from 'modules/Rounds/Forms/EditPriorityRoundsModal';
import { ConfirmRoundCalculationModal } from 'modules/Rounds/Forms/ConfirmRoundCalculation';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
type PageComponent = FC & { layout: typeof MainLayout };

const RoundPages: PageComponent = () => {
    const { permissions, configs, parameters } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [tableData, setTableData] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [startRoundLoading, setStartRoundLoading] = useState(false);
    const [editPriorityRoundsLoading, setEditPriorityRoundsLoading] = useState(false);
    const [showManageAssignmentModal, setShowManageAssignmentModal] = useState(false);
    const [showEditPriorityRoundsModal, setShowEditPriorityRoundsModal] = useState(false);
    const [showConfirmRoundCalculationModal, setShowConfirmRoundCalculationModal] = useState(false);
    const { graphqlRequestClient } = useAuth();
    const [allSelectedHaveValidStatusForAssignment, setAllSelectedHaveValidStatusForAssignment] =
        useState(false);
    const [assignmentManagementLoading, setAssignmentManagementLoading] = useState(false);
    const [selectionState, setSelectionState] = useState<'none' | 'assign' | 'unassign' | 'mixed'>(
        'none'
    );
    const [allSelectedCanBeStartRounds, setAllSelectedCanBeStartRounds] = useState(false);
    const [allCanBeEdited, setAllCanBeEdited] = useState(false);
    const [selectedRoundsHaveUser, setSelectedRoundsHaveUser] = useState(false);

    const [isRoundCalculationLoading, setIsRoundCalculationLoading] = useState(false);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const estimatedStatusCode = findCodeByScope(configs, 'round_status', 'Estimated');
        const startedStatusCode = findCodeByScope(configs, 'round_status', 'Started');
        const pasDeStockDisponibleStatusCode = findCodeByScope(
            configs,
            'round_status',
            'Pas de stock disponible'
        );
        const roundCategoryOutboundCode = findCodeByScopeAndValue(
            configs,
            'round_category',
            'Outbound'
        );
        const inPreparationStatusCode = findCodeByScope(configs, 'round_status', 'In preparation');
        const toBePackedStatusCode = findCodeByScope(configs, 'round_status', 'To be packed');
        const packingInProgressStatusCode = findCodeByScope(
            configs,
            'round_status',
            'Packing in progress'
        );

        return {
            estimatedStatusCode,
            startedStatusCode,
            pasDeStockDisponibleStatusCode,
            inPreparationStatusCode,
            toBePackedStatusCode,
            packingInProgressStatusCode,
            roundCategoryOutboundCode
        };
    }, [configs, parameters]);

    const roundCalculation = async (input: string | null) => {
        setIsRoundCalculationLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: 'estimate_rounds',
            event: { input }
        };
        try {
            const launchRoundsResult = await graphqlRequestClient.request(query, variables);
            if (launchRoundsResult.executeFunction.status === 'ERROR') {
                showError(launchRoundsResult.executeFunction.output);
            } else if (
                launchRoundsResult.executeFunction.status === 'OK' &&
                launchRoundsResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${launchRoundsResult.executeFunction.output.output.code}`));
                console.log('Backend_message', launchRoundsResult.executeFunction.output.output);
            } else {
                if (launchRoundsResult.executeFunction.output.output?.code == 200) {
                    showSuccess(
                        t('messages:rounds-created', {
                            nb:
                                launchRoundsResult.executeFunction.output.output.variables
                                    .roundCalculationNumber +
                                ' : ' +
                                launchRoundsResult.executeFunction.output.output.variables
                                    .nbRoundsCreated
                        })
                    );
                } else {
                    showWarning(t('messages:no-round-created'));
                }
                setRefetch(true);
            }
            setIsRoundCalculationLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsRoundCalculationLoading(false);
        }
    };

    const headerData: HeaderData = {
        title: t('common:rounds'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <>
                    <Button
                        type="primary"
                        onClick={() => setShowConfirmRoundCalculationModal(true)}
                        loading={isRoundCalculationLoading}
                    >
                        {t('actions:roundCalculation')}
                    </Button>
                </>
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    const hasSelected = selectedRows.length > 0;
    const [refetch, setRefetch] = useState<boolean>(false);

    const launchRounds = async () => {
        setStartRoundLoading(true);
        const rounds = selectedRows?.map((item) => ({ id: item.id }));

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: 'update_rounds_status',
            event: {
                input: { rounds: rounds, status: Number(configsParamsCodes.startedStatusCode) }
            }
        };
        try {
            const launchRoundsResult = await graphqlRequestClient.request(query, variables);
            if (launchRoundsResult.executeFunction.status === 'ERROR') {
                showError(launchRoundsResult.executeFunction.output);
                console.log('Backend_message', launchRoundsResult.executeFunction);
            } else if (
                launchRoundsResult.executeFunction.status === 'OK' &&
                launchRoundsResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${launchRoundsResult.executeFunction.output.output.code}`));
                console.log('Backend_message', launchRoundsResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-round-start'));
                setRefetch(true);
            }
            setStartRoundLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setStartRoundLoading(false);
        }
    };

    const startRounds = async () => {
        const hasNoStockSelected = selectedRows.some(
            (row) => row.status === Number(configsParamsCodes.pasDeStockDisponibleStatusCode)
        );

        if (hasNoStockSelected) {
            Modal.confirm({
                title: t('messages:rounds-with-no-stock-status-confirm'),

                onOk: () => {
                    launchRounds();
                },

                okText: t('messages:confirm'),

                cancelText: t('messages:cancel')
            });
        } else {
            launchRounds();
        }
    };

    const updateRounds = async (input: any, setLoading: (loading: boolean) => void) => {
        setLoading(true);
        const mutation = gql`
            mutation updateRounds($input: UpdateRoundInput!, $ids: [String!]!) {
                updateRounds(input: $input, ids: $ids)
            }
        `;

        const variables = {
            ids: selectedRows.map((row) => row.id),
            input: input
        };

        try {
            const result = await graphqlRequestClient.request(mutation, variables);
            setLoading(false);
            showSuccess(t('messages:success-updated'));
            resetSelection();
            setRefetch((prev) => !prev);
        } catch (error) {
            showError(t('messages:error-update-data'));
            setLoading(false);
            console.log(error);
        }
    };

    const onSelectChange = (newSelectedRows: any[]) => {
        selectedRows.forEach((infos: any) => {
            if (
                !newSelectedRows.map((NSR) => NSR.id).includes(infos.id) &&
                tableData.map((d) => d.id).includes(infos.id)
            ) {
                setSelectedRows((prevKeys: any) => prevKeys.filter((k: any) => k.id !== infos.id));
            }
        });
        newSelectedRows.forEach((value: any) => {
            if (!selectedRows?.map((SR) => SR.id).includes(value.id)) {
                setSelectedRows((prevKeys: React.Key[]) => [...prevKeys, value]);
            }
        });
    };

    useEffect(() => {
        if (selectedRows && selectedRows.length > 0) {
            checkSelectedRowsStatus(selectedRows);
        }
    }, [selectedRows]);

    const rowSelection = {
        selectedRows,
        onChange: (keys: React.Key[], rows: any[]) => onSelectChange(rows),
        getCheckboxProps: (record: any) => ({
            name: record.name
        })
    };

    const resetSelection = () => {
        setSelectedRows([]);
    };

    const checkSelectedRowsStatus = async (selectedInfos: any[]) => {
        const selectedIds = selectedInfos.map((info) => info.id);
        if (selectedIds.length === 0) {
            setAllSelectedCanBeStartRounds(false);
            setAllCanBeEdited(false);
            setSelectedRoundsHaveUser(false);
            setSelectionState('none');
            setAllSelectedHaveValidStatusForAssignment(false);
            return;
        }

        const query = gql`
            query rounds($filters: RoundSearchFilters) {
                rounds(filters: $filters, itemsPerPage: 1000) {
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
            const selectedRounds = result.rounds.results;

            const allCanBeEdited = selectedRounds.every((round: any) => {
                const status = round.status;
                const pasDeStockDisponible = parseInt(
                    configsParamsCodes.pasDeStockDisponibleStatusCode
                );
                const estimated = parseInt(configsParamsCodes.estimatedStatusCode);
                const startedStatusCode = parseInt(configsParamsCodes.startedStatusCode);
                const inPreparationStatusCode = parseInt(
                    configsParamsCodes.inPreparationStatusCode
                );
                return (
                    status == startedStatusCode ||
                    status == inPreparationStatusCode ||
                    status == estimated ||
                    status == pasDeStockDisponible
                );
            });

            // Check status to allow modify priority
            const allCanBeStartRounds = selectedRounds.every((round: any) => {
                const status = round.status;
                const estimated = parseInt(configsParamsCodes.estimatedStatusCode);
                const pasDeStockDisponible = parseInt(
                    configsParamsCodes.pasDeStockDisponibleStatusCode
                );
                return status == pasDeStockDisponible || status == estimated;
            });

            // Check status to allow Assignment/Unassignment
            const allHaveValidStatusForAssignment = selectedRounds.every((round: any) => {
                const status = round.status;
                const startedStatusCode = parseInt(configsParamsCodes.startedStatusCode);
                const inPreparationStatusCode = parseInt(
                    configsParamsCodes.inPreparationStatusCode
                );
                const toBePackedStatusCode = parseInt(configsParamsCodes.toBePackedStatusCode);
                const packingInProgressStatusCode = parseInt(
                    configsParamsCodes.packingInProgressStatusCode
                );
                return (
                    status == startedStatusCode ||
                    status == inPreparationStatusCode ||
                    status == toBePackedStatusCode ||
                    status == packingInProgressStatusCode
                );
            });

            // Check selected movements have assigned user or not
            const roundsWithUser = selectedRounds.filter((round: any) => round.assignedUser);
            const hasRoundsWithUser = roundsWithUser.length > 0;
            const hasRoundsWithoutUser = roundsWithUser.length < selectedRounds.length;
            // Handle assignment state with priority to unassignment if at least one movement has a user
            const hasUsersToProcess = hasRoundsWithUser;
            const newSelectionState: 'assign' | 'unassign' | 'mixed' =
                hasRoundsWithUser && hasRoundsWithoutUser
                    ? 'mixed'
                    : hasRoundsWithUser
                      ? 'unassign'
                      : 'assign';

            setAllSelectedCanBeStartRounds(allCanBeStartRounds);
            setAllCanBeEdited(allCanBeEdited);
            setSelectedRoundsHaveUser(hasUsersToProcess);
            setSelectionState(newSelectionState);
            setAllSelectedHaveValidStatusForAssignment(allHaveValidStatusForAssignment);
        } catch (error) {
            console.error('Error checking movement status:', error);
            setAllSelectedCanBeStartRounds(false);
            setAllCanBeEdited(false);
            setSelectedRoundsHaveUser(false);
        }
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <>
                        <span className="selected-items-span" style={{ marginLeft: 16 }}>
                            {hasSelected
                                ? `${t('messages:selected-items-number', {
                                      number: selectedRows.length
                                  })}`
                                : ''}
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={startRounds}
                                disabled={!hasSelected || !allSelectedCanBeStartRounds}
                                loading={startRoundLoading}
                            >
                                {t('actions:startRounds')}
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
                                type="primary"
                                onClick={() => setShowEditPriorityRoundsModal(true)}
                                disabled={!hasSelected || !allCanBeEdited}
                                loading={editPriorityRoundsLoading}
                            >
                                {t('actions:editPriorityRounds')}
                            </Button>
                        </span>
                    </>
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ManageAssignmentModal
                showModal={{
                    showManageAssignmentModal,
                    setShowManageAssignmentModal
                }}
                updateFunction={updateRounds}
                loading={setAssignmentManagementLoading}
                userAssigned={selectedRoundsHaveUser ? 'at least one user' : undefined}
                additionalInfoToUpdate={{}}
            />
            <EditPriorityRoundsModal
                showModal={{
                    showEditPriorityRoundsModal,
                    setShowEditPriorityRoundsModal
                }}
                updateRounds={updateRounds}
                loading={setEditPriorityRoundsLoading}
            />
            <ConfirmRoundCalculationModal
                showModal={{
                    showConfirmRoundCalculationModal,
                    setShowConfirmRoundCalculationModal
                }}
                roundCalculation={roundCalculation}
            />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                setData={setTableData}
                refetch={refetch}
                checkbox={true}
                searchCriteria={{ category: configsParamsCodes.roundCategoryOutboundCode }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
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
                                model.isSoftDeletable ? (
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
        </>
    );
};

RoundPages.layout = MainLayout;

export default RoundPages;
