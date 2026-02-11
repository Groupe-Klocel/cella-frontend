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
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface IQuantityChecksProps {
    dataToCheck: any;
}

export const StockStatusAndQuantityChecks = ({ dataToCheck }: IQuantityChecksProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        stockStatuses,
        enteredInfo: { enteredQuantityInfo }
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        const data: { [label: string]: any } = {};
        if (enteredQuantityInfo) {
            data['movingQuantity'] = enteredQuantityInfo;
            const originalPoLines = storedObject[`step40`]?.data?.currentPurchaseOrderLine || [];
            let movingQuantity = enteredQuantityInfo;

            // check every original PoLine and set the received quantity to match the quantity first and then the quantity max
            const updatedPoLinesFirstPass = originalPoLines.map((line: any) => {
                if (line.receivedQuantity >= line.quantity) {
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
            data['updatedPoLines'] = newPOLines.filter(
                (newPoline: any) =>
                    newPoline.receivedQuantity !==
                    originalPoLines.find((oldPoline: any) => oldPoline.id === newPoline.id)
                        ?.receivedQuantity
            );
            data['stockStatus'] = stockStatuses;
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [enteredQuantityInfo]);

    return (
        <WrapperForm>
            {enteredQuantityInfo && !storedObject[`step${stepNumber}`]?.data ? (
                <ContentSpin />
            ) : (
                <></>
            )}
        </WrapperForm>
    );
};
