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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IArticleChecksProps {
    dataToCheck: any;
    setTmpforceLocation?: any;
}

export const ArticleChecks = ({ dataToCheck, setTmpforceLocation }: IArticleChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        contents,
        articleLuBarcodesInfos,
        featureTypeDetailsInfos,
        setResetForm,
        triggerAlternativeSubmit1,
        action1Trigger,
        alternativeSubmitInput
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const handlingUnitContentArticleId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article
            ?.id;
    const handlingUnitContentId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.id;
    const ignoreHUContentIds = storedObject.ignoreHUContentIds || [];

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && articleLuBarcodesInfos) {
            if (articleLuBarcodesInfos.articleLuBarcodes?.count !== 0) {
                const articleLuBarcode = articleLuBarcodesInfos.articleLuBarcodes?.results[0];
                if (
                    articleLuBarcode.articleId ==
                    storedObject[`step10`].data.proposedRoundAdvisedAddresses[0]
                        ?.handlingUnitContent?.articleId
                ) {
                    const data: { [label: string]: any } = {};
                    data['articleLuBarcode'] = articleLuBarcode;
                    data['contents'] = contents;
                    data['article'] = contents.find(
                        (content: any) =>
                            content.articleId ==
                            articleLuBarcodesInfos.articleLuBarcodes.results[0].articleId
                    ).article;
                    if (featureTypeDetailsInfos) {
                        data['article']['featureType'] = featureTypeDetailsInfos;
                    } else {
                        data['article']['featureType'] = [];
                    }
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: {
                            ...storedObject[`step${stepNumber}`],
                            data
                        }
                    });
                } else {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:no-articleLuBarcode'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
    }, [articleLuBarcodesInfos]);

    useEffect(() => {
        if (action1Trigger.action1Trigger) {
            action1Trigger.setAction1Trigger(false);
            let newIgnoreHUContentIds = [...ignoreHUContentIds, handlingUnitContentId];
            let remainingHUContentIds = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => {
                    return !newIgnoreHUContentIds.includes(raa.handlingUnitContentId);
                })
                .filter((raa: any) => raa.quantity != 0);
            if (remainingHUContentIds.length === 0) {
                newIgnoreHUContentIds = [];
                remainingHUContentIds = storedObject[
                    `step10`
                ]?.data?.round.roundAdvisedAddresses.filter((raa: any) => raa.quantity != 0);
            }
            const raaForHUC = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => raa.quantity != 0)
                .filter(
                    (raa: any) =>
                        raa.handlingUnitContentId ===
                        remainingHUContentIds[0]?.handlingUnitContentId
                );

            // Find next roundAdvisedAddress with different locationId
            const currentLocationId =
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.locationId;
            const differentLocationRaa = raaForHUC.find(
                (raa: any) => raa.locationId !== currentLocationId
            );
            const raaToUse = differentLocationRaa || raaForHUC[0];

            // Apply checkPosition condition to propose one or cumulated article
            const newProposedRoundAdvisedAddresses = storedObject[`step10`]?.data?.round.equipment
                .checkPosition
                ? [raaToUse]
                : raaForHUC;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step10`,
                object: {
                    ...storedObject[`step10`],
                    data: {
                        ...storedObject[`step10`]?.data,
                        proposedRoundAdvisedAddresses: newProposedRoundAdvisedAddresses
                    }
                },
                customFields: [{ key: 'ignoreHUContentIds', value: newIgnoreHUContentIds }]
            });
        }
    }, [action1Trigger]);

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
                const newStoredObject: any = storedObject;
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
                dispatch({
                    type: 'UPDATE_BY_PROCESS',
                    processName,
                    object: newStoredObject
                });
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
            dispatch({
                type: 'ON_BACK',
                processName: processName,
                stepToReturn: `step20`
            });
            triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
        }
    }, [triggerAlternativeSubmit1, alternativeSubmitInput]);

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
