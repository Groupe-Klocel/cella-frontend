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
        uniqueHU,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL

    useEffect(() => {
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
                if (
                    handlingUnitInfos.handlingUnits?.results[0].handlingUnitContents.some(
                        (content: any) =>
                            content.articleId === deliveryLine.articleId &&
                            content.stockOwnerId === deliveryLine.stockOwnerId &&
                            content.stockStatus === deliveryLine.stockStatus &&
                            content.reservation === deliveryLine.reservation &&
                            content.quantity > 0
                    )
                ) {
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = handlingUnitInfos.handlingUnits?.results[0];
                    setTriggerRender(!triggerRender);
                    // specific to handle unique handling unit in selected location and back function for next step
                    if (!uniqueHU) {
                        storedObject[`step${stepNumber}`] = {
                            ...storedObject[`step${stepNumber}`],
                            data
                        };
                    } else {
                        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
                        storedObject[`step${stepNumber}`] = {
                            data
                        };
                    }
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
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitInfos]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
