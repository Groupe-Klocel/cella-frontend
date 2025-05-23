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
        trigger: { setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    // ScanBox-3: manage information for persistence storage and front-end errors

    useEffect(() => {
        if (scannedInfo && articleLuBarcodesInfos) {
            if (articleLuBarcodesInfos.articleLuBarcodes?.count === 0) {
                showError(t('messages:no-articleLuBarcode'));
                setResetForm(true);
                setScannedInfo(undefined);
                return;
            }
            const listOfArticleId = storedObject[`step20`].data.childrenHandlingUnits
                .filter(
                    (childrenHandlingUnits: any) =>
                        childrenHandlingUnits.handlingUnitOutbounds[0].status === 510
                )
                .map((childrenHandlingUnits: any) => ({
                    articleId:
                        childrenHandlingUnits.handlingUnitOutbounds[0]
                            .handlingUnitContentOutbounds[0].handlingUnitContent.articleId,
                    handlingUnitOutboundId: childrenHandlingUnits.handlingUnitOutbounds[0].id
                }));
            const articleLuBarcode = articleLuBarcodesInfos.articleLuBarcodes?.results[0];
            console.log('listOfArticleId', listOfArticleId);
            console.log('articleLuBarcode', articleLuBarcode);
            const HUOToUpdate = listOfArticleId.find(
                (item: any) => item.articleId === articleLuBarcode.articleId
            )?.handlingUnitOutboundId;
            if (!HUOToUpdate) {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
                return;
            }
            console.log('HUOToUpdate', HUOToUpdate);
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                previousStep: 20,
                data: { HUOToUpdate }
            };
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender((prev: boolean) => !prev);
            setResetForm(false);
            setScannedInfo(undefined);
        }
    }, [articleLuBarcodesInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
