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
import { showError, showSuccess, useTranslationWithFallback as useTranslation } from '@helpers';
import { Modal } from 'antd';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';

export interface IQuantityChecksProps {
    dataToCheck: any;
}

export const QuantityChecks = ({ dataToCheck }: IQuantityChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo },
        availableQuantity,
        hasOtherIncompleteHucos
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { step10, step20 } = storedObject;
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // TYPED SAFE ALL
    useEffect(() => {
        if (enteredInfo) {
            const currentHuo = storedObject?.step40?.data?.currentHuo;

            // Check if all lines are prepared for currentHuo
            const allLinesCompleted =
                currentHuo?.handlingUnitContentOutbounds?.every(
                    (huco: any) =>
                        huco.missingQuantity + huco.pickedQuantity === huco.quantityToBePicked
                ) ?? false;

            //send to step ReviewHuModelWeightChecks
            const updateQuantity = () => {
                const data: { [label: string]: any } = {};
                data['movingQuantity'] = enteredInfo;
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
            };
            //update HUCO Line with moving quantity
            const updateHuco = async () => {
                const inputToValidate = {
                    currentRoundId: storedObject?.step20?.data?.round.id,
                    equipmentHuId: storedObject?.step20?.data?.equipmentHu.id,
                    destinationHuoId: storedObject?.step40?.data?.currentHuo.id,
                    destinationHucoId: storedObject?.step40?.data?.currentHuco.id,
                    movingQuantity: enteredInfo
                };
                //For HU creation : look at the ValidateRoundPacking API
                setIsLoading(true);
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
                    const updatedHuco = await graphqlRequestClient.request(query, variables);
                    if (updatedHuco.executeFunction.status === 'ERROR') {
                        showError(updatedHuco.executeFunction.output);
                        setEnteredInfo(undefined);
                        setIsLoading(false);
                    } else if (
                        updatedHuco.executeFunction.status === 'OK' &&
                        updatedHuco.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${updatedHuco.executeFunction.output.output.code}`));
                        console.log('Backend_message', updatedHuco.executeFunction.output.output);
                        setEnteredInfo(undefined);
                        setIsLoading(false);
                    } else {
                        showSuccess(t('messages:updated-Huco-successfully'));
                        console.log(updatedHuco.executeFunction.output.output, 'output');
                        // Update step 20 with updated info from backend
                        const storedObject: any = {};
                        const { currentRound, equipmentHu, destinationHuo } =
                            updatedHuco.executeFunction.output.output;
                        storedObject['currentStep'] = 20;
                        storedObject['step10'] = step10;
                        storedObject['step20'] = {
                            ...step20,
                            data: {
                                ...step20?.data,
                                round: currentRound,
                                equipmentHu: equipmentHu,
                                position: currentRound?.equipment?.checkPosition
                                    ? destinationHuo?.roundPosition
                                    : null,
                                responseType: 'loopback',
                                inProgressHuo: destinationHuo ?? undefined
                            }
                        };
                        dispatch({
                            type: 'UPDATE_BY_PROCESS',
                            processName: processName,
                            object: storedObject
                        });

                        setIsLoading(false);
                    }
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                }
            };

            if (availableQuantity !== undefined && enteredInfo < availableQuantity) {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:message-quantity-to-prepare', {
                                expectedQuantity: availableQuantity,
                                enteredQuantity: enteredInfo
                            })}
                        </span>
                    ),
                    onOk: allLinesCompleted ? updateQuantity : updateHuco,
                    onCancel: () => {
                        setEnteredInfo(undefined);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                //this handles case when there is still Hucos to handle or not while we have:
                // a single quantity + autoValidate1Quantity in the enterQuantity_reducer
                hasOtherIncompleteHucos ? updateHuco() : updateQuantity();
            }
        }
    }, [enteredInfo]);

    return (
        <WrapperForm>
            {(enteredInfo && !storedObject[`step${stepNumber}`]?.data) || isLoading ? (
                <ContentSpin />
            ) : (
                <></>
            )}
        </WrapperForm>
    );
};
