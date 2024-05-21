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

export interface IArticleChecksProps {
    dataToCheck: any;
}

export const ArticleChecks = ({ dataToCheck }: IArticleChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        articleLuBarcodesInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // ScanArticle: manage information for persistence storage and front-end errors
    useEffect(() => {
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

                if (matchingArticleLuBarcodes.length > 0) {
                    if (!storedObject[`step30`].data.isHuToCreate) {
                        const isArticleInHU = storedObject[
                            `step30`
                        ].data.receptionHandlingUnit.handlingUnitContents.some((huc: any) => {
                            return articleLuBarcodes.some(
                                (articleLuBarcode: any) =>
                                    articleLuBarcode.articleId == huc.articleId
                            );
                        });
                        if (!isArticleInHU) {
                            showError(t('messages:unexpected-scanned-item'));
                            setResetForm(true);
                            setScannedInfo(undefined);
                        }
                    }
                    const data: { [label: string]: any } = {};
                    data['articleLuBarcodes'] = matchingArticleLuBarcodes;
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
                showError(t('messages:no-articleLuBarcode'));
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
    }, [articleLuBarcodesInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
