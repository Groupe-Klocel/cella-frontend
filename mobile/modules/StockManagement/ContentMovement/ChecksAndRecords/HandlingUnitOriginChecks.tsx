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
import parameters from '../../../../../common/parameters.json';

export interface IHandlingUnitOriginChecksProps {
    dataToCheck: any;
}

export const HandlingUnitOriginChecks = ({ dataToCheck }: IHandlingUnitOriginChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender },
        isEnforcedValue,
        setResetForm
    } = dataToCheck;

    const onBack = (fromStep: number) => {
        setTriggerRender(!triggerRender);
        for (let i = fromStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = fromStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanPallet-3: manage information for persistence storage and front-end errors
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
                    showError(t('messages:no-huc-quantity'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    if (isEnforcedValue) {
                        onBack(storedObject.currentStep);
                    }
                    return;
                }
                const handlingUnitInfosFiltered = {
                    ...handlingUnitInfos.handlingUnits.results[0],
                    handlingUnitContents: handlingUnitContentsFiltered
                };
                const chosenLocationId = storedObject['step15'].data.chosenLocation.id;
                if (handlingUnitInfosFiltered.locationId !== chosenLocationId) {
                    showError(t('messages:no-hu-location'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    if (isEnforcedValue) {
                        onBack(storedObject.currentStep);
                    }
                    return;
                }
                if (
                    handlingUnitInfosFiltered.category !== parameters.HANDLING_UNIT_CATEGORY_STOCK
                ) {
                    showError(t('messages:only-stock-hu-move'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    if (isEnforcedValue) {
                        onBack(storedObject.currentStep);
                    }
                    return;
                }
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = handlingUnitInfosFiltered;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                showError(t('messages:no-hu-or-empty'));
                setResetForm(true);
                setScannedInfo(undefined);
                if (isEnforcedValue) {
                    onBack(storedObject.currentStep);
                }
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
