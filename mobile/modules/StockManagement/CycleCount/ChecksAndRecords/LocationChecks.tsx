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
import { createCycleCountError } from 'helpers/utils/crudFunctions/cycleCount';
import { useEffect } from 'react';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //retrieve necessary values for CC specifc checks
    const currentCycleCountId: string = storedObject.step10?.data?.cycleCount?.id;
    const locationIdToCheck: string = storedObject.step10?.data?.currentCycleCountLine?.locationId;

    useEffect(() => {
        if (scannedInfo && locationInfos.data) {
            if (locationInfos.data.locations?.count !== 0) {
                const location = locationInfos.data?.locations?.results;
                const foundLocation = location.find((loc: any) => loc.id === locationIdToCheck);
                if (foundLocation) {
                    const data: { [label: string]: any } = {};
                    data['locations'] = locationInfos.data?.locations?.results.map(
                        ({
                            id,
                            name,
                            barcode,
                            level,
                            huManagement
                        }: {
                            id: string;
                            name: string;
                            barcode: string;
                            level: string;
                            huManagement: boolean;
                        }) => {
                            return { id, name, barcode, level, huManagement };
                        }
                    );

                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                } else {
                    createCycleCountError(
                        currentCycleCountId,
                        `Step ${stepNumber} - ${t(
                            'messages:unexpected-scanned-item'
                        )} - ${scannedInfo}`
                    );
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:no-location'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [locationInfos]);

    return <WrapperForm>{scannedInfo && !locationInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
