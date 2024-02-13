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
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { useAuth } from 'context/AuthContext';

export interface IHandlingUnitFinalChecksProps {
    dataToCheck: any;
}

export const HandlingUnitFinalChecks = ({ dataToCheck }: IHandlingUnitFinalChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const { graphqlRequestClient } = useAuth();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanPallet-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            if (
                handlingUnitInfos &&
                handlingUnitInfos?.handlingUnits &&
                handlingUnitInfos?.handlingUnits?.count != 0
            ) {
                const chosenLocationId = storedObject['step65'].data.chosenLocation.id;
                if (handlingUnitInfos.handlingUnits.results[0].locationId !== chosenLocationId) {
                    showError(t('messages:no-hu-location'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                const handlingUnit = handlingUnitInfos.handlingUnits.results[0];
                // HU origin/final identical = error
                if (handlingUnit.id == storedObject['step20'].data.handlingUnit.id) {
                    showError(t('messages:hu-origin-final-identical'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                if (
                    handlingUnitInfos.handlingUnits.results[0].category !==
                    parameters.HANDLING_UNIT_CATEGORY_STOCK
                ) {
                    showError(t('messages:only-stock-hu-move'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                // HU ok = next step
                const data: { [label: string]: any } = {};
                data['finalHandlingUnit'] = handlingUnit;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                const type =
                    scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                        ? parameters.HANDLING_UNIT_TYPE_PALLET
                        : parameters.HANDLING_UNIT_TYPE_BOX;

                const handlingUnitToCreate = {
                    name: scannedInfo,
                    barcode: scannedInfo,
                    code: scannedInfo,
                    type,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                    locationId: storedObject['step65'].data.chosenLocation.id,
                    stockOwnerId: storedObject['step20'].data.handlingUnit.stockOwnerId
                };

                const data: { [label: string]: any } = {};
                data['isHuToCreate'] = true;
                data['finalHandlingUnit'] = handlingUnitToCreate;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
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
