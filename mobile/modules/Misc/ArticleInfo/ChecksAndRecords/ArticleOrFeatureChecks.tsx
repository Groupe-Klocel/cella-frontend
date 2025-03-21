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
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';

export interface IArticleOrFeatureChecksProps {
    dataToCheck: any;
}

export const ArticleOrFeatureChecks = ({ dataToCheck }: IArticleOrFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanEANorID-2: call and process frontAPIResponse
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/stock-management/scanArticleOrFeature/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        scannedInfo
                    })
                });
                const response = await res.json();
                setFetchResult(response.response);
                if (!res.ok) {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:check-failed'));
                    }
                    // setTriggerOnBack(true);
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    // ScanBox-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult) {
            if (fetchResult.resType === 'serialNumber') {
                const data: { [label: string]: any } = {};
                data['resType'] = fetchResult.resType;
                data['articleLuBarcodes'] = [fetchResult.article];
                data['feature'] = fetchResult.handlingUnitContentFeature;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                const data: { [label: string]: any } = {};
                data['resType'] = fetchResult.resType;
                data['articleLuBarcodes'] = fetchResult.articleLuBarcodes;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [fetchResult]);

    return <WrapperForm>{isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
