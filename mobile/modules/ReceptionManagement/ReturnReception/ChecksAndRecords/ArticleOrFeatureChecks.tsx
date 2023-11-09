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
import { Modal } from 'antd';
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
        triggerAlternativeSubmit1,
        alternativeSubmitInput1,
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
                        if (response.error.code === 'FAPI_000001') {
                            Modal.confirm({
                                title: (
                                    <span style={{ fontSize: '14px' }}>
                                        {t('messages:article-creation-confirm')}
                                    </span>
                                ),
                                onOk: () => {
                                    console.log('CreateFeature:');
                                    const data: { [label: string]: any } = {};
                                    data['resType'] = 'serialNumber';
                                    data['feature'] = { value: scannedInfo };
                                    data['defaultQuantity'] = 1;
                                    setTriggerRender(!triggerRender);
                                    storedObject[`step${stepNumber}`] = {
                                        ...storedObject[`step${stepNumber}`],
                                        data
                                    };
                                    storage.set(process, JSON.stringify(storedObject));
                                },
                                onCancel: () => {
                                    console.log('Reset');
                                    setResetForm(true);
                                    setIsLoading(false);
                                    setScannedInfo(undefined);
                                },
                                okText: t('messages:confirm'),
                                cancelText: t('messages:cancel'),
                                bodyStyle: { fontSize: '2px' }
                            });
                        } else {
                            showError(t(`errors:${response.error.code}`));
                        }
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

    console.log('DLA ftch', fetchResult);

    // ScanBox-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult) {
            let found = false;
            if (fetchResult.resType === 'serialNumber') {
                // HUCF scanned
                const blockLocations = storedObject['step10'].data.block.locations;
                const locationToCheck = fetchResult?.handlingUnit.locationId;
                if (blockLocations.some((item: any) => item.id === locationToCheck)) {
                    found = true;
                }

                if (found) {
                    const data: { [label: string]: any } = {};
                    data['resType'] = fetchResult.resType;
                    data['article'] = { ...fetchResult.article, id: fetchResult.article.articleId };
                    data['feature'] = fetchResult.handlingUnitContentFeature;
                    data['handlingUnitContent'] =
                        fetchResult.handlingUnitContentFeature.handlingUnitContent;
                    data['defaultQuantity'] = 1;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            } else {
                // EAN scanned
                const handlingUnitContents = storedObject['step10'].data.handlingUnitContents;
                if (
                    handlingUnitContents.some(
                        (item: any) => item.articleId === fetchResult.articleLuBarcodes[0].articleId
                    )
                ) {
                    found = true;
                    const data: { [label: string]: any } = {};
                    data['resType'] = fetchResult.resType;
                    data['article'] = fetchResult.articleLuBarcodes[0].article;
                    data['handlingUnitContent'] = handlingUnitContents.filter(
                        (item: any) => item.articleId === fetchResult.articleLuBarcodes[0].articleId
                    )[0];
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
                //create HU or HUO
            }
            if (!found) {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:article-move-confirm')}
                        </span>
                    ),
                    onOk: () => {
                        console.log('MoveFeature:');
                        const data: { [label: string]: any } = {};
                        data['resType'] = fetchResult.resType;
                        data['article'] = {
                            ...fetchResult.article,
                            id: fetchResult.article.articleId
                        };
                        data['feature'] = fetchResult.handlingUnitContentFeature;
                        data['handlingUnitContent'] =
                            fetchResult.handlingUnitContentFeature.handlingUnitContent;
                        data['defaultQuantity'] = 1;
                        setTriggerRender(!triggerRender);
                        storedObject[`step${stepNumber}`] = {
                            ...storedObject[`step${stepNumber}`],
                            data
                        };
                        storage.set(process, JSON.stringify(storedObject));
                    },
                    onCancel: () => {
                        console.log('CancelMove');
                        setResetForm(true);
                        setIsLoading(false);
                        setScannedInfo(undefined);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            }
            if (
                storedObject[`step${stepNumber}`] &&
                Object.keys(storedObject[`step${stepNumber}`]).length != 0
            ) {
                storage.set(process, JSON.stringify(storedObject));
            }
        }
    }, [fetchResult]);

    // handle other box
    useEffect(() => {
        if (triggerAlternativeSubmit.triggerAlternativeSubmit) {
            setIsClosureLoading(true);

            const step10data = {
                block: storedObject.step10.data.block
            };
            const step20data = {
                purchaseOrder: storedObject.step20.data.purchaseOrder
            };
            const step30data = {
                returnDate: storedObject.step20.data.purchaseOrder.orderDate
            };

            storage.remove(process);
            const newStoredObject = JSON.parse(storage.get(process) || '{}');

            newStoredObject[`step10`] = { previousStep: 0, data: step10data };
            newStoredObject[`step20`] = { previousStep: 10, data: step20data };
            newStoredObject[`step30`] = { previousStep: 20, data: step30data };
            newStoredObject[`step40`] = { previousStep: 30 };
            newStoredObject['currentStep'] = 40;

            storage.set(process, JSON.stringify(newStoredObject));
            setIsClosureLoading(false);
            triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
            setTriggerRender(!triggerRender);
        }
    }, [triggerAlternativeSubmit]);

    // handle PO closure
    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            if (!alternativeSubmitInput1) {
                showError(t('messages:no-po-to-close'));
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
            }
            setIsClosureLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/reception-management/closeReturnReception`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        purchaseOrder: storedObject.step20.data.purchaseOrder
                    })
                });
                const response = await res.json();
                if (res.ok) {
                    storage.remove(process);

                    const newStoredObject = JSON.parse(storage.get(process) || '{}');
                    newStoredObject[`step10`] = { previousStep: 0 };
                    newStoredObject['currentStep'] = 10;

                    storage.set(process, JSON.stringify(newStoredObject));
                    setIsClosureLoading(false);
                    triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    setTriggerRender(!triggerRender);

                    showSuccess(t('messages:return-reception-success'));
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
                    triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                }
            };
            fetchData();
        }
    }, [triggerAlternativeSubmit1]);

    return <WrapperForm>{isLoading || isClosureLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
