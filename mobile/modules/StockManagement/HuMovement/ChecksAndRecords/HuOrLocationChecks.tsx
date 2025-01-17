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
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';

export interface IHuOrLocationChecksProps {
    dataToCheck: any;
}

export const HuOrLocationChecks = ({ dataToCheck }: IHuOrLocationChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit,
        setResetForm,
        showEmptyLocations,
        showSimilarLocations
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanEANorID-2: call and process frontAPIResponse
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/stock-management/scanHuOrLocation/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        scannedInfo
                    })
                });
                const response = await res.json();
                setFetchResult(response.response);
                if (!res.ok) {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:check-failed'));
                    }
                    // setTriggerOnBack(true);
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                setIsLoading(false);
                // showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                // showEmptyLocations?.showEmptyLocations.setShowEmptyLocations(false);
            };
            fetchData();
        }
    }, [scannedInfo]);

    // ScanBox-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult) {
            // No HU and no Location = error
            if (!fetchResult.handlingUnit && !fetchResult.location) {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
            }

            if (fetchResult.resType === 'handlingUnit') {
                // HU without Location = error
                if (!fetchResult.location) {
                    showError(t('messages:no-location-hu'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // HU origin/final identical = error
                else if (
                    fetchResult.handlingUnit.id == storedObject['step20'].data.handlingUnit.id
                ) {
                    showError(t('messages:hu-origin-final-identical'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // final HU type > origin HU type = error (ex: PAL(71100) to BOX(71110))
                else if (
                    fetchResult.handlingUnit.type > storedObject['step20'].data.handlingUnit.type
                ) {
                    showError(t('messages:unexpected-hu-type'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                //final HU category != stock = error
                else if (
                    fetchResult.handlingUnit.category !== parameters.HANDLING_UNIT_CATEGORY_STOCK
                ) {
                    showError(t('messages:only-stock-hu-move'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
                // final HU with different article = error
                else if (
                    fetchResult.handlingUnit.type != parameters.HANDLING_UNIT_TYPE_PALLET &&
                    storedObject['step20'].data.handlingUnit.handlingUnitContents &&
                    fetchResult.handlingUnit.handlingUnitContents[0].articleId !=
                        storedObject['step20'].data.handlingUnit.handlingUnitContents[0].articleId
                ) {
                    showError(t('messages:unexpected-hu-article'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    // HU and Location = next step
                    const data: { [label: string]: any } = {};
                    data['resType'] = fetchResult.resType;
                    data['finalLocation'] = [fetchResult.location];
                    data['finalHandlingUnit'] = fetchResult.handlingUnit;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                    showEmptyLocations?.showEmptyLocations.setShowEmptyLocations(false);
                }
            }

            // Location : next step
            if (fetchResult.resType === 'location' && fetchResult.location) {
                const data: { [label: string]: any } = {};

                if (triggerAlternativeSubmit?.triggerAlternativeSubmit) {
                    data['finalHandlingUnit'] = storedObject['step20'].data.handlingUnit;
                }

                data['resType'] = fetchResult.resType;
                data['finalLocation'] = [fetchResult.location];
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                showEmptyLocations?.showEmptyLocations.setShowEmptyLocations(false);
            }

            if (
                storedObject[`step${stepNumber}`] &&
                Object.keys(storedObject[`step${stepNumber}`]).length != 0
            ) {
                storage.set(process, JSON.stringify(storedObject));
            }
        }
    }, [fetchResult]);

    return <WrapperForm>{isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
