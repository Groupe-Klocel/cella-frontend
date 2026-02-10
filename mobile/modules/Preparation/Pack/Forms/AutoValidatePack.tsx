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

export interface IAutoValidatePackProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    toBePalletized: boolean;
    autoValidateLoading: { [label: string]: any };
    controlManagement: { [label: string]: any };
}

export const AutoValidatePackForm = ({
    processName,
    stepNumber,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading },
    controlManagement: { isToControl, setIsToControl }
}: IAutoValidatePackProps) => {
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
    const { step10, step20, step30, step40, step50, step60 } = storedObject;

    const printer = step10?.data?.printers.code;
    const equipmentHuId = step20?.data?.equipmentHu.id;
    const currentRoundId = step20?.data?.round.id;
    const destinationHuoId = step20?.data?.round?.equipment?.checkPosition
        ? step30?.data?.currentHuos?.[0]?.id
        : step40?.data?.currentHuo?.id;
    const destinationHucoId = step40?.data?.currentHuco?.id;
    const movingQuantity = step50?.data?.movingQuantity;
    const huModelId = step60?.data?.handlingUnitModel?.id;
    const finalWeight = step60?.data?.finalWeight;
    const isForcedClosed = step40?.data?.isBoxForcedClosed || false;

    useEffect(() => {
        const onFinish = async () => {
            const modelInput = {
                printer,
                currentRoundId,
                equipmentHuId,
                destinationHuoId,
                huModelId,
                finalWeight,
                isForcedClosed
            };

            const inputToValidate = isToControl
                ? { ...modelInput, destinationHucoId, movingQuantity }
                : modelInput;
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
                functionName: 'RF_pack_validate',
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
                    showSuccess(t('messages:packed-successfully'));
                    console.log(validateFullBoxResult.executeFunction.output.output, 'output');

                    const storedObject: any = {};
                    const { currentRound, equipmentHu, destinationHuo, isPackValidated } =
                        validateFullBoxResult.executeFunction.output.output;
                    if (isPackValidated) {
                        storedObject['currentStep'] = 20;
                        storedObject['step10'] = step10;
                        dispatch({
                            type: 'UPDATE_BY_PROCESS',
                            processName: processName,
                            object: storedObject
                        });
                        setIsToControl(false);
                        showSuccess(t('messages:pack-round-finished'));
                    } else {
                        storedObject['currentStep'] = 20;
                        storedObject['step10'] = step10;
                        storedObject['step20'] = {
                            ...step20,
                            data: {
                                ...step20?.data,
                                round: currentRound,
                                equipmentHu: equipmentHu,
                                inProgressHuo: destinationHuo ?? undefined,
                                position: currentRound?.equipment?.checkPosition
                                    ? destinationHuo?.roundPosition
                                    : null
                            }
                        };
                        setIsToControl(null);
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

    //AutoValidatePack-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
