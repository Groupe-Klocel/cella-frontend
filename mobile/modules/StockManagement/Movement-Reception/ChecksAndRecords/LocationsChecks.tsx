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
import { kMaxLength } from 'buffer';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';

export interface ILocationChecksProps {
    dataToCheck: any;
    showEmptyLocations?: any;
}

export const LocationChecks = ({ dataToCheck, showEmptyLocations }: ILocationChecksProps) => {
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
    //ScanLocation-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && locationInfos.data) {
            if (
                locationInfos.data.locations?.count !== 0 &&
                locationInfos.data.location?.results[0]?.category !=
                    configs.LOCATION_CATEGORY_RECEPTION
            ) {
                const data: { [label: string]: any } = {};
                data['locations'] = locationInfos.data?.locations?.results.map(
                    ({
                        id,
                        name,
                        barcode,
                        level
                    }: {
                        id: string;
                        name: string;
                        barcode: string;
                        level: number;
                    }) => {
                        return { id, name, barcode, level };
                    }
                );
                setTriggerRender(!triggerRender);
                showEmptyLocations?.setShowEmptyLocations(false);
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
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
