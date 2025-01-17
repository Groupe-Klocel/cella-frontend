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
    showSuccess
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
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [startRoundLoading, setStartRoundLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { graphqlRequestClient } = useAuth();

    const [isRoundCalculationLoading, setIsRoundCalculationLoading] = useState(false);
    const confirmRoundCalculation = () => {
        return () => {
            Modal.confirm({
                title: t('messages:round-calculation-confirm'),
                onOk: async () => {
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
                        event: {}
                    };
                    try {
                        const launchRoundsResult = await graphqlRequestClient.request(
                            query,
                            variables
                        );
                        if (launchRoundsResult.executeFunction.status === 'ERROR') {
                            showError(launchRoundsResult.executeFunction.output);
                        } else if (
                            launchRoundsResult.executeFunction.status === 'OK' &&
                            launchRoundsResult.executeFunction.output.status === 'KO'
                        ) {
                            showError(
                                t(`errors:${launchRoundsResult.executeFunction.output.output.code}`)
                            );
                            console.log(
                                'Backend_message',
                                launchRoundsResult.executeFunction.output.output
                            );
                        } else {
                            showSuccess(t('messages:success-round-calculation'));
                            setRefetch(true);
                        }
                        setIsRoundCalculationLoading(false);
                    } catch (error) {
                        showError(t('messages:error-executing-function'));
                        console.log('executeFunctionError', error);
                        setIsRoundCalculationLoading(false);
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const headerData: HeaderData = {
        title: t('common:rounds'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <>
                    <Button
                        type="primary"
                        onClick={confirmRoundCalculation()}
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
    // Checkbox
    const startRounds = async () => {
        setStartRoundLoading(true);
        const rounds = selectedRowKeys?.map((item) => ({ id: item }));

        //TODO: Call mutation
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: 'K_updateRoundsStatus',
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

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled: record.status != configs.ROUND_STATUS_ESTIMATED ? true : false
        })
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <>
                        <span style={{ marginLeft: 16 }}>
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
            <AppHead title={META_DEFAULTS.title} />
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
