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
import { useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        showSimilarLocations,
        isHuClosureLoading,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const handlingUnitContentArticleId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article
            ?.id;

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && locationInfos) {
            if (locationInfos.locations?.count === 0) {
                console.log('locationInfos', locationInfos);
                showError(t('messages:no-location'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
            if (locationInfos.locations?.count > 0) {
                const data: { [label: string]: any } = {};
                data['locations'] = locationInfos.locations?.results.map(
                    ({
                        id,
                        name,
                        barcode,
                        level,
                        handlingUnits,
                        category
                    }: {
                        id: string;
                        name: string;
                        barcode: string;
                        level: number;
                        handlingUnits: any;
                        category: any;
                    }) => {
                        return { id, name, barcode, level, handlingUnits, category };
                    }
                );
                if (handlingUnitContentArticleId) {
                    if (
                        data['locations'].filter(
                            (location: any) =>
                                location.handlingUnits?.filter(
                                    (hu: any) =>
                                        hu.handlingUnitContents.filter(
                                            (huc: any) =>
                                                huc.article.id == handlingUnitContentArticleId
                                        ).length > 0
                                ).length > 0
                        ).length === 0
                    ) {
                        console.log('No matching handling unit content', data);
                        showError(t('messages:unexpected-scanned-item'));
                        setResetForm(true);
                        return;
                    }
                }
                showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
            }
        }
    }, [locationInfos]);

    return (
        <WrapperForm>
            {(scannedInfo && !locationInfos) || isHuClosureLoading ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
