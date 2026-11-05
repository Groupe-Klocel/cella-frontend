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
import { buildRoundSelectionSlice } from 'helpers/utils/pickValidationGuard';

/**
 * What the operator walks through with "next" is a location/article couple, not a location:
 * several advised addresses can share one couple (the same article picked twice at the same
 * place), and one location can carry several couples (two articles stored side by side).
 * handlingUnitContentId is exactly that couple for a line backed by picking stock; a line
 * without picking stock has none, so its couple falls back to its location and its article.
 *
 * This is THE key of the skip list (storedObject.ignoreHUContentIds): every reader of that
 * list must compare with this function and never with a raw handlingUnitContentId, otherwise
 * a line the operator skipped is proposed to him again.
 */
export const roundAdvisedAddressCouple = (raa: any) =>
    raa?.handlingUnitContentId ??
    `no-content:${raa?.locationId ?? 'no-location'}:${
        raa?.roundLineDetail?.roundLine?.articleId ?? raa?.roundLineDetailId ?? raa?.id
    }`;

/**
 * A line is still to prepare only when what is left to pick on it is STRICTLY POSITIVE.
 *
 * `roundAdvisedAddress.quantity` is that remainder, and it goes NEGATIVE as soon as more has
 * been processed than is still expected - which is exactly what cancelling a box does to the
 * lines of that box the operator had already picked: `quantityToBeProcessed` drops to 0 while
 * `processedQuantity` keeps what he took, so the remainder becomes -1, -2, ...
 *
 * Filtering on `quantity != 0` kept those lines in the game, and since they carry the lowest
 * roundOrderId they were proposed first: the RF sent the operator back onto a line of a
 * cancelled box, with no position to scan (the cancellation took the box's
 * handlingUnitContentOutbounds with it), a negative expected quantity in the header, and a
 * validation the anti-replay guard refuses for ever (availableQuantity <= 0) - the round could
 * not be finished any more. Every reader of "is this line still to prepare" must use this
 * function and never a raw `!= 0`.
 */
export const isRoundAdvisedAddressToPrepare = (raa: any) => Number(raa?.quantity ?? 0) > 0;

export interface IPickProcessHandlingParams {
    result: any;
    t: (key: string, options?: any) => string;
    storedObject: any;
    processName: string;
    dispatch: any;
    onBack?: () => void;
    setIsAutoValidateLoading?: (loading: boolean) => void;
    huName?: string;
    huType?: string;
    equipmentHu?: string;
    roundNumber?: number;
    successMessage?: string;
    context: 'autoValidate' | 'declareMissing';
}

export interface IPickProcessResult {
    executeFunction: any;
    status: string;
    output: {
        status?: string;
        output?: {
            code?: string;
            updatedRound?: any;
            isPickValidated?: boolean;
            equipmentHu?: string;
        };
    };
}

