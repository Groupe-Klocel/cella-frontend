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
import {
    findCodeByScopeAndValue,
    findValueByScopeAndCode,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IAutoDeclareMissingQuantityProps {
    processName: string;
    stepNumber: number;
    declareLoading: { [label: string]: any };
    controlManagement: { [label: string]: any };
}

// Terminal step of the "finish position"/"finish box" path, the counterpart of
// AutoValidatePackForm for the normal packing path: on mount it runs
// declare_missing_quantity_post_picking on the box(es) targeted by the finish button, passing
// the packaging/weight selected at the review step (60) when the flow went through it (plus the
// step-10 printer, same input names as RF_pack_validate), then drives the post-declaration
// navigation.
export const AutoDeclareMissingQuantityForm = ({
    processName,
    stepNumber,
    declareLoading: { isDeclareLoading, setIsDeclareLoading },
    controlManagement: { setIsToControl }
}: IAutoDeclareMissingQuantityProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient } = useAuth();
    const { parameters } = useAppState();

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const { step10, step20, step40, step60 } = storedObject;

    const equipmentHuType = parseInt(
        findCodeByScopeAndValue(parameters, 'handling_unit_type', 'EQUIPMENT')
    );
    // Location (without HU management) where the missing stock is booked when finishing a
    // position; customer-configurable through the 'outbound' parameter (cf. pack.tsx).
    const missingLocationName = findValueByScopeAndCode(
        parameters,
        'outbound',
        'DEFAULT_MISSING_LOCATION'
    );

    const round = step20?.data?.round;
    const inProgressHuo = step20?.data?.inProgressHuo;
    const checkPosition = Boolean(round?.equipment?.checkPosition);
    const isFinishBoxMode = !checkPosition && Boolean(inProgressHuo);
    const finishTargetsSingleBox = checkPosition || isFinishBoxMode;
    const destinationHuos = round?.handlingUnitOutbounds?.filter(
        (item: any) => item.handlingUnit?.type !== equipmentHuType
    );

    const getHuoRemainingQuantity = (huo: any) =>
        huo?.handlingUnitContentOutbounds?.reduce(
            (total: number, huco: any) =>
                total +
                Math.max(huco.quantityToBePicked - huco.pickedQuantity - huco.missingQuantity, 0),
            0
        ) ?? 0;

    useEffect(() => {
        const onDeclare = async () => {
            setIsDeclareLoading(true);
            // Single-box variants declare the box targeted by the finish button; the whole-round
            // variant declares every unpacked box of the round.
            const finishHuos = (
                finishTargetsSingleBox ? [step40?.data?.currentHuo] : (destinationHuos ?? [])
            ).filter((huo: any) => huo && getHuoRemainingQuantity(huo) > 0);
            const declaredHuoIds = new Set(finishHuos.map((huo: any) => huo.id));
            const equipmentHuoPalletId = round?.handlingUnitOutbounds?.find(
                (huo: any) => huo.handlingUnit?.type === equipmentHuType
            )?.id;
            // Packaging/weight from the review step (single-box variants) plus the step-10
            // printer: the function uses them to close the box and print its label (same input
            // names as RF_pack_validate).
            const extraInput: { [key: string]: any } = {
                printer: step10?.data?.printers?.code
            };
            if (step60?.data) {
                extraInput['huModelId'] = step60.data.handlingUnitModel?.id;
                extraInput['finalWeight'] = step60.data.finalWeight;
            }
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;
            let processedHuosCount = 0;
            let lastOutput: any = null;
            let hasError = false;
            try {
                for (const huo of finishHuos) {
                    const variables = {
                        functionName: 'declare_missing_quantity_post_picking',
                        event: {
                            input: {
                                handlingUnitOutboundId: huo.id,
                                round: { id: round?.id },
                                equipmentHUOPalletId: equipmentHuoPalletId,
                                missingLocationName: missingLocationName,
                                ...extraInput
                            }
                        }
                    };
                    const result = await graphqlRequestClient.request(query, variables);
                    if (result.executeFunction.status === 'ERROR') {
                        showError(result.executeFunction.output);
                        hasError = true;
                        break;
                    }
                    if (
                        result.executeFunction.status === 'OK' &&
                        result.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${result.executeFunction.output.output.code}`));
                        console.log('Backend_message', result.executeFunction.output.output);
                        hasError = true;
                        break;
                    }
                    processedHuosCount += 1;
                    lastOutput = result.executeFunction.output.output;
                }
                if (!hasError && processedHuosCount > 0) {
                    showSuccess(
                        t(
                            isFinishBoxMode
                                ? 'messages:box-finished-successfully'
                                : 'messages:position-finished-successfully'
                        )
                    );
                    if (lastOutput?.isRoundClosed) {
                        showSuccess(t('messages:pack-round-finished'));
                    }
                }
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
                hasError = true;
            }

            // Post-declaration navigation. Dispatched right before the loading flip so the step
            // unmounts in the same commit and never re-triggers.
            if (!hasError && processedHuosCount > 0) {
                // With position scan, stay on the loaded round as long as other positions still
                // hold quantities to prepare: drop the finished box and go back to the position
                // scan step for the next position. Otherwise back to the round scan step.
                const remainingHuos = checkPosition
                    ? (destinationHuos ?? []).filter(
                          (huo: any) =>
                              !declaredHuoIds.has(huo.id) && getHuoRemainingQuantity(huo) > 0
                      )
                    : [];
                if (remainingHuos.length > 0) {
                    dispatch({
                        type: 'UPDATE_BY_PROCESS',
                        processName,
                        object: {
                            currentStep: 20,
                            step10: storedObject['step10'],
                            step20: {
                                ...storedObject['step20'],
                                data: {
                                    ...storedObject['step20']?.data,
                                    // Clear the scanned position and the in-progress box so the
                                    // position step asks for a fresh scan instead of
                                    // auto-selecting.
                                    position: undefined,
                                    inProgressHuo: undefined,
                                    round: {
                                        ...round,
                                        handlingUnitOutbounds: round?.handlingUnitOutbounds?.filter(
                                            (huo: any) => !declaredHuoIds.has(huo.id)
                                        )
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // Back to a fresh round/equipment/position scan (keep the printer).
                    dispatch({
                        type: 'UPDATE_BY_PROCESS',
                        processName,
                        object: { currentStep: 20, step10: storedObject['step10'] }
                    });
                }
                setIsToControl(null);
            } else if (finishTargetsSingleBox) {
                // Re-open the packaging/weight review step (60) so the operator can retry or go
                // back: everything after step 60 is dropped and its data cleared.
                dispatch({
                    type: 'ON_BACK',
                    processName,
                    stepToReturn: 'step60'
                });
            } else if (processedHuosCount > 0) {
                // Whole-round variant partially declared: back to a fresh scan so the screen
                // reflects what was actually declared.
                dispatch({
                    type: 'UPDATE_BY_PROCESS',
                    processName,
                    object: { currentStep: 20, step10: storedObject['step10'] }
                });
                setIsToControl(null);
            } else {
                // Whole-round variant, nothing declared: back to the article scan.
                dispatch({
                    type: 'ON_BACK',
                    processName,
                    stepToReturn: 'step40'
                });
            }
            setIsDeclareLoading(false);
        };
        onDeclare();
    }, []);

    return <WrapperForm>{isDeclareLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
