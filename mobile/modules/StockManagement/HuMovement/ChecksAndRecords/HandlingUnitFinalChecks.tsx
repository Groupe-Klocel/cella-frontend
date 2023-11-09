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
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';

export interface IHandlingUnitFinalChecksProps {
    dataToCheck: any;
}

export const HandlingUnitFinalChecks = ({ dataToCheck }: IHandlingUnitFinalChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

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
    useEffect(() => {
        if (scannedInfo) {
            if (handlingUnitInfos.data && handlingUnitInfos.data.handlingUnits) {
                const handlingUnit = handlingUnitInfos.data.handlingUnits.results[0];
                // HU origin/final identical = error
                if (handlingUnit.id == storedObject['step20'].data.handlingUnit.id) {
                    showError(t('messages:hu-origin-final-identical'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // HU with different Location = error
                else if (handlingUnit.locationId != storedObject['step35'].data.chosenLocation.id) {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // final HU type > origin HU type = error (ex: PAL(71100) to BOX(71110))
                else if (handlingUnit.type > storedObject['step20'].data.handlingUnit.type) {
                    showError(t('messages:unexpected-hu-type'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // final HU with different article = error
                else if (
                    handlingUnit.handlingUnitContents[0].article_id !=
                    storedObject['step20'].data.handlingUnit.handlingUnitContents[0].article_id
                ) {
                    showError(t('messages:unexpected-hu-article'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    // HU ok = next step
                    const data: { [label: string]: any } = {};
                    data['isHuToCreate'] = false;
                    data['handlingUnit'] = handlingUnit;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            } else {
                // dummy HU to be created
                if (scannedInfo[0] != '0' && scannedInfo[0] != 'P') {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }

                const handlingUnitToCreate = {
                    name: scannedInfo,
                    barcode: scannedInfo,
                    code: scannedInfo,
                    type: parameters.HANDLING_UNIT_TYPE_PALLET,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                    locationId: storedObject['step30'].data.finalLocation[0].id,
                    stockOwnerId: storedObject['step20'].data.handlingUnit.stockOwnerId
                };

                const data: { [label: string]: any } = {};
                data['isHuToCreate'] = true;
                data['handlingUnit'] = handlingUnitToCreate;
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
    }, [handlingUnitInfos.data]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
