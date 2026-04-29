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
import { EnterNumberForm } from 'modules/Common/EnterNumberForm_reducer';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IEnterQuantityReducerProps {
    processName: string;
    stepNumber: number;
    label?: string;
    defaultValue?: number;
    buttons: { [label: string]: any };
    availableQuantity?: number;
    checkComponent: any;
    isCommentDisplayed?: boolean;
    initialValueType?: number;
    autoValidate1Quantity?: boolean;
}

export const EnterQuantity_reducer = ({
    processName,
    stepNumber,
    label,
    defaultValue,
    buttons,
    availableQuantity,
    checkComponent,
    isCommentDisplayed,
    initialValueType,
    autoValidate1Quantity
}: IEnterQuantityReducerProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [enteredInfo, setEnteredInfo] = useState<number>();

    // TYPED SAFE ALL
    // Define initial value according to prioritized parameters sent
    const tmpInitialValue = (() => {
        if (autoValidate1Quantity && availableQuantity !== 1) {
            return initialValueType === 2 ? availableQuantity : undefined;
        }
        return initialValueType == 1 ? 1 : initialValueType == 2 ? availableQuantity : undefined;
    })();

    let hasOtherIncompleteHucos = false;
    if (processName === 'pack') {
        // Check if there are other incomplete HUCOs in currentHuo (excluding currentHuco)
        const currentHuo = storedObject?.step40?.data?.currentHuo;
        const currentHuco = storedObject?.step40?.data?.currentHuco;

        const otherIncompleteHucos =
            currentHuo?.handlingUnitContentOutbounds?.filter(
                (huco: any) =>
                    huco.id !== currentHuco?.id &&
                    huco.missingQuantity + huco.pickedQuantity < huco.quantityToBePicked
            ) || [];

        hasOtherIncompleteHucos = otherIncompleteHucos.length > 0;
    }

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
        //automatically set movingQuantity when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            objectUpdate.object = {
                ...storedObject[`step${stepNumber}`],
                data: { movingQuantity: defaultValue }
            };
            const originalPoLines = storedObject[`step40`]?.data?.currentPurchaseOrderLine || [];
            let movingQuantity = defaultValue;

            // check every original PoLine and set the received quantity to match the quantity first and then the quantity max
            const updatedPoLinesFirstPass = originalPoLines.map((line: any) => {
                if (line.receivedQuantity === line.quantityMax) {
                    return line; // already fully received, skip
                }
                const receivedQuantity = line.receivedQuantity || 0;
                const quantity = line.quantity || 0;
                const quantityNeeded = quantity - receivedQuantity;

                if (quantityNeeded > 0) {
                    if (movingQuantity >= quantityNeeded) {
                        movingQuantity -= quantityNeeded;
                        return {
                            ...line,
                            receivedQuantity: quantity
                        };
                    } else {
                        const newQuantity = receivedQuantity + movingQuantity;
                        movingQuantity = 0; // reset movingQuantity to 0
                        return {
                            ...line,
                            receivedQuantity: newQuantity
                        };
                    }
                }
            });
            let updatedPoLinesSecondPass = null;
            if (movingQuantity > 0) {
                updatedPoLinesSecondPass = updatedPoLinesFirstPass.map((line: any) => {
                    if (line.receivedQuantity === line.quantityMax) {
                        return line; // already fully received, skip
                    }
                    const receivedQuantity = line.receivedQuantity || 0;
                    const quantityMax = line.quantityMax || 0;
                    const quantityNeeded = quantityMax - receivedQuantity;
                    if (quantityNeeded > 0) {
                        if (movingQuantity >= quantityNeeded) {
                            movingQuantity -= quantityNeeded;
                            return {
                                ...line,
                                receivedQuantity: quantityMax
                            };
                        } else {
                            const newQuantity = receivedQuantity + movingQuantity;
                            movingQuantity = 0; // reset movingQuantity to 0
                            return {
                                ...line,
                                receivedQuantity: newQuantity
                            };
                        }
                    }
                });
            }
            const newPOLines = updatedPoLinesSecondPass ?? updatedPoLinesFirstPass;
            objectUpdate.object.data.updatePoLines = newPOLines.filter(
                (newPoline: any) =>
                    newPoline.receivedQuantity !==
                    originalPoLines.find((oldPoline: any) => oldPoline.id === newPoline.id)
                        ?.receivedQuantity
            );
        } else if (autoValidate1Quantity && tmpInitialValue === 1) {
            if (!hasOtherIncompleteHucos) {
                objectUpdate.object = {
                    ...storedObject[`step${stepNumber}`],
                    data: { movingQuantity: 1 }
                };
            } else {
                setEnteredInfo(1);
            }
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        }

        dispatch(objectUpdate);
    }, []);

    const dataToCheck = {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo },
        availableQuantity,
        hasOtherIncompleteHucos
    };

    let rules: Array<any> = [{ required: true, message: t('messages:error-message-empty-input') }];
    if (availableQuantity !== undefined && availableQuantity !== null) {
        rules.push({
            type: 'number',
            max: availableQuantity,
            message: t('messages:erroneous-quantity')
        });
    }

    return (
        <>
            <EnterNumberForm
                processName={processName}
                stepNumber={stepNumber}
                label={label}
                buttons={{ ...buttons }}
                setEnteredInfo={setEnteredInfo}
                rules={rules}
                min={1}
                initialValue={tmpInitialValue}
                isSelected={true}
                isCommentDisplayed={isCommentDisplayed}
            ></EnterNumberForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
