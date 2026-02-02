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
import { useEffect } from 'react';

export interface IPositionChecksProps {
    dataToCheck: any;
    handlingUnitOutboundInfos: any;
}

export const PositionChecks = ({
    dataToCheck,
    handlingUnitOutboundInfos
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

    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos) {
            //Split equipment and position where needed
            let scannedPosition: number;
            let scannedEquipment: string | null = null;
            if (scannedInfo.length < 5) {
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
                if (scannedEquipment !== null) {
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
                } else if (allLinesCompleted) {
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

    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${getLastStepWithPreviousStep(storedObject)}`
        });
    };

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
