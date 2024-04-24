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
import { showError, LsIsSecured, showSuccess } from '@helpers';
import { gql } from 'graphql-request';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useAuth } from 'context/AuthContext';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const { graphqlRequestClient } = useAuth();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1,
        alternativeSubmitInput,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && locationInfos) {
            if (locationInfos.locations?.count !== 0) {
                const location = locationInfos.locations?.results[0];
                if (
                    location.id ==
                    storedObject[`step10`].data.proposedRoundAdvisedAddresses[0].locationId
                ) {
                    const data: { [label: string]: any } = {};
                    data['locations'] = locationInfos.locations?.results.map(
                        ({
                            id,
                            name,
                            barcode,
                            level,
                            handlingUnits
                        }: {
                            id: string;
                            name: string;
                            barcode: string;
                            level: number;
                            handlingUnits: any;
                        }) => {
                            return { id, name, barcode, level, handlingUnits };
                        }
                    );
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                } else {
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

    // due to
    const [isHuClosureLoading, setIsHuClosureLoading] = useState(false);
    async function closeHUO(currentShippingPalletId: any) {
        setIsHuClosureLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_RF_fullBox_close_shippingPallet',
            event: {
                input: { currentShippingPalletId }
            }
        };

        try {
            const closeHUOsResult = await graphqlRequestClient.request(query, variables);
            if (closeHUOsResult.executeFunction.status === 'ERROR') {
                showError(closeHUOsResult.executeFunction.output);
            } else if (
                closeHUOsResult.executeFunction.status === 'OK' &&
                closeHUOsResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${closeHUOsResult.executeFunction.output.output.code}`));
                console.log('Backend_message', closeHUOsResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:hu-ready-to-be-loaded'));
                const storedObject = JSON.parse(storage.get(process) || '{}');
                storage.remove(process);
                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                const { updatedRound } = closeHUOsResult.executeFunction.output.output;
                const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses
                    .filter((raa: any) => raa.quantity != 0)
                    .sort((a: any, b: any) => {
                        return a.roundOrderId - b.roundOrderId;
                    });
                const data = {
                    proposedRoundAdvisedAddresses: roundAdvisedAddresses.filter(
                        (raa: any) =>
                            raa.handlingUnitContentId ==
                            roundAdvisedAddresses[0].handlingUnitContentId
                    ),
                    round: updatedRound
                };
                newStoredObject['currentStep'] = 10;
                newStoredObject[`step10`] = { previousStep: 0, data };
                delete newStoredObject['step10']['data']['currentShippingPallet'];
                storage.set(process, JSON.stringify(newStoredObject));
                setTriggerRender(!triggerRender);
            }
            setIsHuClosureLoading(false);
        } catch (error) {
            showError(t('messages:error-updating-data'));
            console.log('updateHUOsError', error);
            setIsHuClosureLoading(false);
        }
    }

    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            if (!alternativeSubmitInput) {
                showError(t('messages:no-hu-to-close'));
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
            } else {
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                closeHUO(alternativeSubmitInput);
            }
        }
    }, [triggerAlternativeSubmit1, alternativeSubmitInput]);

    return (
        <WrapperForm>
            {(scannedInfo && !locationInfos) || isHuClosureLoading ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
