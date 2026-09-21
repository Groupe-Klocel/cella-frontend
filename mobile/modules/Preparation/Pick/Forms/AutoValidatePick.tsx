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
import { getLastStepWithPreviousStep, showError, showSuccess, showWarning } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { handlePickProcessResult } from '../Elements/endOfProcessHandling';
// Redmine #36084 — anti-replay guard, see the header comment of that file
import {
    PICK_VALIDATION_GUARD_FIELD,
    buildPickValidationKey,
    fetchAdvisedAddressQuantities,
    isPickValidationAlreadySent,
    pickValidationMessages,
    refreshAdvisedAddressQuantities,
    translatePickValidationMessage,
    withPickValidationSent,
    withoutPickValidationSent,
    withReadableErrorCodes,
    isFailedPickValidationResult,
    buildRoundSelectionSlice,
    isStaleSnapshotServerRefusal
} from 'helpers/utils/pickValidationGuard';

export interface IAutoValidatePickProps {
    processName: string;
    stepNumber: number;
    toBePalletized: boolean;
    autoValidateLoading: { [label: string]: any };
    buttons?: { [label: string]: any };
}

export const AutoValidatePickForm = ({
    processName,
    stepNumber,
    autoValidateLoading: { isAutoValidateLoading, setIsAutoValidateLoading }
}: IAutoValidatePickProps) => {
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
    const { step5, step10, step15, step30, step40, step50, step60, step70, step75 } = storedObject;

    const initialIgnoreHUContentIds = storedObject.ignoreHUContentIds || [];
    const proposedRoundAdvisedAddresses = step10?.data?.proposedRoundAdvisedAddresses;
    const round = step10?.data?.round;
    const hu = step15?.data?.handlingUnit;
    const huType = step15?.data?.handlingUnitType;
    const pickedLocation = step30?.data.chosenLocation;
    const pickedHU = step40?.data.handlingUnit;
    const isHUToCreate = step15?.data?.isHUToCreate;
    const articleInfo = step50?.data.article;
    const features = step60?.data?.processedFeatures;
    const huc = step60?.data.content;
    const movingQuantity = step70?.data?.movingQuantity;
    const roundNumber = storedObject.roundNumber || 1;
    const roundPosition = step75?.data?.position ?? null;

    const movementInput = {
        originalLocationIdStr: pickedLocation.id,
        originalLocationNameStr: pickedLocation.name,
        originalHandlingUnitIdStr: pickedHU.id,
        originalHandlingUnitNameStr: pickedHU.name,
        originalContentIdStr: huc.id,
        articleIdStr: articleInfo.id,
        articleNameStr: articleInfo.name,
        features: features,
        movingQuantity,
        finalHandlingUnitIdStr: isHUToCreate ? undefined : hu.id,
        finalHandlingUnitNameStr: isHUToCreate ? hu : hu.name,
        roundName: round.name
    };

    const currentRoundInfo = {
        id: round.id,
        position: roundPosition,
        roundAdvisedAddresses:
            proposedRoundAdvisedAddresses?.map(
                ({
                    id,
                    quantity,
                    roundLineDetailId
                }: {
                    id: string;
                    quantity: number;
                    roundLineDetailId: string;
                }) => ({ id, quantity, roundLineDetailId })
            ) || []
    };

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

            // #region Redmine #36084 — do not let a stale snapshot be picked twice
            // Same round, same advised addresses, same advised quantities, same picked quantity
            // => this exact validation already left this component. Refuse it, whether the repeat
            // comes from a remount or from a process slice restored out of local storage.
            const validationKey = buildPickValidationKey(
                round?.id,
                currentRoundInfo.roundAdvisedAddresses,
                movingQuantity
            );
            if (isPickValidationAlreadySent(storedObject, validationKey)) {
                showError(translatePickValidationMessage(t, pickValidationMessages.alreadySent));
                setIsAutoValidateLoading(false);
                // the snapshot is stale: send him back to the round selection, not one step back
                backToRoundSelection();
                return;
            }

            setIsAutoValidateLoading(true);

            // Re-read the advised addresses instead of trusting the snapshot frozen at step 10,
            // then recompute what may still be picked from that fresh value.
            let refreshed;
            try {
                const dbQuantities = await fetchAdvisedAddressQuantities(
                    graphqlRequestClient,
                    currentRoundInfo.roundAdvisedAddresses.map((advised: any) => advised.id)
                );
                refreshed = refreshAdvisedAddressQuantities(
                    currentRoundInfo.roundAdvisedAddresses,
                    dbQuantities
                );
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('roundAdvisedAddressesRefreshError', error);
                setIsAutoValidateLoading(false);
                onBack();
                return;
            }

            // Nothing left in database (or the advised address is gone): say so instead of
            // sending a decrement that would drive the quantity negative.
            if (refreshed.missingIds.length > 0 || refreshed.availableQuantity <= 0) {
                showError(
                    translatePickValidationMessage(t, pickValidationMessages.nothingLeftToPick)
                );
                setIsAutoValidateLoading(false);
                backToRoundSelection();
                return;
            }

            // Partial rest in database: pick what is left rather than what the snapshot claimed
            const effectiveMovingQuantity = Math.min(
                Number(movingQuantity ?? 0),
                refreshed.availableQuantity
            );
            if (effectiveMovingQuantity < Number(movingQuantity ?? 0)) {
                showWarning(
                    translatePickValidationMessage(t, pickValidationMessages.quantityAdjusted)
                );
            }

            // Stored *before* the request is issued: AppLayout mirrors the process slice into
            // local storage with a 1 s debounce, so a slice restored later carries the guard.
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                customFields: [
                    {
                        key: PICK_VALIDATION_GUARD_FIELD,
                        value: withPickValidationSent(storedObject, validationKey)
                    }
                ]
            });
            // #endregion

            const inputToValidate = {
                movementInput: { ...movementInput, movingQuantity: effectiveMovingQuantity },
                currentRoundInfo: {
                    ...currentRoundInfo,
                    roundAdvisedAddresses: refreshed.advisedAddresses
                }
            };
            //For HU creation : look at the ValidateRoundPacking API
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                functionName: 'RF_pick_validate',
                event: {
                    input: inputToValidate
                }
            };
            try {
                const validateFullBoxResult = await graphqlRequestClient.request(query, variables);
                // Same reasoning as the catch below: an ERROR or a business KO wrote nothing, so
                // the guard must not outlive the failure and refuse the retry.
                if (isFailedPickValidationResult(validateFullBoxResult)) {
                    releasePickValidationGuard(validationKey);
                }
                // The server's own anti-replay refusal also proves the snapshot is stale, so it
                // gets the same recovery; every other business error keeps the plain back action.
                const recovery = isStaleSnapshotServerRefusal(validateFullBoxResult)
                    ? backToRoundSelection
                    : onBack;
                handlePickProcessResult({
                    result: validateFullBoxResult,
                    // the server refuses a replay with the untranslated code `errors:500`
                    t: withReadableErrorCodes(t),
                    storedObject,
                    processName,
                    dispatch,
                    onBack: recovery,
                    setIsAutoValidateLoading,
                    huName: hu.name || hu,
                    huType,
                    roundNumber,
                    context: 'autoValidate'
                });
            } catch (error) {
                // Nothing was validated: let the operator send this exact pick again
                releasePickValidationGuard(validationKey);
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                onBack();
                setIsAutoValidateLoading(false);
            }
        };
        onFinish();
    }, []);

    // Redmine #36084 — undo the guard written just before the call, on the failure paths only.
    // `ON_BACK` keeps every non-`step*` field of the process slice, so without this the key would
    // survive the failure and the operator's retry would be refused as "already validated".
    // Never called on the success path, where `handlePick*ProcessResult` replaces the whole slice.
    const releasePickValidationGuard = (validationKey: string) => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName: processName,
            stepName: `step${stepNumber}`,
            customFields: [
                {
                    key: PICK_VALIDATION_GUARD_FIELD,
                    value: withoutPickValidationSent(storedObject, validationKey)
                }
            ]
        });
    };

    //AutoValidatePick-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    // Redmine #36084 — recovery for a refusal caused by a stale snapshot. `onBack()` pops one step
    // and keeps `step10`, so the operator was re-proposed the very line that was just refused and
    // looped on it; on `pick-and-pack` the back action could not even reach the round selection any
    // more. Replacing the whole slice puts him on the round selection with the equipment kept, so
    // his next tap re-reads the round from the database and lands him on the correct next line.
    const backToRoundSelection = () => {
        dispatch({
            type: 'UPDATE_BY_PROCESS',
            processName: processName,
            object: buildRoundSelectionSlice(storedObject)
        });
    };

    return <WrapperForm>{isAutoValidateLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
