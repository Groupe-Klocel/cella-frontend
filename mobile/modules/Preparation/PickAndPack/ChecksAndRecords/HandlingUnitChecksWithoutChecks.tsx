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
import { showError, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecksWithoutChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        uniqueHU,
        setResetForm
    } = dataToCheck;

    console.log('handlingUnitInfos', handlingUnitInfos);

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL

    useEffect(() => {
        let data: { [label: string]: any } = {};
        if (scannedInfo && handlingUnitInfos) {
            if (!handlingUnitInfos.handlingUnits?.results[0]) {
                const type =
                    scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                        ? parameters.HANDLING_UNIT_TYPE_PALLET
                        : parameters.HANDLING_UNIT_TYPE_BOX;
                data['handlingUnit'] = scannedInfo;
                data['handlingUnitType'] = type;
                data['isHUToCreate'] = true;
                // specific to handle unique handling unit in selected location and back function for next step
                if (uniqueHU) {
                    data = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
                } else {
                }
            } else {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: data,
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
