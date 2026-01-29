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
import { getLastStepWithPreviousStep, showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IAutoValidatePickProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    toBePalletized: boolean;
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidatePickForm = ({
    processName,
    stepNumber,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidatePickProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient, user } = useAuth();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);
    // retrieve values for update contents/boxline and create movement
    const { step5, step10, step15, step30, step40, step50, step60, step70 } = storedObject;

    const initialIgnoreHUContentIds = storedObject.ignoreHUContentIds || [];
    const proposedRoundAdvisedAddresses = step10?.data?.proposedRoundAdvisedAddresses;
    const round = step10?.data?.round;
    const hu = step15?.data?.handlingUnit;
    const huType = step15?.data?.handlingUnitType;
    const pickedLocation = step30?.data.chosenLocation;
    const pickedHU = step40?.data.handlingUnit;
    const isHUToCreate = step15?.data?.isHUToCreate;
    const articleInfo = step50?.data.article;
    const features = step60?.data?.processedFeatures;
    const huc = step60?.data.content;
    const movingQuantity = step70?.data?.movingQuantity;

    const movementInput = {
        originalLocationIdStr: pickedLocation.id,
        originalLocationNameStr: pickedLocation.name,
        originalHandlingUnitIdStr: pickedHU.id,
        originalHandlingUnitNameStr: pickedHU.name,
        originalContentIdStr: huc.id,
        articleIdStr: articleInfo.id,
        articleNameStr: articleInfo.name,
        features: features,
        movingQuantity,
        finalHandlingUnitIdStr: isHUToCreate ? undefined : hu.id,
        finalHandlingUnitNameStr: isHUToCreate ? hu : hu.name,
        roundName: round.name
    };

    const currentRoundInfo = {
        id: round.id,
        roundAdvisedAddresses:
            proposedRoundAdvisedAddresses?.map(
                ({
                    id,
                    quantity,
                    roundLineDetailId
                }: {
                    id: string;
                    quantity: number;
                    roundLineDetailId: string;
                }) => ({ id, quantity, roundLineDetailId })
            ) || []
    };

    useEffect(() => {
        const onFinish = async () => {
            //check if assigned user is still good

            const assignedUserQuery = gql`
                query round($id: String!) {
                    round(id: $id) {
                        id
                        assignedUser
                    }
                }
            `;

            const assignedUserVariables = {
                id: round.id
            };

            const selectedRound = await graphqlRequestClient.request(
                assignedUserQuery,
                assignedUserVariables
            );

            if (
                selectedRound.round.assignedUser &&
                selectedRound.round.assignedUser !== user.username
            ) {
                showError(
                    t('messages:round-already-assigned-to', {
                        name: selectedRound.round.assignedUser
                    })
                );
                onBack();
                return;
            }

            const inputToValidate = {
                movementInput,
                currentRoundInfo
            };
            //For HU creation : look at the ValidateRoundPacking API
            setIsAutoValidateLoading(true);
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                functionName: 'RF_pick_validate',
                event: {
                    input: inputToValidate
                }
            };
            try {
                const validateFullBoxResult = await graphqlRequestClient.request(query, variables);
                if (validateFullBoxResult.executeFunction.status === 'ERROR') {
                    showError(validateFullBoxResult.executeFunction.output);
                    onBack();
                    setIsAutoValidateLoading(false);
                } else if (
                    validateFullBoxResult.executeFunction.status === 'OK' &&
                    validateFullBoxResult.executeFunction.output.status === 'KO'
                ) {
                    showError(
                        t(`errors:${validateFullBoxResult.executeFunction.output.output.code}`)
                    );
                    console.log(
                        'Backend_message',
                        validateFullBoxResult.executeFunction.output.output
                    );
                    onBack();
                    setIsAutoValidateLoading(false);
                } else {
                    showSuccess(t('messages:picked-successfully'));
                    console.log(validateFullBoxResult.executeFunction.output.output, 'output');

                    const storedObject: any = {};
                    const { updatedRound, isPickValidated, equipmentHu } =
                        validateFullBoxResult.executeFunction.output.output;
                    if (isPickValidated) {
                        if (step5.data && step10.data.roundNumber !== 1) {
                            storedObject['currentStep'] = 10;
                            storedObject[`step5`] = { previousStep: 0, data: step5.data };
                            storedObject[`step10`] = { previousStep: 5 };
                        } else if (step5.data && step10.data.roundNumber === 1) {
                            storedObject['currentStep'] = 5;
                            storedObject[`step5`] = { previousStep: 0 };
                        } else {
                            storedObject['currentStep'] = 10;
                            storedObject[`step10`] = { previousStep: 0 };
                        }
                        dispatch({
                            type: 'UPDATE_BY_PROCESS',
                            processName: processName,
                            object: storedObject
                        });
                        showSuccess(t('messages:pick-round-finished'));
                    } else {
                        let ignoreHUContentIds = initialIgnoreHUContentIds || [];
                        let remainingHUContentIds = updatedRound.roundAdvisedAddresses
                            .filter((raa: any) => {
                                return !ignoreHUContentIds.includes(raa.handlingUnitContentId);
                            })
                            .filter((raa: any) => raa.quantity != 0);

                        if (remainingHUContentIds.length === 0) {
                            ignoreHUContentIds = [];
                            remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
                                (raa: any) => raa.quantity != 0
                            );
                        }

                        const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses
                            .filter((raa: any) => raa.quantity != 0)
                            .filter(
                                (raa: any) =>
                                    raa.handlingUnitContentId ===
                                    remainingHUContentIds[0]?.handlingUnitContentId
                            );

                        interface DataType {
                            proposedRoundAdvisedAddresses: any;
                            pickAndPackType: string;
                            round: any;
                            currentShippingPalletId: any;
                            roundNumber?: number;
                        }

                        const data: DataType = {
                            proposedRoundAdvisedAddresses: updatedRound.equipment.checkPosition
                                ? [roundAdvisedAddresses[0]]
                                : roundAdvisedAddresses,
                            pickAndPackType: updatedRound.equipment.checkPosition
                                ? 'detail'
                                : 'fullBox',
                            round: updatedRound,
                            currentShippingPalletId: updatedRound.extraText1
                        };
                        if (step10.roundNumber) {
                            data['roundNumber'] = step10.roundNumber;
                        }
                        const dataStep15 = {
                            handlingUnit: equipmentHu,
                            handlingUnitType: huType,
                            isHUToCreate: false
                        };

                        if (step5) {
                            storedObject[`step5`] = { previousStep: 0, data: step5.data };
                        }
                        storedObject[`step10`] = { previousStep: step5 ? 5 : 0, data };
                        storedObject[`step15`] = { previousStep: 10, data: dataStep15 };
                        storedObject.ignoreHUContentIds = ignoreHUContentIds;
                        storedObject.currentStep = 20;
                        dispatch({
                            type: 'UPDATE_BY_PROCESS',
                            processName: processName,
                            object: storedObject
                        });
                    }
                }
                setIsAutoValidateLoading(false);
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                onBack();
                setIsAutoValidateLoading(false);
            }
        };
        onFinish();
    }, []);

    //AutoValidatePick-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
