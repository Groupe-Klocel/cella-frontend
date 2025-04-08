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

export interface IAutoValidatePickAndPackProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
    autoValidateLoading: { [label: string]: any };
}

export const AutoValidatePickAndPackForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent },
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidatePickAndPackProps) => {
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
    const { step10, step15, step30, step40, step50, step70, step80 } = storedObject;

    const proposedRoundAdvisedAddresses = step10?.data?.proposedRoundAdvisedAddresses;
    const round = step10?.data?.round;
    const huName = step15?.data?.handlingUnit;
    const huType = step15?.data?.handlingUnitType;
    const isHUToCreate = step15?.data?.isHUToCreate;
    const pickedLocation = step30?.data.chosenLocation;
    const pickedHU = step40?.data.handlingUnit;
    const articleInfo = step50?.data.article;
    const movingQuantity = step70?.data?.movingQuantity;
    const huModel = step80?.data?.handlingUnitModel;

    console.log(huName, huType, 'huName, huType');

    useEffect(() => {
        const onFinish = async () => {
            const inputToValidate = {
                proposedRoundAdvisedAddresses,
                round,
                pickedLocation,
                pickedHU,
                articleInfo,
                movingQuantity,
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
                if (validateFullBoxResult.executeFunction.status === 'ERROR') {
                    showError(validateFullBoxResult.executeFunction.output);
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
                    storage.remove(process);
                    showSuccess(t('messages:picked-and-packed-successfully'));
                    console.log(validateFullBoxResult.executeFunction.output.output, 'output');

                    const storedObject: any = {};
                    const { updatedRound, isRoundClosed } =
                        validateFullBoxResult.executeFunction.output.output;
                    if (isRoundClosed) {
                        showSuccess(t('messages:pick-and-pack-round-finished'));
                    } else {
                        const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses
                            .filter((raa: any) => raa.quantity != 0)
                            .sort((a: any, b: any) => {
                                return a.roundOrderId - b.roundOrderId;
                            });
                        //retrieve list of proposedRoundAdvisedAddresses for a given huc
                        const raaForHUC = roundAdvisedAddresses.filter(
                            (raa: any) =>
                                raa.handlingUnitContentId ==
                                roundAdvisedAddresses[0].handlingUnitContentId
                        );
                        const data = {
                            proposedRoundAdvisedAddresses: updatedRound.equipment.checkPosition
                                ? [raaForHUC[0]]
                                : raaForHUC,
                            pickAndPackType: updatedRound.equipment.checkPosition
                                ? 'detail'
                                : 'fullBox',
                            round: updatedRound,
                            currentShippingPalletId: updatedRound.extraText1
                        };
                        const dataStep15 = {
                            handlingUnit: huName,
                            handlingUnitType: huType,
                            isHUToCreate: false
                        };
                        storedObject['currentStep'] = 10;
                        storedObject[`step10`] = { previousStep: 0, data };
                        storedObject[`step15`] = { previousStep: 10, data: dataStep15 };
                        storage.set(process, JSON.stringify(storedObject));
                    }
                    setTriggerRender(!triggerRender);
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

    //AutoValidatePickAndPack-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
