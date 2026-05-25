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
import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecksWithoutChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        isANewHUEquipment,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        uniqueHU,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { parameters, configs } = useAppState();

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const palletHuType = findCodeByScope(parameters, 'handling_unit_type', 'PALLET');
        const boxHuType = findCodeByScope(parameters, 'handling_unit_type', 'BOX');
        const equipmentHuType = parseInt(
            findCodeByScope(parameters, 'handling_unit_type', 'EQUIPMENT')
        );

        return {
            palletHuType,
            boxHuType,
            equipmentHuType
        };
    }, [parameters, configs]);
    // TYPED SAFE ALL

    useEffect(() => {
        let data: { [label: string]: any } = {};
        if (scannedInfo && handlingUnitInfos) {
            if (!handlingUnitInfos.handlingUnits?.results[0] && isANewHUEquipment) {
                const type =
                    scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                        ? configsParamsCodes.palletHuType
                        : configsParamsCodes.boxHuType;
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
                }
            } else if (handlingUnitInfos.handlingUnits?.results[0]) {
                const handlingUnit = handlingUnitInfos.handlingUnits.results[0];
                const currentRoundId = storedObject['step10']?.data?.round?.id;

                // Check if handlingUnitOutbounds[0] exists and if the roundId matches
                if (
                    handlingUnit.handlingUnitOutbounds?.[0] &&
                    handlingUnit.handlingUnitOutbounds[0].roundId === currentRoundId &&
                    handlingUnit.type === configsParamsCodes.equipmentHuType
                ) {
                    data['handlingUnit'] = handlingUnit;
                    data['isHUToCreate'] = false;
                } else {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
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