export const handlePickProcessResult = ({
    result,
    t,
    storedObject,
    processName,
    dispatch,
    onBack,
    setIsAutoValidateLoading,
    huName,
    huType,
    equipmentHu,
    roundNumber = 1,
    successMessage,
    context
}: IPickProcessHandlingParams) => {
    const processResult = result as IPickProcessResult;

    // Handle execution errors
    if (processResult.executeFunction.status === 'ERROR') {
        showError(processResult.executeFunction.output);
        if (setIsAutoValidateLoading) setIsAutoValidateLoading(false);
        if (onBack) onBack();
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
    const {
        updatedRound,
        isRoundClosed,
        equipmentHu: resultEquipmentHu
    } = processResult.executeFunction.output.output;

    if (isRoundClosed) {
        // Handle round closure (pick validation completed)
        handlePickRoundClosure(
            storedObject,
            newStoredObject,
            dispatch,
            processName,
            t,
            roundNumber
        );
    } else {
        // Handle round continuation
        handlePickRoundContinuation(
            storedObject,
            newStoredObject,
            updatedRound,
            dispatch,
            processName,
            huName,
            huType,
            resultEquipmentHu || equipmentHu,
            roundNumber,
            t,
            context
        );
    }

    if (setIsAutoValidateLoading) setIsAutoValidateLoading(false);

    // Show appropriate success message
    if (context === 'declareMissing' && t) {
        showSuccess(t('messages:missing-quantity-declared-successfully'));
    } else if (context === 'autoValidate' && t) {
        showSuccess(t('messages:picked-successfully'));
    }
};

/**
 * Handles the case when the pick round is completed (validated)
 */
const handlePickRoundClosure = (
    storedObject: any,
    newStoredObject: any,
    dispatch: any,
    processName: string,
    t: (key: string) => string,
    roundNumber: number
) => {
    const hasStep5Data = storedObject.step5?.data;
    const isFirstRound = roundNumber === 1;

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

    showSuccess(t('messages:pick-round-finished'));
};

/**
 * Handles the case when the pick round continues
 */
const handlePickRoundContinuation = (
    storedObject: any,
    newStoredObject: any,
    updatedRound: any,
    dispatch: any,
    processName: string,
    huName?: string,
    huType?: string,
    equipmentHu?: string,
    roundNumber?: number,
    t?: (key: string) => string,
    context?: 'autoValidate' | 'declareMissing'
) => {
    // Handle ignoreHUContentIds logic
    const initialIgnoreHUContentIds = storedObject.ignoreHUContentIds || [];
    let ignoreHUContentIds = [...initialIgnoreHUContentIds];

    let remainingHUContentIds = updatedRound.roundAdvisedAddresses
        .filter((raa: any) => !ignoreHUContentIds.includes(roundAdvisedAddressCouple(raa)))
        .filter(isRoundAdvisedAddressToPrepare);

    if (remainingHUContentIds.length === 0) {
        ignoreHUContentIds = [];
        remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
            isRoundAdvisedAddressToPrepare
        );
    }

    if (remainingHUContentIds.length === 0) {
        // Nothing left to prepare anywhere. Reading `remainingHUContentIds[0]` out of an empty
        // list matched no couple, so `proposedRoundAdvisedAddresses` became `[undefined]` and the
        // very next render threw on `current.quantity` (expected-quantity header) - that is the
        // black screen. Put the operator back on the round selection instead: closing the round
        // stays the backend's call (isRoundClosed), so this is a dead end, not a closure.
        showError(t ? t('messages:no-round-advised-address-left') : '');
        dispatch({
            type: 'UPDATE_BY_PROCESS',
            processName: processName,
            object: buildRoundSelectionSlice(storedObject)
        });
        return;
    }

    // Filter round advised addresses
    const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses
        .filter(isRoundAdvisedAddressToPrepare)
        .filter(
            (raa: any) =>
                roundAdvisedAddressCouple(raa) ===
                roundAdvisedAddressCouple(remainingHUContentIds[0])
        );

    // Prepare step10 data
    interface DataType {
        proposedRoundAdvisedAddresses: any;
        pickAndPackType: string;
        round: any;
        currentShippingPalletId: any;
    }

    const data: DataType = {
        proposedRoundAdvisedAddresses: updatedRound.equipment.checkPosition
            ? [roundAdvisedAddresses[0]]
            : roundAdvisedAddresses,
        pickAndPackType: updatedRound.equipment.checkPosition ? 'detail' : 'fullBox',
        round: updatedRound,
        currentShippingPalletId: updatedRound.extraText1
    };

    // Prepare step15 data
    const dataStep15 = {
        handlingUnit: equipmentHu ?? huName,
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
    newStoredObject.roundNumber = roundNumber;
    newStoredObject.currentStep = 20;

    dispatch({
        type: 'UPDATE_BY_PROCESS',
        processName: processName,
        object: newStoredObject
    });
};
