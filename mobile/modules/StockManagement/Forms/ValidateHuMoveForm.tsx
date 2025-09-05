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
import { showError, showSuccess, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';

export interface IValidateHuMoveProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateHuMoveForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateHuMoveProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    }, []);
    // retrieve values for update locations/contents and create movement
    let originHandlingUnit: { [k: string]: any } = {};
    if (storedObject.step20.data.handlingUnit) {
        originHandlingUnit = storedObject.step20.data.handlingUnit;
    }
    let finalHandlingUnit: { [k: string]: any } = {};
    if (storedObject.step40.data.handlingUnit) {
        finalHandlingUnit = storedObject.step40.data.handlingUnit;
    }
    let isHuToCreate = false;
    if (storedObject.step40.data.isHuToCreate) {
        isHuToCreate = storedObject.step40.data.isHuToCreate;
    }
    let originLocation: { [k: string]: any } = {};
    if (storedObject.step15.data.chosenLocation) {
        originLocation = storedObject.step15.data.chosenLocation;
    }
    let finalLocation: { [k: string]: any } = {};
    if (storedObject.step35.data.chosenLocation) {
        finalLocation = storedObject.step35.data.chosenLocation;
    }

    //ValidateHuMove-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const inputToValidate = {
            originHandlingUnit,
            originLocation,
            finalHandlingUnit,
            finalLocation,
            isHuToCreate
        };
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_handling_unit_movement_validate',
            event: {
                input: inputToValidate
            }
        };
        try {
            const validateHuMove = await graphqlRequestClient.request(query, variables);
            if (validateHuMove.executeFunction.status === 'ERROR') {
                showError(validateHuMove.executeFunction.output);
            } else if (
                validateHuMove.executeFunction.status === 'OK' &&
                validateHuMove.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${validateHuMove.executeFunction.output.output.code}`));
                console.log('Backend_message', validateHuMove.executeFunction.output.output);
                setIsLoading(false);
            } else {
                showSuccess(t('messages:movement-success'));
                storage.remove(process);
                setHeaderContent(false);
                setTriggerRender(!triggerRender);
                setIsLoading(false);
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsLoading(false);
        }
    };

    //ValidateHuMove-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
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
