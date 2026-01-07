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
//SPECIFIC FOR QUANTITY MOVEMENT
//DESCRIPTION: retrieve information from local storage and validate them for database updates

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';

export interface IValidateMovementToProcessProps {
    processName: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateMovementToProcessForm = ({
    processName,
    stepNumber,
    buttons
}: IValidateMovementToProcessProps) => {
    const { t } = useTranslation('common');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

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

    // retrieve values for update locations/contents and create movement
    const movementToProcess = storedObject?.step10?.data?.movement;
    const movingQuantity = storedObject?.step60?.data?.movingQuantity;
    const finalLocationId = storedObject?.step75?.data?.chosenLocation.id;
    const finalLocationName = storedObject?.step75?.data?.chosenLocation.name;
    const finalHandlingUnitId = storedObject?.step80?.data?.handlingUnit.id;
    const finalHandlingUnitName = storedObject?.step80?.data?.handlingUnit.name;

    //ValidateQuantityMove-1a: retrieve chosen level from select and set information
    const onFinish = async () => {
        setIsLoading(true);
        const executeMutation = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_movement_to_process_validate',
            event: {
                input: {
                    movementId: movementToProcess.id,
                    movingQuantity,
                    finalLocationId,
                    finalLocationName,
                    finalHandlingUnitId,
                    finalHandlingUnitName
                }
            }
        };

        try {
            const result = await graphqlRequestClient.request(executeMutation, variables);
            if (result) {
                if (result.executeFunction.status === 'ERROR') {
                    showError(result.executeFunction.output);
                } else if (
                    result.executeFunction.status === 'OK' &&
                    result.executeFunction.output.status === 'KO'
                ) {
                    showError(t(`errors:${result.executeFunction.output.output.code}`));
                    console.log('Backend_message', result.executeFunction.output.output);
                } else {
                    showSuccess(t('messages:movement-success'));
                    dispatch({
                        type: 'DELETE_RF_PROCESS',
                        processName
                    });
                }
            }
            setIsLoading(false);
        } catch (error) {
            showError(t('messages:movement-error'));
            console.error('Error updating movement:', error);
            setIsLoading(false);
        }
    };

    //ValidateQuantityMove-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    return (
        <WrapperForm>
            {!isLoading ? (
                <StyledForm
                    name="basic"
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                    size="small"
                >
                    <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
