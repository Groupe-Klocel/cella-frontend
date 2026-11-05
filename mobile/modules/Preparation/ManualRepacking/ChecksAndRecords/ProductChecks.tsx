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

export interface IProductChecksProps {
    dataToCheck: any;
}

export const ProductChecks = ({ dataToCheck }: IProductChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        articleLuBarcodesInfos,
        originalBox,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && articleLuBarcodesInfos) {
            const handleError = (message: string) => {
                showError(message);
                setResetForm(true);
                setScannedInfo(undefined);
            };
            // Product exists?
            if (articleLuBarcodesInfos.articleLuBarcodes?.count === 0) {
                handleError(t('messages:unknown-product'));
                return;
            }
            const articleLuBarcode = articleLuBarcodesInfos.articleLuBarcodes.results[0];
            // Product present in the original box with remaining quantity?
            const originalHuco = originalBox?.handlingUnitContentOutbounds?.find(
                (huco: any) =>
                    huco.handlingUnitContent?.articleId === articleLuBarcode.articleId &&
                    huco.pickedQuantity > 0
            );
            if (!originalHuco) {
                handleError(t('messages:unexpected-scanned-item'));
                return;
            }
            const data: { [label: string]: any } = {};
            data['articleLuBarcode'] = articleLuBarcode;
            data['article'] = articleLuBarcode.article;
            data['originalHuco'] = originalHuco;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                }
            });
        }
    }, [articleLuBarcodesInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
