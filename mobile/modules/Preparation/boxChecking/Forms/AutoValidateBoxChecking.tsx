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
//SPECIFIC FOR RECEPTION
//DESCRIPTION: retrieve information from local storage and validate them for database updates

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IAutoValidateBoxCheckingProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidateBoxChecking = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent },
    autoValidateLoading: { isAutoValidateLoading }
}: IAutoValidateBoxCheckingProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
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
    // retrieve values for update contents/boxline and create movement
    const { step10, step20, step30 } = storedObject;

    const printer = step10?.data?.printers?.code;
    const handlingUnitId = step20?.data?.id;
    const { HUOToUpdate } = step30?.data;

    useEffect(() => {
        const onFinish = async () => {
            const inputToValidate = {
                printer: printer,
                handlingUnitId: handlingUnitId,
                handlingUnitOutboundId: HUOToUpdate
            };
            //For HU creation : look at the ValidateRoundPacking API
            isAutoValidateLoading(true);
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                functionName: 'RF_boxChecking_validate',
                event: {
                    input: inputToValidate
                }
            };
            try {
                const validateBoxCheckingResult = await graphqlRequestClient.request(
                    query,
                    variables
                );
                if (validateBoxCheckingResult.executeFunction.status === 'ERROR') {
                    showError(validateBoxCheckingResult.executeFunction.output);
                    onBack();
                } else if (
                    validateBoxCheckingResult.executeFunction.status === 'OK' &&
                    validateBoxCheckingResult.executeFunction.output.status === 'KO'
                ) {
                    showError(
                        t(`errors:${validateBoxCheckingResult.executeFunction.output.output.code}`)
                    );
                    console.log(
                        'Backend_message',
                        validateBoxCheckingResult.executeFunction.output.output
                    );
                    onBack();
                    isAutoValidateLoading(false);
                } else {
                    const newStoredObject: any = {};
                    if (validateBoxCheckingResult?.executeFunction?.output?.output?.HU) {
                        newStoredObject.currentStep = 20;
                        newStoredObject[`step10`] = {
                            ...storedObject[`step10`]
                        };
                        newStoredObject[`step20`] = {
                            ...storedObject[`step20`],
                            data: validateBoxCheckingResult.executeFunction.output.output.HU
                        };
                        storage.set(process, JSON.stringify(newStoredObject));
                    } else {
                        newStoredObject.currentStep = 10;
                        newStoredObject[`step10`] = {
                            ...storedObject[`step10`]
                        };
                        storage.set(process, JSON.stringify(newStoredObject));
                        showSuccess(t('messages:success-box-checking'));
                    }
                    console.log('validateBoxCheckingResult', validateBoxCheckingResult);
                    showSuccess(t('messages:success-print-data'));
                    const info = validateBoxCheckingResult.executeFunction.output.output;
                    console.log('info', info);
                    setTriggerRender((prev: boolean) => !prev);
                }
                isAutoValidateLoading(false);
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                onBack();
                isAutoValidateLoading(false);
            }
        };
        onFinish();
    }, []);

    //AutoValidatePickAndPack-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return <></>;
};
