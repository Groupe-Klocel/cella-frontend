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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import { Modal } from 'antd';

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
        action1Trigger,
        alternativeSubmitInput,
        showSimilarLocations,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    const handlingUnitContentArticleId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article
            ?.id;
    const handlingUnitContentId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.id;
    const ignoreHUContentIds = storedObject.ignoreHUContentIds || [];

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
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                storage.set(process, JSON.stringify(storedObject));
            }
        }
        // if (
        //     storedObject[`step${stepNumber}`] &&
        //     Object.keys(storedObject[`step${stepNumber}`]).length != 0
        // ) {
        //     storage.set(process, JSON.stringify(storedObject));
        // }
    }, [locationInfos]);

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
            functionName: 'RF_pickAndPack_closeShippingPallet',
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
                if (ignoreHUContentIds.length > 0) {
                    newStoredObject.ignoreHUContentIds = ignoreHUContentIds;
                } else {
                    newStoredObject.ignoreHUContentIds = [];
                }
                const { updatedRound } = closeHUOsResult.executeFunction.output.output;

                let remainingHUContentIds = updatedRound.roundAdvisedAddresses
                    .filter((raa: any) => {
                        return !newStoredObject.ignoreHUContentIds.includes(
                            raa.handlingUnitContentId
                        );
                    })
                    .filter((raa: any) => raa.quantity != 0);
                if (remainingHUContentIds.length === 0) {
                    newStoredObject.ignoreHUContentIds = [];
                    remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
                        (raa: any) => raa.quantity != 0
                    );
                }

                const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses.filter(
                    (raa: any) => raa.quantity != 0
                );
                const data = {
                    proposedRoundAdvisedAddresses: roundAdvisedAddresses.filter(
                        (raa: any) =>
                            raa.handlingUnitContentId ==
                            remainingHUContentIds[0].handlingUnitContentId
                    ),
                    round: updatedRound,
                    pickAndPackType: updatedRound.equipment.checkPosition ? 'detail' : 'fullBox'
                };
                newStoredObject['currentStep'] = 10;
                if (storedObject[`step5`]) {
                    newStoredObject[`step5`] = {
                        ...storedObject[`step5`]
                    };
                }
                newStoredObject[`step10`] = { previousStep: storedObject[`step5`] ? 5 : 0, data };
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
        if (action1Trigger.action1Trigger) {
            action1Trigger.setAction1Trigger(false);
            storedObject.ignoreHUContentIds = [...ignoreHUContentIds, handlingUnitContentId];
            let remainingHUContentIds = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => {
                    return !storedObject.ignoreHUContentIds.includes(raa.handlingUnitContentId);
                })
                .filter((raa: any) => raa.quantity != 0);
            if (remainingHUContentIds.length === 0) {
                storedObject.ignoreHUContentIds = [];
                remainingHUContentIds = storedObject[
                    `step10`
                ]?.data?.round.roundAdvisedAddresses.filter((raa: any) => raa.quantity != 0);
            }
            storedObject['step10'].data.proposedRoundAdvisedAddresses = storedObject[
                `step10`
            ]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => raa.quantity != 0)
                .filter(
                    (raa: any) =>
                        raa.handlingUnitContentId ===
                        remainingHUContentIds[0]?.handlingUnitContentId
                );
            showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [action1Trigger]);

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
