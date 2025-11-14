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
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        uniqueHU,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL

    useEffect(() => {
        let data: { [label: string]: any } = {};
        if (scannedInfo && handlingUnitInfos) {
            if (
                handlingUnitInfos.handlingUnits?.count !== 0 &&
                handlingUnitInfos.handlingUnits?.results[0].category ===
                    parameters.HANDLING_UNIT_CATEGORY_STOCK &&
                handlingUnitInfos.handlingUnits?.results[0].locationId ==
                    storedObject['step10'].data.proposedRoundAdvisedAddresses[0].locationId
            ) {
                const deliveryLine =
                    storedObject['step10'].data.proposedRoundAdvisedAddresses[0].roundLineDetail
                        .deliveryLine;
                const filtersForContent = (content: any) =>
                    content.articleId === deliveryLine.articleId &&
                    content.stockOwnerId === deliveryLine.stockOwnerId &&
                    content.stockStatus === deliveryLine.stockStatus &&
                    content.reservation === deliveryLine.reservation &&
                    content.quantity > 0;
                if (
                    handlingUnitInfos.handlingUnits?.results[0].handlingUnitContents.some(
                        filtersForContent
                    )
                ) {
                    const filteredContents =
                        handlingUnitInfos.handlingUnits?.results[0].handlingUnitContents.filter(
                            filtersForContent
                        );
                    data['handlingUnit'] = {
                        ...handlingUnitInfos.handlingUnits?.results[0],
                        handlingUnitContents: filteredContents
                    };
                } else {
                    showError(t('messages:wrong-article-stockOwner-stockStatus-or-reservation'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
            // storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
