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

export interface IPalletChecksProps {
    dataToCheck: any;
}

export const PalletChecks = ({ dataToCheck }: IPalletChecksProps) => {
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
    //ScanPallet-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo) {
            if (handlingUnitInfos.handlingUnits?.count !== 0) {
                if (
                    handlingUnitInfos.handlingUnits?.count !== 0 &&
                    handlingUnitInfos.handlingUnits?.results[0].type ===
                        parameters.HANDLING_UNIT_TYPE_PALLET &&
                    handlingUnitInfos.handlingUnits.results[0].category ===
                        parameters.HANDLING_UNIT_CATEGORY_OUTBOUND &&
                    handlingUnitInfos.handlingUnits.results[0].handlingUnitOutbounds[0].status <=
                        configs.HANDLING_UNIT_OUTBOUND_STATUS_LOADED
                ) {
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = handlingUnitInfos.handlingUnits?.results[0];
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                } else {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                if (scannedInfo[0] != '1' && scannedInfo[0] != 'P') {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                const handlingUnitToCreate = {
                    name: scannedInfo,
                    code: scannedInfo,
                    type: parameters.HANDLING_UNIT_TYPE_PALLET,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_OUTBOUND
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
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
