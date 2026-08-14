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
import {
    getLastStepWithPreviousStep,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IAutoCloseBoxProps {
    processName: string;
    stepNumber: number;
    closeLoading: { [label: string]: any };
    controlManagement: { [label: string]: any };
}

// Terminal step of the waiting-label resume path: called in place of AutoValidatePackForm when
// the round only holds already-packed boxes whose label is still to be printed (HUO status
// 'Waiting Label'). On mount it runs the backend box-closing function (label printing, round
// status update, deletion of the equipment HU when emptied) on the box selected at the position
// step, passing the packaging/weight reviewed at step 60 (same input names as RF_pack_validate),
// then returns to the round/equipment/position scan (step 20, printer kept) — never to the
// position scan: step 20 accepts the next box's position directly, and a fresh scan re-evaluates
// the round (waiting-label boxes left or not) from up-to-date data.
export const AutoCloseBoxForm = ({
    processName,
    stepNumber,
    closeLoading: { isCloseLoading, setIsCloseLoading },
    controlManagement: { setIsToControl }
}: IAutoCloseBoxProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient } = useAuth();

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const { step10, step20, step30, step60 } = storedObject;

    const printer = step10?.data?.printers?.code;
    const round = step20?.data?.round;
    const equipmentHuId = step20?.data?.equipmentHu?.id;
    const destinationHuo = step30?.data?.currentHuos?.[0];
    const huModelId = step60?.data?.handlingUnitModel?.id;
    const finalWeight = step60?.data?.finalWeight;

    useEffect(() => {
        const onFinish = async () => {
            setIsCloseLoading(true);
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                // box-closing function implemented backend side (functions repository); the
                // input mirrors RF_pack_validate's field names
                functionName: 'RF_pack_close_box',
                event: {
                    input: {
                        printer,
                        currentRoundId: round?.id,
                        equipmentHuId,
                        destinationHuoId: destinationHuo?.id,
                        huModelId,
                        finalWeight
                    }
                }
            };
            try {
                const closeBoxResult = await graphqlRequestClient.request(query, variables);
                if (closeBoxResult.executeFunction.status === 'ERROR') {
                    showError(closeBoxResult.executeFunction.output);
                    onBack();
                } else if (
                    closeBoxResult.executeFunction.status === 'OK' &&
                    closeBoxResult.executeFunction.output.status === 'KO'
                ) {
                    showError(t(`errors:${closeBoxResult.executeFunction.output.output.code}`));
                    console.log('Backend_message', closeBoxResult.executeFunction.output.output);
                    onBack();
                } else {
                    showSuccess(t('messages:box-closed-successfully'));
                    dispatch({
                        type: 'UPDATE_BY_PROCESS',
                        processName,
                        object: { currentStep: 20, step10: storedObject['step10'] }
                    });
                    setIsToControl(null);
                }
                setIsCloseLoading(false);
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                onBack();
                setIsCloseLoading(false);
            }
        };
        onFinish();
    }, []);

    // handle back to previous step settings (re-opens the packaging/weight review)
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    return <WrapperForm>{isCloseLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
