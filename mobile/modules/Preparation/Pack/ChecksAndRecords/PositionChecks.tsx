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
import { getLastStepWithPreviousStep, showError } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect, useMemo } from 'react';

export interface IPositionChecksProps {
    dataToCheck: any;
    handlingUnitOutboundInfos: any;
    // waiting-label resume mode: the scanned box is complete by design (already packed,
    // label still to be printed), so the completeness check must not reject it
    allowPackedBoxes?: boolean;
}

export const PositionChecks = ({
    dataToCheck,
    handlingUnitOutboundInfos,
    allowPackedBoxes
}: IPositionChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL

    // code of the 'Cancelled' box status: a cancelled box standing at the scanned position is
    // refused here rather than carried through the article and packaging steps
    const cancelledHuoStatus = useMemo(
        () =>
            parseInt(
                (state.configs ?? []).find(
                    (item: any) =>
                        item.scope === 'handling_unit_outbound_status' &&
                        item.value?.toLowerCase() === 'cancelled'
                )?.code
            ),
        [state.configs]
    );

    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos) {
            // Split equipment and position. A chariot position label is the equipment barcode
            // immediately followed by the position, so when the scan starts with the round's
            // equipment we strip that exact prefix and the remainder is the position - this keeps
            // the parse correct whatever the length of the position part, and validates the
            // equipment by construction. We keep the historical "last 4 characters are the
            // position" fallback for any other label shape.
            const expectedEquipment = storedObject?.step20?.data?.equipmentHu?.name;
            // Position part when the scan is the equipment barcode immediately followed by the
            // position (null when the scan does not start with the equipment).
            const equipmentPositionPart =
                expectedEquipment && scannedInfo.startsWith(expectedEquipment)
                    ? scannedInfo.substring(expectedEquipment.length)
                    : null;
            let scannedPosition: number;
            let scannedEquipment: string | null = null;
            if (equipmentPositionPart !== null) {
                // Scan is the equipment barcode followed by the position: the equipment is validated
                // by the exact prefix and the remainder is the position. It must be fully numeric,
                // otherwise the whole scan is a malformed equipment label and is rejected here as a
                // wrong position (NaN never matches a roundPosition) instead of falling through to
                // the legacy last-4 parser, which could still read a valid position out of it.
                scannedEquipment = expectedEquipment;
                scannedPosition = /^\d+$/.test(equipmentPositionPart)
                    ? parseInt(equipmentPositionPart, 10)
                    : NaN;
            } else if (scannedInfo.length < 5) {
                scannedPosition = parseInt(scannedInfo, 10);
            } else {
                scannedEquipment = scannedInfo.substring(0, scannedInfo.length - 4);
                const scannedPositionStr = scannedInfo.substring(scannedInfo.length - 4);
                scannedPosition = parseInt(scannedPositionStr, 10);
            }

            const currentHuo = handlingUnitOutboundInfos?.find(
                (item: any) => item.roundPosition === scannedPosition
            );

            const allLinesCompleted =
                currentHuo?.handlingUnitContentOutbounds?.every(
                    (huco: any) =>
                        huco.missingQuantity + huco.pickedQuantity === huco.quantityToBePicked
                ) ?? false;

            if (currentHuo) {
                if (currentHuo.status === cancelledHuoStatus) {
                    showError(t('messages:box-cancelled'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else if (scannedEquipment !== null) {
                    const expectedEquipment = storedObject?.step20?.data?.equipmentHu?.name;
                    if (scannedEquipment === expectedEquipment) {
                        const data: { [label: string]: any } = {};
                        data['position'] = scannedPosition;
                        data['currentHuos'] = [currentHuo];
                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: `step${stepNumber}`,
                            object: {
                                ...storedObject[`step${stepNumber}`],
                                data
                            }
                        });
                    } else {
                        showError(t('messages:wrong-equipment'));
                        setResetForm(true);
                        setScannedInfo(undefined);
                    }
                } else if (allLinesCompleted && !allowPackedBoxes) {
                    showError(t('messages:box-already-packed'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    const data: { [label: string]: any } = {};
                    data['position'] = scannedPosition;
                    data['currentHuos'] = [currentHuo];
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: {
                            ...storedObject[`step${stepNumber}`],
                            data
                        }
                    });
                }
            } else {
                showError(t('messages:wrong-position'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
    }, [scannedInfo, handlingUnitOutboundInfos]);

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
