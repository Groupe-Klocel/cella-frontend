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
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IArticleOrFeatureChecksProps {
    dataToCheck: any;
}

export const ArticleOrFeatureChecks = ({ dataToCheck }: IArticleOrFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isClosureLoading, setIsClosureLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit,
        alternativeSubmitInput,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanArticleOrFeature-2: call and process frontAPIResponse
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/stock-management/scanArticleOrFeature`, {
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
            let found = false;
            const data: { [label: string]: any } = {};
            const handlingUnitContents = storedObject['step10'].data.roundHU.handlingUnitContents;
            if (fetchResult.resType === 'serialNumber') {
                // HUCF scanned
                const huCToCheck = fetchResult?.handlingUnitContentFeature.handlingUnitContentId;
                if (handlingUnitContents.some((item: any) => item.id === huCToCheck)) {
                    found = true;
                }
                if (found) {
                    //check stockStatus and reservation
                    data['resType'] = fetchResult.resType;
                    data['article'] = {
                        ...fetchResult.article,
                        id: fetchResult.article.articleId
                    };
                    data['feature'] = fetchResult.handlingUnitContentFeature;
                    data['handlingUnitContent'] =
                        fetchResult.handlingUnitContentFeature?.handlingUnitContent;
                    data['defaultQuantity'] = 1;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            } else {
                // EAN scanned
                if (
                    handlingUnitContents.some(
                        (item: any) => item.articleId === fetchResult.articleLuBarcodes[0].articleId
                    )
                ) {
                    found = true;
                    const articleId = fetchResult.articleLuBarcodes[0].articleId;
                    const handlingUnitContent = handlingUnitContents.filter(
                        (item: any) => item.articleId === articleId
                    )[0];
                    data['resType'] = fetchResult.resType;
                    data['article'] = fetchResult.articleLuBarcodes[0].article;
                    data['handlingUnitContent'] = handlingUnitContent;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
                //create HU or HUO
            }
            if (!found) {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
            }
            if (
                storedObject[`step${stepNumber}`] &&
                Object.keys(storedObject[`step${stepNumber}`]).length != 0
            ) {
                storage.set(process, JSON.stringify(storedObject));
            }
        }
    }, [fetchResult]);

    // handle box closure
    useEffect(() => {
        if (triggerAlternativeSubmit.triggerAlternativeSubmit) {
            if (!alternativeSubmitInput) {
                showError(t('messages:no-box-to-close'));
                triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
            }
            setIsClosureLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/preparation-management/closeBox`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        deleteDeclarativeHUO: false,
                        handlingUnitOutbound: alternativeSubmitInput,
                        roundHU: storedObject.step10.data.roundHU
                    })
                });
                const response = await res.json();
                if (res.ok) {
                    const step10Round = storedObject.step10.data.round;
                    storage.remove(process);
                    const roundHU = response.response.updatedRoundHU;

                    // Filter handlingUnitContents with quantity > 0
                    const filteredContents = roundHU.handlingUnitContents.filter(
                        (huc: any) => huc.quantity > 0
                    );

                    // Create a new roundHU object with the filtered contents
                    const roundHUWithFilteredContents = {
                        ...roundHU,
                        handlingUnitContents: filteredContents
                    };
                    const step10data = {
                        roundHU: roundHUWithFilteredContents,
                        round: step10Round
                    };
                    storedObject[`step10`] = { previousStep: 0, data: step10data };
                    storedObject[`step20`] = undefined;
                    storedObject[`step30`] = undefined;
                    storedObject['currentStep'] = 20;

                    storage.set(process, JSON.stringify(storedObject));
                    setIsClosureLoading(false);
                    triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
                    setTriggerRender(!triggerRender);
                    if (response.response.printResult == 'RenderedDocument') {
                        showSuccess(t('messages:success-print-data'));
                    } else {
                        showError(t('messages:error-print-data'));
                    }
                }
                if (!res.ok) {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:closure-failed'));
                    }
                    setIsClosureLoading(false);
                    triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
                }
            };
            fetchData();
        }
    }, [triggerAlternativeSubmit]);

    return <WrapperForm>{isLoading || isClosureLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
