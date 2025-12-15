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
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        const data: { [label: string]: any } = {};
        if (scannedInfo && locationInfos.data) {
            if (locationInfos.data.locations?.count !== 0) {
                data['locations'] = locationInfos.data?.locations?.results.map(
                    ({
                        id,
                        name,
                        barcode,
                        level,
                        stockStatus,
                        category,
                        huManagement,
                        status
                    }: {
                        id: string;
                        name: string;
                        barcode: string;
                        level: number;
                        stockStatus: string;
                        category: number;
                        huManagement: boolean;
                        status: number;
                    }) => {
                        return {
                            id,
                            name,
                            barcode,
                            level,
                            stockStatus,
                            category,
                            huManagement,
                            status
                        };
                    }
                );

                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                showError(t('messages:no-location'));
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
    }, [locationInfos]);

    return <WrapperForm>{scannedInfo && !locationInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
