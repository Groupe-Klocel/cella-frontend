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
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { createCycleCountError, searchByIdInCCMs } from 'helpers/utils/crudFunctions/cycleCount';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useRef, useState } from 'react';

export interface IArticleOrFeatureChecksProps {
    dataToCheck: any;
}

export const ArticleOrFeatureChecks = ({ dataToCheck }: IArticleOrFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1,
        alternativeSubmitInput1,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //retrieve necessary values for CC specific checks
    const currentCycleCountId: string = storedObject.step10?.data?.cycleCount?.id;
    const currentCycleCountLineId: string = storedObject.step10?.data?.currentCycleCountLine?.id;
    const expectedArticleId: string =
        storedObject.step10?.data?.currentCycleCountLine?.articleNameId;
    const currentCCMovements: any[] =
        storedObject.step10?.data?.currentCycleCountLine?.cycleCountMovements;
    const choosenHu = storedObject.step30?.data?.handlingUnit;
    // retrieve features from CCM
    const currentCcmsWithFeatures = currentCCMovements.filter(
        (item) => item.features && Object.keys(item.features).length > 0
    );

    //call and process frontAPIResponse
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
                        // TODO: Modal to confirm article creation ???
                        if (
                            response.error.code === 'FAPI_000001' &&
                            !searchByIdInCCMs(currentCcmsWithFeatures, scannedInfo)
                        ) {
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

    const [contents, setContents] = useState<any>();
    useEffect(() => {
        if (scannedInfo && fetchResult) {
            // fetch contents
            const fetchContents = async () => {
                const query = gql`
                    query huCs($filters: HandlingUnitContentSearchFilters) {
                        handlingUnitContents(filters: $filters) {
                            results {
                                id
                                stockOwnerId
                                stockOwner {
                                    id
                                    name
                                }
                                article {
                                    description
                                    name
                                    featureTypeText
                                    baseUnitWeight
                                }
                                quantity
                                stockStatus
                                stockStatusText
                                handlingUnitId
                                handlingUnit {
                                    name
                                    code
                                    type
                                    typeText
                                    category
                                    categoryText
                                    locationId
                                    location {
                                        name
                                        replenish
                                        category
                                        categoryText
                                    }
                                    parentHandlingUnit {
                                        name
                                    }
                                    stockOwner {
                                        name
                                    }
                                }
                                articleLuBarcodeId
                                articleLuBarcode {
                                    barcodeId
                                    barcode {
                                        name
                                    }
                                }
                                handlingUnitContentFeatures {
                                    featureCode {
                                        id
                                        name
                                    }
                                    value
                                }
                            }
                        }
                    }
                `;

                const variables = {
                    filters: {
                        handlingUnitId: choosenHu.id,
                        articleId:
                            fetchResult.resType === 'serialNumber'
                                ? fetchResult?.article?.articleId
                                : fetchResult.articleLuBarcodes[0].article.id
                    }
                };

                const contents = await graphqlRequestClient.request(query, variables);

                setContents(contents.handlingUnitContents.results);
            };
            fetchContents();
        }
    }, [fetchResult]);

    // perform checks and manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult && contents) {
            let workingObject: { [label: string]: any } = {};
            fetchResult.resType === 'serialNumber'
                ? (workingObject = {
                      resType: fetchResult.resType,
                      article: { ...fetchResult.article, id: fetchResult.article.articleId },
                      feature: fetchResult.handlingUnitContentFeature,
                      handlingUnitContent:
                          fetchResult.handlingUnitContentFeature.handlingUnitContent,
                      defaultQuantity: 1
                  })
                : (workingObject = {
                      resType: fetchResult.resType,
                      article: fetchResult.articleLuBarcodes[0].article,
                      handlingUnitContent: contents ? contents[0] : undefined
                  });

            // retrieve cycleCount movement if any
            const currentCCMovement =
                workingObject.resType == 'serialNumber'
                    ? searchByIdInCCMs(currentCcmsWithFeatures, scannedInfo)
                    : currentCCMovements.find(
                          (item: any) =>
                              item.articleId === workingObject.article.id &&
                              item.handlingUnitId === choosenHu.id
                      );

            if (expectedArticleId) {
                if (expectedArticleId !== workingObject.article.id) {
                    createCycleCountError(
                        currentCycleCountId,
                        `Step ${stepNumber} - ${t(
                            'messages:unexpected-scanned-item'
                        )} - ${scannedInfo}`
                    );
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    setIsLoading(false);
                    setContents(undefined);
                }
            } else if (
                contents?.length === 0 ||
                (fetchResult.resType === 'serialNumber' &&
                    (contents[0].handlingUnitContentFeatures.length === 0 ||
                        (contents[0]?.handlingUnitContentFeatures.length !== 0 &&
                            !contents[0]?.handlingUnitContentFeatures?.some(
                                (item: any) => item.value === scannedInfo
                            ))))
            ) {
                createCycleCountError(
                    currentCycleCountId,
                    `Step ${stepNumber} - ${t('messages:article-not-available-for-hu', {
                        huName: choosenHu.name
                    })} - ${scannedInfo}`
                );
                showError(
                    t('messages:article-not-available-for-hu', {
                        huName: choosenHu.name
                    })
                );
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
                setContents(undefined);
            } else {
                if (currentCCMovement) {
                    if (
                        (currentCCMovement.status === 90 && currentCCMovement.quantityPass1) ||
                        (currentCCMovement.status === 190 && currentCCMovement.quantityPass2) ||
                        (currentCCMovement.status === 290 && currentCCMovement.quantityPass3)
                    ) {
                        Modal.confirm({
                            title: (
                                <span style={{ fontSize: '14px' }}>
                                    {t('messages:quantity-overwritting-confirm')}
                                </span>
                            ),
                            onOk: () => {
                                console.log('ConfirmQuantityOverwritting');
                                const data = { ...workingObject, currentCCMovement };
                                setTriggerRender(!triggerRender);
                                storedObject[`step${stepNumber}`] = {
                                    ...storedObject[`step${stepNumber}`],
                                    data
                                };
                                if (
                                    storedObject[`step${stepNumber}`] &&
                                    Object.keys(storedObject[`step${stepNumber}`]).length != 0
                                ) {
                                    storage.set(process, JSON.stringify(storedObject));
                                }
                            },
                            onCancel: () => {
                                console.log('CancelQuantityOverwritting');
                                setResetForm(true);
                                setIsLoading(false);
                                setScannedInfo(undefined);
                            },
                            okText: t('messages:confirm'),
                            cancelText: t('messages:cancel'),
                            bodyStyle: { fontSize: '2px' }
                        });
                    } else {
                        const data = { ...workingObject, currentCCMovement };
                        setTriggerRender(!triggerRender);
                        storedObject[`step${stepNumber}`] = {
                            ...storedObject[`step${stepNumber}`],
                            data
                        };
                        if (
                            storedObject[`step${stepNumber}`] &&
                            Object.keys(storedObject[`step${stepNumber}`]).length != 0
                        ) {
                            storage.set(process, JSON.stringify(storedObject));
                        }
                    }
                } else {
                    const data = { ...workingObject, currentCCMovement };
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    if (
                        storedObject[`step${stepNumber}`] &&
                        Object.keys(storedObject[`step${stepNumber}`]).length != 0
                    ) {
                        storage.set(process, JSON.stringify(storedObject));
                    }
                }
            }
        }
    }, [fetchResult, contents]);

    // HU closure function
    const [isHuClosureLoading, setIsHuClosureLoading] = useState(false);
    async function closeHU(CclInputs: any) {
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
            functionName: 'K_updateCycleCountLines',
            event: {
                input: CclInputs
            }
        };

        try {
            const cc_result = await graphqlRequestClient.request(query, variables);
            if (cc_result.executeFunction.status === 'ERROR') {
                showError(cc_result.executeFunction.output);
            } else if (
                cc_result.executeFunction.status === 'OK' &&
                cc_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${cc_result.executeFunction.output.output.code}`));
                console.log('Backend_message', cc_result.executeFunction.output.output);
            } else {
                const storedObject = JSON.parse(storage.get(process) || '{}');
                storage.remove(process);
                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                newStoredObject['currentStep'] = 30;
                newStoredObject[`step10`] = storedObject[`step10`];
                newStoredObject[`step20`] = storedObject[`step20`];
                newStoredObject[`step25`] = storedObject[`step25`];
                storage.set(process, JSON.stringify(newStoredObject));
                setTriggerRender(!triggerRender);
            }
            setIsHuClosureLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsHuClosureLoading(false);
        }
    }

    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            if (!alternativeSubmitInput1) {
                showError(t('messages:no-hu-to-close'));
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
            } else {
                if (storedObject.step10?.data?.currentCycleCountLine?.handlingUnitStr) {
                    triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    closeHU([currentCycleCountLineId]);
                } else {
                    for (
                        let i = storedObject[`step${stepNumber}`].previousStep;
                        i <= stepNumber;
                        i++
                    ) {
                        delete storedObject[`step${i}`]?.data;
                    }
                    storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
                    storage.set(process, JSON.stringify(storedObject));
                    setTriggerRender(!triggerRender);
                }
            }
        }
    }, [triggerAlternativeSubmit1.triggerAlternativeSubmit1]);

    return <WrapperForm>{isLoading || isHuClosureLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
