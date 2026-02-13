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
import { Modal } from 'antd';

export interface IArticleChecksProps {
    dataToCheck: any;
    setTmpforceLocation?: any;
}

export const ArticleChecks = ({ dataToCheck }: IArticleChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        proposedHuos,
        articleLuBarcodesInfos,
        setResetForm,
        triggerAlternativeSubmit1,
        alternativeSubmitInput
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && articleLuBarcodesInfos) {
            if (articleLuBarcodesInfos.articleLuBarcodes?.count !== 0) {
                const articleLuBarcode = articleLuBarcodesInfos.articleLuBarcodes?.results[0];

                // Search in proposedHuos for an HUO that contains a handlingUnitContentOutbound with the corresponding articleId or if one is in progress
                let currentHuo = null;
                let currentHuco = null;

                for (const huo of proposedHuos || []) {
                    const matchingHuco = huo.handlingUnitContentOutbounds
                        ?.filter(
                            (huco: any) =>
                                huco.missingQuantity + huco.pickedQuantity < huco.quantityToBePicked
                        )
                        ?.find((huco: any) => huco.articleId === articleLuBarcode.articleId);
                    if (matchingHuco) {
                        currentHuo = huo;
                        currentHuco = matchingHuco;
                        break;
                    }
                }

                if (currentHuo && currentHuco) {
                    const data: { [label: string]: any } = {};
                    data['articleLuBarcode'] = articleLuBarcode;
                    data['currentHuo'] = currentHuo;
                    data['currentHuco'] = currentHuco;
                    data['article'] = articleLuBarcodesInfos.articleLuBarcodes.results[0].article;
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
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            // Check if all HUCOs of proposedHuos[0] are complete
            const firstHuo = proposedHuos[0];
            const incompleteHucos = firstHuo?.handlingUnitContentOutbounds?.filter(
                (huco: any) =>
                    huco.quantityToBePicked !== huco.missingQuantity + huco.pickedQuantity
            );

            if (incompleteHucos && incompleteHucos.length > 0) {
                Modal.confirm({
                    title: t('messages:confirmation'),
                    content: t('messages:confirm-incomplete-box-closure'),
                    onOk: () => {
                        // Continue with dispatches
                        const step40Data: { [label: string]: any } = {};
                        step40Data['currentHuo'] = proposedHuos[0];
                        step40Data['isBoxForcedClosed'] = true;
                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: 'step40',
                            object: {
                                ...storedObject['step40'],
                                data: step40Data
                            }
                        });

                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: 'step50',
                            object: {
                                ...storedObject['step50'],
                                data: 'allQuantites'
                            }
                        });
                        triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    },
                    onCancel: () => {
                        // Return to current step
                        triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    }
                });
                return;
            }

            const step40Data: { [label: string]: any } = {};
            step40Data['currentHuo'] = proposedHuos[0];
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: 'step40',
                object: {
                    ...storedObject['step40'],
                    data: step40Data
                }
            });

            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: 'step50',
                object: {
                    ...storedObject['step50'],
                    data: 'allQuantites'
                }
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
