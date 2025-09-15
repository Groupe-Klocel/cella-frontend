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
import configs from '../../../../../common/configs.json';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
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
    //ScanHU: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            const goodsIn = storedObject['step20'].data.chosenGoodsIn;
            if (handlingUnitInfos.handlingUnits?.count !== 0) {
                const huToCheck = handlingUnitInfos.handlingUnits.results[0];
                if (huToCheck.category !== parameters.HANDLING_UNIT_CATEGORY_INBOUND) {
                    showError(t('messages:not-inbound-hu'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                let isHUInGoodsIn = false;
                if (goodsIn) {
                    if (goodsIn === 'to-be-created') {
                        isHUInGoodsIn = true;
                    } else {
                        for (const roundLine of goodsIn.roundLines) {
                            for (const details of roundLine.roundLineDetails) {
                                for (const content of details.handlingUnitContentInbounds) {
                                    const handlingUnitId =
                                        content.handlingUnitContent.handlingUnitId;
                                    if (handlingUnitId.includes(huToCheck.id)) {
                                        isHUInGoodsIn = true;
                                    }
                                }
                            }
                        }
                    }
                }
                const selectedLocation = storedObject['step100']?.data?.chosenLocation;
                if (selectedLocation) {
                    if (selectedLocation.id !== huToCheck.locationId) {
                        showError(
                            t('messages:hu-exists-other-location', {
                                locationName: huToCheck?.location?.name
                            })
                        );
                        setResetForm(true);
                        setScannedInfo(undefined);
                        return;
                    }
                }
                if (!isHUInGoodsIn) {
                    showError(t('messages:hu-already-used'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }
                const data: { [label: string]: any } = {};
                data['isHuToCreate'] = false;
                data['handlingUnit'] = huToCheck;
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
                    //this should be a default packing model entered here (based on type)
                    code: scannedInfo,
                    type,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_INBOUND
                    //this will  have TBD in next steps:
                    // locationId: storedObject['step65'].data.chosenLocation.id,
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
