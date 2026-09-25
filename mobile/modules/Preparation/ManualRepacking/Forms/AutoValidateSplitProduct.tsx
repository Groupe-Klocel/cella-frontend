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
//DESCRIPTION: after quantity entry (split), moves the product from the original box to the
// created box (HU/HUO creation on first loop, HUC/HUCO creation/compacting, original HUCO
// decrement and movement 30025 are handled back-end), then loops back to the product scan.

import { WrapperForm, ContentSpin } from '@components';
import { getLastStepWithPreviousStep, showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IAutoValidateSplitProductProps {
    processName: string;
    stepNumber: number;
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidateSplitProductForm = ({
    processName,
    stepNumber,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidateSplitProductProps) => {
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

    const { step10, step20, step30, step40, step50 } = storedObject;

    const printer = step10?.data?.printers?.code;
    const originalBox = step20?.data?.originalBox;
    const createdBox = storedObject.createdBox;
    const article = step40?.data?.article;
    const originalHuco = step40?.data?.originalHuco;
    const movingQuantity = step50?.data?.movingQuantity;

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
                        action: 'splitProduct',
                        printer,
                        originalHuoId: originalBox?.id,
                        newHuoId: createdBox?.id ?? null,
                        originalHucoId: originalHuco?.id,
                        articleId: article?.id,
                        movingQuantity
                    }
                }
            };
            try {
                const splitProductResult = await graphqlRequestClient.request(query, variables);
                if (splitProductResult.executeFunction.status === 'ERROR') {
                    showError(splitProductResult.executeFunction.output);
                    onBack();
                } else if (
                    splitProductResult.executeFunction.status === 'OK' &&
                    splitProductResult.executeFunction.output.status === 'KO'
                ) {
                    showError(t(`errors:${splitProductResult.executeFunction.output.output.code}`));
                    console.log(
                        'Backend_message',
                        splitProductResult.executeFunction.output.output
                    );
                    onBack();
                } else {
                    const { originalBox: updatedOriginalBox, newBox } =
                        splitProductResult.executeFunction.output.output;
                    showSuccess(t('messages:product-moved-successfully'));
                    // loop back to the product scan (step 40) keeping printer/box/action
                    dispatch({
                        type: 'UPDATE_BY_PROCESS',
                        processName,
                        object: {
                            currentStep: 30,
                            step10,
                            step20: {
                                ...step20,
                                data: {
                                    ...step20?.data,
                                    originalBox: updatedOriginalBox ?? originalBox
                                }
                            },
                            step30,
                            createdBox: newBox ?? createdBox
                        }
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

    //AutoValidateSplitProduct-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject, stepNumber)}`
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
