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

export interface IArticleChecksProps {
    dataToCheck: any;
}

export const ArticleChecks = ({ dataToCheck }: IArticleChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        articleLuBarcodesInfos,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL
    // ScanBox-3: manage information for persistence storage and front-end errors

    useEffect(() => {
        if (scannedInfo && articleLuBarcodesInfos) {
            if (articleLuBarcodesInfos.articleLuBarcodes?.count !== 0) {
                const articleLuBarcode = articleLuBarcodesInfos.articleLuBarcodes?.results[0];
                if (
                    articleLuBarcode.articleId ==
                    storedObject[`step10`]?.data?.movement?.articleIdStr
                ) {
                    const data: { [label: string]: any } = {};
                    data['articleLuBarcode'] = articleLuBarcode;
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

    return (
        <WrapperForm>
            {scannedInfo && !articleLuBarcodesInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
