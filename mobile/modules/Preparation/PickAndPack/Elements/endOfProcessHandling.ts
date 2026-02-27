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

import { showError, showSuccess } from '@helpers';

export interface IProcessHandlingParams {
    result: any;
    t: (key: string, options?: any) => string;
    storedObject: any;
    processName: string;
    dispatch: any;
    onBack?: () => void;
    setIsAutoValidateLoading?: (loading: boolean) => void;
    huName?: string;
    huType?: string;
    successMessage?: string;
    context: 'autoValidate' | 'declareMissing';
}

export interface IProcessResult {
    executeFunction: any;
    status: string;
    output: {
        status?: string;
        output?: {
            code?: string;
            updatedRound?: any;
            isRoundClosed?: boolean;
        };
    };
}

export const handlePickAndPackProcessResult = ({
    result,
    t,
    storedObject,
    processName,
    dispatch,
    onBack,
    setIsAutoValidateLoading,
    huName,
    huType,
    successMessage,
    context
}: IProcessHandlingParams) => {
    const processResult = result as IProcessResult;

    // Handle execution errors
    if (processResult.executeFunction.status === 'ERROR') {
        showError(processResult.executeFunction.output);
        if (setIsAutoValidateLoading) setIsAutoValidateLoading(false);
        return;
    }

    // Handle business logic errors
    if (
        processResult.executeFunction.status === 'OK' &&
        processResult.executeFunction.output.status === 'KO'
    ) {
        showError(t(`errors:${processResult.executeFunction.output.output.code}`));
        console.log('Backend_message', processResult.executeFunction.output.output);
        if (onBack) onBack();
        if (setIsAutoValidateLoading) setIsAutoValidateLoading(false);
        return;
    }

    // Handle successful execution
    console.log(processResult.executeFunction.output.output, 'output');

    const newStoredObject: any = {};
    const { updatedRound, isRoundClosed } = processResult.executeFunction.output.output;

    if (isRoundClosed) {
        // Handle round closure
        handleRoundClosure(storedObject, newStoredObject, dispatch, processName, t);
    } else {
        // Handle round continuation
        handleRoundContinuation(
            storedObject,
            newStoredObject,
            updatedRound,
            dispatch,
            processName,
            huName,
            huType,
            t,
            context
        );
    }

    if (setIsAutoValidateLoading) setIsAutoValidateLoading(false);
};

/**
 * Handles the case when the round is closed
 */
const handleRoundClosure = (
    storedObject: any,
    newStoredObject: any,
    dispatch: any,
    processName: string,
    t: (key: string) => string
) => {
    const hasStep5Data = storedObject.step5?.data;
    const isFirstRound = storedObject.step10?.data?.roundNumber === 1;

    if (hasStep5Data && !isFirstRound) {
        newStoredObject['currentStep'] = 10;
        newStoredObject[`step5`] = { previousStep: 0, data: storedObject.step5.data };
        newStoredObject[`step10`] = { previousStep: 5 };
    } else if (hasStep5Data && isFirstRound) {
        newStoredObject['currentStep'] = 5;
        newStoredObject[`step5`] = { previousStep: 0 };
    } else {
        newStoredObject['currentStep'] = 10;
        newStoredObject[`step10`] = { previousStep: 0 };
    }

    dispatch({
        type: 'UPDATE_BY_PROCESS',
        processName: processName,
        object: newStoredObject
    });

    showSuccess(t('messages:pick-and-pack-round-finished'));
};

/**
 * Handles the case when the round continues
 */
const handleRoundContinuation = (
    storedObject: any,
    newStoredObject: any,
    updatedRound: any,
    dispatch: any,
    processName: string,
    huName?: string,
    huType?: string,
    t?: (key: string) => string,
    context?: 'autoValidate' | 'declareMissing'
) => {
    // Handle ignoreHUContentIds logic
    const initialIgnoreHUContentIds =
        storedObject.ignoreHUContentIds || storedObject.initialIgnoreHUContentIds || [];
    let ignoreHUContentIds = [...initialIgnoreHUContentIds];

    let remainingHUContentIds = updatedRound.roundAdvisedAddresses
        .filter((raa: any) => !ignoreHUContentIds.includes(raa.handlingUnitContentId))
        .filter((raa: any) => raa.quantity != 0);

    if (remainingHUContentIds.length === 0) {
        ignoreHUContentIds = [];
        remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
            (raa: any) => raa.quantity != 0
        );
    }

    // Filter round advised addresses
    const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses
        .filter((raa: any) => raa.quantity != 0)
        .filter(
            (raa: any) =>
                raa.handlingUnitContentId === remainingHUContentIds[0]?.handlingUnitContentId
        );

    // Prepare step10 data
    interface DataType {
        proposedRoundAdvisedAddresses: any;
        pickAndPackType: string;
        round: any;
        currentShippingPalletId: any;
        roundNumber?: number;
    }

    const data: DataType = {
        proposedRoundAdvisedAddresses: updatedRound.equipment.checkPosition
            ? [roundAdvisedAddresses[0]]
            : roundAdvisedAddresses,
        pickAndPackType: updatedRound.equipment.checkPosition ? 'detail' : 'fullBox',
        round: updatedRound,
        currentShippingPalletId: updatedRound.extraText1
    };

    if (storedObject.step10?.data?.roundNumber || storedObject.step10?.roundNumber) {
        data['roundNumber'] =
            storedObject.step10?.data?.roundNumber || storedObject.step10?.roundNumber;
    }

    // Prepare step15 data
    const dataStep15 = {
        handlingUnit: huName,
        handlingUnitType: huType,
        isHUToCreate: context === 'autoValidate' ? false : storedObject.step15?.data?.isHUToCreate
    };

    // Build new stored object
    if (storedObject.step5) {
        newStoredObject[`step5`] = {
            previousStep: 0,
            data: storedObject.step5.data
        };
    }

    newStoredObject[`step10`] = {
        previousStep: storedObject.step5 ? 5 : 0,
        data
    };

    newStoredObject[`step15`] = {
        previousStep: 10,
        data: dataStep15
    };

    newStoredObject.ignoreHUContentIds = ignoreHUContentIds;
    newStoredObject.currentStep = 20;

    dispatch({
        type: 'UPDATE_BY_PROCESS',
        processName: processName,
        object: newStoredObject
    });

    // Show appropriate success message
    if (context === 'declareMissing' && t) {
        showSuccess(t('messages:missing-quantity-declared-successfully'));
    } else if (context === 'autoValidate' && t) {
        showSuccess(t('messages:picked-and-packed-successfully'));
    }
};
