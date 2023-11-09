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
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos.isSuccess) {
            if (
                handlingUnitInfos.data &&
                handlingUnitInfos.data.handlingUnits.results.length != 0
            ) {
                const handlingUnit = handlingUnitInfos.data.handlingUnits.results[0];

                // HU with different Location = error
                if (handlingUnit?.locationId != storedObject.step10?.data?.finalLocation.id) {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    // HU ok = next step
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = handlingUnit;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            } else {
                // dummy HU to be created
                if (scannedInfo[0] != '0' && scannedInfo[0] != 'C') {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    const handlingUnitToCreate = {
                        name: scannedInfo
                    };
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = handlingUnitToCreate;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitInfos.data, scannedInfo]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
