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

export interface IHandlingUnitOutboundFinalChecksProps {
    dataToCheck: any;
}

export const HandlingUnitOutboundFinalChecks = ({
    dataToCheck
}: IHandlingUnitOutboundFinalChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL

    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos) {
            if (handlingUnitOutboundInfos.handlingUnitOutbounds?.count !== 0) {
                const expectedHUO =
                    storedObject['step10'].data.proposedRoundAdvisedAddresses[0].roundLineDetail
                        ?.handlingUnitContentOutbounds[0]?.handlingUnitOutbound;
                if (
                    handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].id ===
                    expectedHUO.id
                ) {
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] =
                        handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].handlingUnit;
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: data,
                        customFields: [
                            {
                                key: 'currentStep',
                                value: storedObject[`step${stepNumber}`].previousStep
                            }
                        ]
                    });
                } else {
                    showError(t('messages:wrong-handling-unit-outbound'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
