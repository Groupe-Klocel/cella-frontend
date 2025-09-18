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

export interface handlingUnitToCreate {
    name: string;
    barcode: any;
    type: number;
    status: number;
    category: number;
    locationId: string;
    code: string;
    handlingUnitContents: [];
}
export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender }
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //ScanPallet-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            if (handlingUnitInfos.handlingUnits?.count !== 0) {
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = handlingUnitInfos.handlingUnits?.results[0];
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

                const handlingUnitToCreate: handlingUnitToCreate = {
                    name: scannedInfo,
                    barcode: scannedInfo,
                    type,
                    status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                    category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                    locationId: storedObject['step15']?.data?.chosenLocation.id,
                    code: scannedInfo,
                    handlingUnitContents: []
                    //this will  have TBD in next steps:
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

    useEffect(() => {
        if (scannedInfo && !handlingUnitInfos) {
            const data: { [label: string]: any } = {};
            data['handlingUnit'] = scannedInfo;
            setTriggerRender(!triggerRender);
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [triggerRender]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
