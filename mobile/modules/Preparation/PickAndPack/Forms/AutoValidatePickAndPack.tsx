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
import { showError, showSuccess, LsIsSecured, getLastStepWithPreviousStep } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { handlePickAndPackProcessResult } from '../Elements/endOfProcessHandling';

export interface IAutoValidatePickAndPackProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
    toBePalletized: boolean;
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidatePickAndPackForm = ({
    processName,
    stepNumber,
    buttons,
    headerContent: { setHeaderContent },
    toBePalletized,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidatePickAndPackProps) => {
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
    const { step5, step10, step15, step30, step40, step50, step60, step70, step80 } = storedObject;

    const initialIgnoreHUContentIds = storedObject.ignoreHUContentIds || [];
    const proposedRoundAdvisedAddresses = step10?.data?.proposedRoundAdvisedAddresses;
    const round = step10?.data?.round;
    const huName = step15?.data?.handlingUnit;
    const huType = step15?.data?.handlingUnitType;
    const isHUToCreate = step15?.data?.isHUToCreate;
    const pickedLocation = step30?.data.chosenLocation;
    const pickedHU = step40?.data.handlingUnit;
    const articleInfo = step50?.data.article;
    const features = step60?.data?.processedFeatures;
    const movingQuantity = step70?.data?.movingQuantity;
    const huModel = step80?.data?.handlingUnitModel;
    const roundNumber = storedObject.roundNumber || 1;

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
                proposedRoundAdvisedAddresses,
                round,
                pickedLocation,
                pickedHU,
                features,
                articleInfo,
                movingQuantity,
                toBePalletized,
                ...(huModel !== 'huModelExist' && { huModel }),
                ...(huName && isHUToCreate && { huName }),
                ...(huType && isHUToCreate && { huType })
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
                functionName: 'RF_pickAndPack_validate',
                event: {
                    input: inputToValidate
                }
            };
            try {
                const validateFullBoxResult = await graphqlRequestClient.request(query, variables);
                handlePickAndPackProcessResult({
                    result: validateFullBoxResult,
                    t,
                    storedObject,
                    processName,
                    dispatch,
                    onBack,
                    setIsAutoValidateLoading,
                    huName,
                    huType,
                    context: 'autoValidate'
                });
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                onBack();
                setIsAutoValidateLoading(false);
            }
        };
        onFinish();
    }, []);

    //AutoValidatePickAndPack-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
