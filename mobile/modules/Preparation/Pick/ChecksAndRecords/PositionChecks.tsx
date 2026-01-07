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
import { showError } from '@helpers';
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
            //Split equipment and position where neededÒ
            let scannedPosition: number;
            let scannedEquipment: string = '';
            if (scannedInfo.length < 5) {
                scannedPosition = parseInt(scannedInfo, 10);
            } else {
                scannedEquipment = scannedInfo.substring(0, scannedInfo.length - 4);
                const scannedPositionStr = scannedInfo.substring(scannedInfo.length - 4);
                scannedPosition = parseInt(scannedPositionStr, 10);
            }

            // Compare scanned position with expected position
            if (scannedPosition === handlingUnitOutboundInfos?.roundPosition) {
                // Position is correct, check equipment if present
                if (scannedEquipment) {
                    const expectedEquipment =
                        typeof storedObject?.step15?.data?.handlingUnit === 'string'
                            ? storedObject?.step15?.data?.handlingUnit
                            : storedObject?.step15?.data?.handlingUnit.name;

                    if (scannedEquipment === expectedEquipment) {
                        // Both position and equipment are correct
                        const data: { [label: string]: any } = {};
                        data['position'] = scannedPosition;
                        data['equipment'] = scannedEquipment;
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
                } else {
                    // Only position scanned, no equipment to check
                    const data: { [label: string]: any } = {};
                    data['position'] = scannedPosition;
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

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
