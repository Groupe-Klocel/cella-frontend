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
import { useRouter } from 'next/router';

export interface IHandlingUnitOriginChecksReducerProps {
    dataToCheck: any;
    isEnforcedOriginLocation?: boolean;
    expectedHandlingUnitId?: string;
}

export const HandlingUnitOriginChecks_reducer = ({
    dataToCheck,
    isEnforcedOriginLocation,
    expectedHandlingUnitId
}: IHandlingUnitOriginChecksReducerProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        isEnforcedValue,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // DB-backed parameter (AppContext): (scope, value) -> code, no hard-coded number
    const stockHuCategory = parseInt(
        findCodeByScopeAndValue(state.parameters, 'handling_unit_category', 'stock')
    );

    // TYPED SAFE ALL
    const handleError = (message: string, enforedValueMessage?: string) => {
        const displayedMessage =
            isEnforcedValue && enforedValueMessage ? enforedValueMessage : message;
        showError(t(displayedMessage));
        setResetForm(true);
        setScannedInfo(undefined);
        if (isEnforcedValue) {
            if (isEnforcedOriginLocation) {
                router.back();
                dispatch({
                    type: 'DELETE_RF_PROCESS',
                    processName
                });
            } else {
                dispatch({
                    type: 'ON_BACK',
                    processName,
                    stepToReturn: `step${storedObject.currentStep}`
                });
            }
        }
    };

    //manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            if (
                handlingUnitInfos.handlingUnits?.count !== 0 &&
                handlingUnitInfos.handlingUnits.results[0].handlingUnitContents.length !== 0
            ) {
                const handlingUnitContentsFiltered =
                    handlingUnitInfos.handlingUnits.results[0].handlingUnitContents.filter(
                        (huContent: any) => huContent.quantity > 0
                    );
                if (handlingUnitContentsFiltered.length === 0) {
                    handleError('messages:no-huc-quantity');
                    return;
                }
                const handlingUnitInfosFiltered = {
                    ...handlingUnitInfos.handlingUnits.results[0],
                    handlingUnitContents: handlingUnitContentsFiltered
                };
                const chosenLocationId = storedObject['step15'].data.chosenLocation.id;
                if (handlingUnitInfosFiltered.locationId !== chosenLocationId) {
                    handleError('messages:no-hu-location');
                    return;
                }
                if (handlingUnitInfosFiltered.category !== stockHuCategory) {
                    handleError('messages:only-stock-hu-move');
                    return;
                }
                if (expectedHandlingUnitId) {
                    if (handlingUnitInfosFiltered.id !== expectedHandlingUnitId) {
                        handleError('messages:unexpected-scanned-item');
                        return;
                    }
                }
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = handlingUnitInfosFiltered;
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
            } else {
                const message = isEnforcedValue
                    ? 'messages:no-content-in-location'
                    : 'messages:no-hu-or-empty';
                handleError(message);
            }
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
