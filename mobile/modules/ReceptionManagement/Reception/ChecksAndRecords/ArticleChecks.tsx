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
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface IArticleChecksProps {
    dataToCheck: any;
}

export const ArticleChecks = ({ dataToCheck }: IArticleChecksProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        articleLuBarcodesInfos,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};
    // ScanArticle: manage information for persistence storage and
    //  front-end errors
    useEffect(() => {
        const data: { [label: string]: any } = {};
        if (scannedInfo && articleLuBarcodesInfos.data) {
            if (articleLuBarcodesInfos.data.articleLuBarcodes?.count !== 0) {
                const articleLuBarcodes = articleLuBarcodesInfos.data.articleLuBarcodes?.results;
                //Retrieve articleLuBarcodes in the current purchaseOrder
                const matchingArticleLuBarcodes =
                    articleLuBarcodesInfos.data.articleLuBarcodes?.results.filter(
                        (articleLuBarcode: any) => {
                            return storedObject[
                                `step10`
                            ].data.purchaseOrder.purchaseOrderLines.some(
                                (poLine: any) => articleLuBarcode.articleId === poLine.articleId
                            );
                        }
                    );
                const POLineByArticle = storedObject[
                    `step10`
                ].data.purchaseOrder.purchaseOrderLines.filter(
                    (purchaseOrderLine: any) =>
                        purchaseOrderLine.articleId === articleLuBarcodes[0].articleId
                );
                // group POLines by articleId & stockOwnerId & reservation & blockingStatus
                const groupedPOLines = POLineByArticle.reduce((acc: any, curr: any) => {
                    const key = `${curr.articleId}-${curr.stockOwnerId}-${curr.reservation}-${curr.blockingStatus}`;
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(curr);
                    return acc;
                }, {});

                let firstPassSelectedPOLine: any = null;
                let secondPassSelectedPOLine: any = null;
                // Prioritize groups with already received quantities
                Object.keys(groupedPOLines).forEach((key) => {
                    const hasReceived = groupedPOLines[key].some(
                        (purchaseOrderLine: any) =>
                            purchaseOrderLine.receivedQuantity > 0 &&
                            purchaseOrderLine.receivedQuantity < purchaseOrderLine.quantity
                    );
                    if (hasReceived) {
                        firstPassSelectedPOLine = groupedPOLines[key];
                    }
                });
                // If none found, fallback to groups with remaining quantity to receive
                if (!firstPassSelectedPOLine) {
                    Object.keys(groupedPOLines).forEach((key) => {
                        const hasToReceive = groupedPOLines[key].some(
                            (purchaseOrderLine: any) =>
                                purchaseOrderLine.receivedQuantity < purchaseOrderLine.quantity
                        );
                        if (hasToReceive) {
                            firstPassSelectedPOLine = groupedPOLines[key];
                        }
                    });
                }
                // If still none found, fallback to groups with remaining quantityMax to receive
                if (!firstPassSelectedPOLine) {
                    Object.keys(groupedPOLines).forEach((key) => {
                        const hasToReceiveMax = groupedPOLines[key].some(
                            (purchaseOrderLine: any) =>
                                purchaseOrderLine.receivedQuantity < purchaseOrderLine.quantityMax
                        );
                        if (hasToReceiveMax) {
                            secondPassSelectedPOLine = groupedPOLines[key];
                        }
                    });
                }

                const remainingPOLines = storedObject[
                    `step10`
                ].data.purchaseOrder.purchaseOrderLines.filter(
                    (poLine: any) =>
                        poLine.articleId === matchingArticleLuBarcodes[0]?.articleId &&
                        poLine.receivedQuantity < poLine.quantityMax
                );
                if (matchingArticleLuBarcodes.length > 0 && remainingPOLines.length > 0) {
                    data['currentPurchaseOrderLine'] =
                        firstPassSelectedPOLine ?? secondPassSelectedPOLine;
                    data['articleLuBarcodes'] = matchingArticleLuBarcodes;
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
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [articleLuBarcodesInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
