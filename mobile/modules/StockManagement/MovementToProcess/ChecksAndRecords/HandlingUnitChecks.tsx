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
import { useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IHandlingUnitOriginChecksProps {
    dataToCheck: any;
    expectedHandlingUnitId?: string;
    canHuBeNew?: boolean;
    chosenLocationId?: string;
}

export const HandlingUnitChecks = ({
    dataToCheck,
    expectedHandlingUnitId,
    canHuBeNew,
    chosenLocationId
}: IHandlingUnitOriginChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    const handleError = (message: string) => {
        const displayedMessage = message;
        showError(t(displayedMessage));
        setResetForm(true);
        setScannedInfo(undefined);
    };
    //manage information for persistence storage and front-end errors
    useEffect(() => {
        let data: { [label: string]: any } = {};
        if (scannedInfo && handlingUnitInfos) {
            if (handlingUnitInfos.handlingUnits?.count !== 0) {
                if (expectedHandlingUnitId) {
                    if (handlingUnitInfos.handlingUnits?.results[0].id !== expectedHandlingUnitId) {
                        handleError('messages:unexpected-scanned-item');
                        return;
                    }
                }
                if (
                    chosenLocationId &&
                    handlingUnitInfos.handlingUnits.results[0].locationId !== chosenLocationId
                ) {
                    handleError(t('messages:no-hu-location'));
                    return;
                }
                data['handlingUnit'] = handlingUnitInfos.handlingUnits?.results[0];
            } else if (canHuBeNew) {
                //handling unit does not exist but can be created
                data['handlingUnit'] = {
                    name: scannedInfo
                };
            } else {
                const message = 'messages:no-hu';
                handleError(message);
            }
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
