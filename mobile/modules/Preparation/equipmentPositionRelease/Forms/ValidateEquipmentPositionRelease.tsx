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

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';

export interface IValidateEquipmentPositionRelease {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
}

export const ValidateEquipmentPositionRelease = ({
    processName,
    stepNumber,
    buttons
}: IValidateEquipmentPositionRelease) => {
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

    const roundId = storedObject?.step10?.data?.round.id;
    const roundPosition = storedObject?.step20?.data?.currentHuos[0]?.roundPosition;
    const equipmentHuId = storedObject?.step10?.data?.equipmentHu.id;
    const destinationHuName = storedObject?.step30?.data?.handlingUnit;

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
            functionName: 'RF_equipment_position_release_validate',
            event: {
                input: {
                    roundId,
                    roundPosition,
                    equipmentHuId,
                    destinationHuName
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
