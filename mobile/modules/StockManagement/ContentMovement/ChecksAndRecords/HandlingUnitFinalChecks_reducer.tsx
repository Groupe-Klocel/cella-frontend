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
import { findCodeByScopeAndValue, showError } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface IHandlingUnitFinalChecksReducerProps {
    dataToCheck: any;
}

export const HandlingUnitFinalChecks_reducer = ({
    dataToCheck
}: IHandlingUnitFinalChecksReducerProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // DB-backed configs/parameters (AppContext): (scope, value) -> code, no hard-coded number
    const stockHuCategory = parseInt(
        findCodeByScopeAndValue(state.parameters, 'handling_unit_category', 'stock')
    );
    const palletHuType = parseInt(
        findCodeByScopeAndValue(state.parameters, 'handling_unit_type', 'pallet')
    );
    const boxHuType = parseInt(
        findCodeByScopeAndValue(state.parameters, 'handling_unit_type', 'box')
    );
    const validatedHuStatus = parseInt(
        findCodeByScopeAndValue(state.configs, 'handling_unit_status', 'validated')
    );

    // TYPED SAFE ALL
    const handleError = (message: string) => {
        showError(t(message));
        setResetForm(true);
        setScannedInfo(undefined);
    };

    //manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            const data: { [label: string]: any } = {};
            if (
                handlingUnitInfos &&
                handlingUnitInfos?.handlingUnits &&
                handlingUnitInfos?.handlingUnits?.count != 0
            ) {
                const chosenLocationId = storedObject['step65'].data.chosenLocation.id;
                if (handlingUnitInfos.handlingUnits.results[0].locationId !== chosenLocationId) {
                    handleError('messages:no-hu-location');
                    return;
                }
                const handlingUnit = handlingUnitInfos.handlingUnits.results[0];
                // HU origin/final identical = error
                if (handlingUnit.id == storedObject['step20'].data.handlingUnit.id) {
                    handleError('messages:hu-origin-final-identical');
                    return;
                }
                if (handlingUnitInfos.handlingUnits.results[0].category !== stockHuCategory) {
                    handleError('messages:only-stock-hu-move');
                    return;
                }
                // HU ok = next step
                data['finalHandlingUnit'] = handlingUnit;
            } else {
                const type =
                    scannedInfo[0] == '0' || scannedInfo[0] == 'P' ? palletHuType : boxHuType;

                const handlingUnitToCreate = {
                    name: scannedInfo,
                    barcode: scannedInfo,
                    code: scannedInfo,
                    type,
                    status: validatedHuStatus,
                    category: stockHuCategory,
                    locationId: storedObject['step65'].data.chosenLocation.id,
                    stockOwnerId: storedObject['step20'].data.handlingUnit.stockOwnerId
                };

                data['isHuToCreate'] = true;
                data['finalHandlingUnit'] = handlingUnitToCreate;
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
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
