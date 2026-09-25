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
//DESCRIPTION: after packaging + actual weight entry (consolidation), validates back-end:
// theoretical weight calculation, KloShip cancellation and CELLA deletion of the consolidated
// boxes, movements "Manual packing", HUO/HUCO status update to WAITING LABEL and label printing
// (the standard hooks then bring the box to its next status). Then returns to the box scan
// (printer is kept).

import { WrapperForm, ContentSpin } from '@components';
import { getLastStepWithPreviousStep, showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IAutoValidateConsolidationProps {
    processName: string;
    stepNumber: number;
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidateConsolidationForm = ({
    processName,
    stepNumber,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidateConsolidationProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const { step10, step20, step80, step90 } = storedObject;

    const printer = step10?.data?.printers?.code;
    const originalBox = step20?.data?.originalBox;
    const consolidatedBoxes = step80?.data?.consolidatedBoxes ?? [];
    const huModelId = step90?.data?.handlingUnitModel?.id;
    const finalWeight = step90?.data?.finalWeight;

    useEffect(() => {
        const onFinish = async () => {
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
                functionName: 'RF_manualRepacking',
                event: {
                    input: {
                        action: 'validateConsolidation',
                        printer,
                        originalHuoId: originalBox?.id,
                        consolidatedHuoIds: consolidatedBoxes.map((box: any) => box.id),
                        huModelId,
                        finalWeight
                    }
                }
            };
            try {
                const consolidationResult = await graphqlRequestClient.request(query, variables);
                if (consolidationResult.executeFunction.status === 'ERROR') {
                    showError(consolidationResult.executeFunction.output);
                    onBack();
                } else if (
                    consolidationResult.executeFunction.status === 'OK' &&
                    consolidationResult.executeFunction.output.status === 'KO'
                ) {
                    showError(
                        t(`errors:${consolidationResult.executeFunction.output.output.code}`)
                    );
                    console.log(
                        'Backend_message',
                        consolidationResult.executeFunction.output.output
                    );
                    onBack();
                } else {
                    showSuccess(t('messages:consolidation-finished'));
                    // END: back to the box scan, printer is kept
                    dispatch({
                        type: 'UPDATE_BY_PROCESS',
                        processName,
                        object: { currentStep: 20, step10 }
                    });
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

    //AutoValidateConsolidation-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject, stepNumber)}`
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
