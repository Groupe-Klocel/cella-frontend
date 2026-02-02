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
import { WrapperForm, ContentSpin } from '@components';
import { showError } from '@helpers';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { Modal } from 'antd';

export interface IRoundOrHuOrPositionChecksProps {
    dataToCheck: any;
}

export const RoundOrHuOrPositionCheck = ({ dataToCheck }: IRoundOrHuOrPositionChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient, user } = useAuth();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { parameters, configs } = useAppState();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fetchResult, setFetchResult] = useState<any>();

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const equipmentHuType = findCodeByScope(parameters, 'handling_unit_type', 'EQUIPMENT');

        const packingWithControlInprogressHuoStatus = findCodeByScope(
            configs,
            'handling_unit_outbound_status',
            'Packing with control in progress'
        );

        const roundStatusToBePacked = parseInt(
            findCodeByScope(configs, 'round_status', 'To be packed')
        );
        const roundStatusPackingInProgress = parseInt(
            findCodeByScope(configs, 'round_status', 'Packing in progress')
        );
        return {
            equipmentHuType,
            packingWithControlInprogressHuoStatus,
            roundStatusToBePacked,
            roundStatusPackingInProgress
        };
    }, [parameters, configs]);

    const equipmentHuType = parseInt(configsParamsCodes.equipmentHuType);
    const packingWithControlInprogressHuoStatus = parseInt(
        configsParamsCodes.packingWithControlInprogressHuoStatus
    );

    async function scanRoundOrEquipment(scannedItem: any) {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_scan_round_or_equipment_or_position',
            event: {
                input: { scannedItem }
            }
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            return result;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const response: any = await scanRoundOrEquipment(scannedInfo);
                setFetchResult(response.executeFunction.output.response);
                if (response.executeFunction.status === 'ERROR') {
                    showError(response.executeFunction.output);
                } else if (
                    response.executeFunction.status === 'OK' &&
                    response.executeFunction.output.status === 'KO'
                ) {
                    if (response.executeFunction.output.output.code === 'FAPI_000001') {
                        showError(t('errors:FAPI_000001'));
                    } else if (response.executeFunction.output.output.code === 'FAPI_000002') {
                        showError(t('errors:FAPI_000002'));
                    } else if (response.executeFunction.output.output.code === 'FAPI_000003') {
                        showError(t('errors:FAPI_000003'));
                    } else {
                        showError(t(`errors:${response.executeFunction.output.output.code}`));
                        console.log('Backend_message', response.executeFunction.output.output);
                    }
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    useEffect(() => {
        if (fetchResult) {
            const processResult = async () => {
                if (
                    fetchResult?.round?.assignedUser &&
                    fetchResult.round.assignedUser !== user.username
                ) {
                    showError(
                        t('messages:round-already-assigned-to', {
                            name: fetchResult?.round?.assignedUser
                        })
                    );
                    setIsLoading(false);
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }

                const updateRoundIfNeeded = async () => {
                    // if the round is not assigned, we assign it to the current user
                    const updateRoundMutation = gql`
                        mutation updateRound($id: String!, $input: UpdateRoundInput!) {
                            updateRound(id: $id, input: $input) {
                                id
                                status
                                assignedUser
                            }
                        }
                    `;
                    const updateRoundVariables = {
                        id: fetchResult?.round?.id,
                        input: {
                            assignedUser: user.username
                        }
                    };

                    const updateRoundResult = await graphqlRequestClient.request(
                        updateRoundMutation,
                        updateRoundVariables
                    );
                    fetchResult.round.assignedUser = updateRoundResult.updateRound.assignedUser;
                    console.log('updateRoundResult', updateRoundResult);
                };

                if (!fetchResult?.round?.assignedUser) {
                    await updateRoundIfNeeded();
                }

                setIsLoading(false);

                let data = { ...fetchResult };

                if (fetchResult?.round?.status == configsParamsCodes.roundStatusToBePacked) {
                    const query = gql`
                        mutation executeFunction($functionName: String!, $event: JSON!) {
                            executeFunction(functionName: $functionName, event: $event) {
                                status
                                output
                            }
                        }
                    `;

                    let roundIds = [{ id: fetchResult?.round?.id }];

                    const variables = {
                        functionName: 'update_rounds_status',
                        event: {
                            input: {
                                rounds: roundIds,
                                status: configsParamsCodes.roundStatusPackingInProgress
                            }
                        }
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
                            dispatch({
                                type: 'UPDATE_BY_STEP',
                                processName,
                                stepName: `step${stepNumber}`,
                                object: { ...storedObject[`step${stepNumber}`], data },
                                customFields: [{ key: 'currentStep', value: stepNumber }]
                            });
                        }
                    } catch (error) {
                        showError(t('messages:error-executing-function'));
                        console.log('executeFunctionError', error);
                    }
                } else {
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: { ...storedObject[`step${stepNumber}`], data },
                        customFields: [{ key: 'currentStep', value: stepNumber }]
                    });
                }

                if (
                    data?.round?.handlingUnitOutbounds &&
                    data.round.handlingUnitOutbounds.length !== 0
                ) {
                    data['inProgressHuo'] = data?.round?.handlingUnitOutbounds
                        ?.filter((huo: any) => huo.handlingUnit?.type !== equipmentHuType)
                        .find((huo: any) => huo.status === packingWithControlInprogressHuoStatus);
                }

                // Control if position scanned while inProgressHuo exist and position mismatch
                if (fetchResult?.responseType === 'equipment_hu+position' && data.inProgressHuo) {
                    const scannedPosition = parseInt(fetchResult.position);
                    const inProgressPosition = data.inProgressHuo.roundPosition;
                    if (scannedPosition !== inProgressPosition) {
                        Modal.confirm({
                            title: t('messages:position-mismatch-confirm'),
                            content: t('messages:scanned-position-different-from-inprogress', {
                                scanned: scannedPosition,
                                expected: inProgressPosition
                            }),
                            onOk: () => {
                                dispatch({
                                    type: 'UPDATE_BY_STEP',
                                    processName,
                                    stepName: `step${stepNumber}`,
                                    object: { ...storedObject[`step${stepNumber}`], data },
                                    customFields: [{ key: 'currentStep', value: stepNumber }]
                                });
                            },
                            onCancel: () => {
                                setResetForm(true);
                                setScannedInfo(undefined);
                            },
                            okText: t('messages:confirm'),
                            cancelText: t('messages:cancel')
                        });
                        return;
                    }
                }

                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: { ...storedObject[`step${stepNumber}`], data },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            };

            processResult();
        }
    }, [fetchResult]);

    return <WrapperForm>{scannedInfo || isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
