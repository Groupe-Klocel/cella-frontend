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
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';

export interface IHandlingUnitOutboundFinalChecksProps {
    dataToCheck: any;
}

export const HandlingUnitOutboundFinalChecks = ({
    dataToCheck
}: IHandlingUnitOutboundFinalChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
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
                    setTriggerRender(!triggerRender);
                    storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
                    storedObject[`step${stepNumber}`] = {
                        data
                    };
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
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
