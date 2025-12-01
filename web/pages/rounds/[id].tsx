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
import { AppHead, LinkButton, NumberOfPrintsModalV2 } from '@components';
import { RoundModelV2 as model } from 'models/RoundModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { roundsRoutes as itemRoutes } from 'modules/Rounds/Static/roundsRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { RoundDetailsExtra } from 'modules/Rounds/Elements/RoundDetailsExtra';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const RoundPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idsToPrint, setIdsToPrint] = useState<string[]>();
    const [refetch, setRefetch] = useState(false);
    const [startRoundLoading, setStartRoundLoading] = useState(false);
    const { graphqlRequestClient } = useAuth();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:round')} ${data?.name}`;

    const roundsStatusEstimated = parseInt(
        configs.filter((c: any) => c.scope === 'round_status' && c.value === 'Estimated')[0]?.code
    );
    const roundsStatusStarted = parseInt(
        configs.filter((c: any) => c.scope === 'round_status' && c.value === 'Started')[0]?.code
    );

    //This specific request is to sort boxes according to raa order
    const getRoundWithSortedRaa = async () => {
        const query = gql`
            query getRound($id: String!) {
                round(id: $id) {
                    id
                    equipment {
                        printer
                        automaticLabelPrinting
                    }
                    roundAdvisedAddresses(
                        orderBy: [{ fieldName: "roundOrderId", ascending: true }]
                    ) {
                        roundLineDetail {
                            handlingUnitContentOutbounds {
                                handlingUnitOutbound {
                                    id
                                }
                            }
                        }
                    }
                }
            }
        `;
        const variables = { id };
        const round = await graphqlRequestClient.request(query, variables);
        return round;
    };

    const [boxesList, setBoxesList] = useState<Array<string>>([]);
    useEffect(() => {
        const getBoxesBySortedRaa = async () => {
            // Fetch order addresses
            const result = await getRoundWithSortedRaa();
            const tmp_boxes: string[] = [];
            result.round.roundAdvisedAddresses.forEach((raa: any) => {
                raa.roundLineDetail.handlingUnitContentOutbounds.forEach((huco: any) => {
                    tmp_boxes?.push(huco.handlingUnitOutbound.id);
                });
            });
            setBoxesList(tmp_boxes);
        };
        getBoxesBySortedRaa();
    }, [data]);
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
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

    function unassignUser() {
        const updateRound = async () => {
            const unassignUser = gql`
                mutation unassignUser($id: String!, $input: UpdateRoundInput!) {
                    updateRound(id: $id, input: $input) {
                        id
                        assignedUser
                    }
                }
            `;
            const unassignUserVariables = { id, input: { assignedUser: null } };
            await graphqlRequestClient.request(unassignUser, unassignUserVariables);
            showSuccess(t('messages:success-updated'));
            setRefetch((prev) => !prev);
            return;
        };

        Modal.confirm({
            title: t('messages:action-confirm'),
            onOk: async () => await updateRound(),
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    }

    const startRounds = async () => {
        setStartRoundLoading(true);
        const rounds = id ? [{ id: id }] : [];

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
            functionName: 'update_rounds_status',
            event: { input: { rounds: rounds, status: roundsStatusStarted } }
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {data?.status !== configs.ROUND_STATUS_CLOSED ? (
                    <>
                        {data?.status === roundsStatusEstimated ? (
                            <span style={{ marginLeft: 16 }}>
                                <Button
                                    type="primary"
                                    onClick={startRounds}
                                    disabled={data?.status !== roundsStatusEstimated}
                                    loading={startRoundLoading}
                                >
                                    {t('actions:startRound')}
                                </Button>
                            </span>
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={`${rootPath}/edit/${id}`}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isSoftDeletable ? (
                            <Button
                                onClick={() => confirmAction(id as string, setIdToDisable)()}
                                type="primary"
                            >
                                {t('actions:disable')}
                            </Button>
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isDeletable ? (
                            <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </>
                ) : (
                    <></>
                )}
                {/* Unassign user */}
                {data?.assignedUser ? (
                    <Button
                        type="primary"
                        onClick={() => {
                            unassignUser();
                        }}
                    >
                        {t('actions:unassign-user')}
                    </Button>
                ) : (
                    <></>
                )}
                <Button
                    type="primary"
                    ghost
                    onClick={() => {
                        setShowNumberOfPrintsModal(true);
                        setIdsToPrint(boxesList);
                    }}
                >
                    {t('actions:print-boxes-labels')}
                </Button>
                <NumberOfPrintsModalV2
                    showModal={{
                        showNumberOfPrintsModal,
                        setShowNumberOfPrintsModal
                    }}
                    dataToPrint={{ boxes: idsToPrint }}
                    documentName="K_OutboundHandlingUnitLabel"
                    documentReference={data?.name}
                />
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                extraDataComponent={<RoundDetailsExtra roundId={id} />}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={refetch}
            />
        </>
    );
};

RoundPage.layout = MainLayout;

export default RoundPage;

//
