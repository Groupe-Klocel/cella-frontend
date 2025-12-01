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
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess,
    showWarning
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { RoundModelV2 as model } from 'models/RoundModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { roundsRoutes as itemRoutes } from 'modules/Rounds/Static/roundsRoutes';
// import { BulkEditRoundsRenderModal } from 'modules/Rounds/Forms/BulkEditRoundsModal';
import { AssignRoundsModal } from 'modules/Rounds/Forms/AssignRoundsModal';
import { EditPriorityRoundsModal } from 'modules/Rounds/Forms/EditPriorityRoundsModal';
import { ConfirmRoundCalculationModal } from 'modules/Rounds/Forms/ConfirmRoundCalculation';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../common/configs.json';
type PageComponent = FC & { layout: typeof MainLayout };

const RoundPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [startRoundLoading, setStartRoundLoading] = useState(false);
    const [assignRoundsLoading, setAssignRoundsLoading] = useState(false);
    const [unassignRoundsLoading, setUnassignRoundsLoading] = useState(false);
    const [editPriorityRoundsLoading, setEditPriorityRoundsLoading] = useState(false);
    const [showAssignRoundsModal, setShowAssignRoundsModal] = useState(false);
    const [showEditPriorityRoundsModal, setShowEditPriorityRoundsModal] = useState(false);
    const [showConfirmRoundCalculationModal, setShowConfirmRoundCalculationModal] = useState(false);
    const { graphqlRequestClient } = useAuth();

    const [isRoundCalculationLoading, setIsRoundCalculationLoading] = useState(false);
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
    const hasSelected = selectedRowKeys.length > 0;
    const [refetch, setRefetch] = useState<boolean>(false);

    const startRounds = async () => {
        const launchRounds = async () => {
            setStartRoundLoading(true);
            const rounds = selectedRowKeys?.map((item) => ({ id: item }));

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
                event: { input: { rounds: rounds, status: configs.ROUND_STATUS_STARTED } }
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
                    console.log(
                        'Backend_message',
                        launchRoundsResult.executeFunction.output.output
                    );
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

        const hasNoStockSelected = selectedRows.some(
            (row) => row.status === configs.ROUND_STATUS_PAS_DE_STOCK_DISPONIBLE
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
            ids: selectedRowKeys,
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

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: any, rows: any) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
        },
        getCheckboxProps: (record: any) => ({
            disabled: ![
                configs.ROUND_STATUS_ESTIMATED,
                configs.ROUND_STATUS_PAS_DE_STOCK_DISPONIBLE
            ].includes(record.status)
        })
    };

    const resetSelection = () => {
        setSelectedRowKeys([]);
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
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
                                onClick={startRounds}
                                disabled={!hasSelected}
                                loading={startRoundLoading}
                            >
                                {t('actions:startRounds')}
                            </Button>
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => setShowAssignRoundsModal(true)}
                                disabled={!hasSelected}
                                loading={assignRoundsLoading}
                            >
                                {t('actions:assignRounds')}
                            </Button>
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => updateRounds({ assignedUser: null }, setUnassignRoundsLoading)}
                                disabled={!hasSelected}
                                loading={unassignRoundsLoading}
                            >
                                {t('actions:unassignRounds')}
                            </Button>
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => setShowEditPriorityRoundsModal(true)}
                                disabled={!hasSelected}
                                loading={editPriorityRoundsLoading}
                            >
                                {t('actions:editPriorityRounds')}
                            </Button>
                        </span>
                        {/* N.B.: commented for later enhancement since it requires additional development to work with round launching on selected rows
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => {
                                    setShowModal(true);
                                }}
                                disabled={!hasSelected}
                                loading={loading}
                            >
                                {t('actions:edit')}
                            </Button>
                        </span>
                        <BulkEditRoundsRenderModal
                            open={showModal}
                            rows={rowSelection}
                            showhideModal={() => {
                                setShowModal(!showModal);
                            }}
                            refetch={refetch}
                            setRefetch={() => {
                                setRefetch(!refetch);
                            }}
                        /> */}
                    </>
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <AssignRoundsModal
                showModal={{
                    showAssignRoundsModal,
                    setShowAssignRoundsModal
                }}
                updateRounds={updateRounds}
                loading={setAssignRoundsLoading}
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
                refetch={refetch}
                checkbox={true}
                searchCriteria={{ category: configs.ROUND_CATEGORY_OUTBOUND }}
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
