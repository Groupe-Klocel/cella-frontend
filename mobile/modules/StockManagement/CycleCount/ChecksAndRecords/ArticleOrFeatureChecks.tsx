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
import { Modal } from 'antd';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { createCycleCountError, searchByIdInCCMs } from 'helpers/utils/crudFunctions/cycleCount';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

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
    const isHuToCreate: boolean = storedObject.step30?.data?.isHuToCreate;
    const isHuFromCCM: boolean = storedObject.step30?.data?.isHuFromCCM;
    const huToCreate: any = storedObject.step30?.data?.huToCreate?.name;
    const choosenHu = storedObject.step30?.data?.handlingUnit;

    // #region: retrieve ccms
    const [currentCCMovements, setCurrentCCMovements] = useState<any>();
    const [currentCcmsCreatedByCc, setCurrentCcmsCreatedByCc] = useState<any>();

    const [isOverwrittingModalVisible, setIsOverwrittingModalVisible] = useState(false);

    const getCCMs = async (): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query cycleCountMovements(
                    $filters: CycleCountMovementSearchFilters
                    $advancedFilters: [CycleCountMovementAdvancedSearchFilters!]
                    $itemsPerPage: Int
                ) {
                    cycleCountMovements(
                        filters: $filters
                        itemsPerPage: $itemsPerPage
                        advancedFilters: $advancedFilters
                    ) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            type
                            status
                            statusText
                            cycleCountId
                            cycleCountLineId
                            originalQuantity
                            originalQuantityPass1
                            quantityPass1
                            gapPass1
                            operatorPass1
                            originalQuantityPass2
                            quantityPass2
                            gapPass2
                            operatorPass2
                            originalQuantityPass3
                            quantityPass3
                            gapPass3
                            operatorPass3
                            articleId
                            articleNameStr
                            stockOwnerId
                            stockOwnerNameStr
                            locationId
                            locationNameStr
                            handlingUnitId
                            handlingUnitNameStr
                            parentHandlingUnitNameStr
                            handlingUnitContentId
                            contentStatus
                            handlingUnitContentFeatureId
                            createdByCycleCount
                            features
                        }
                    }
                }
            `;

            const variables = {
                filters: {
                    handlingUnitNameStr: huToCreate ? huToCreate.name : choosenHu.name,
                    cycleCountLineId: currentCycleCountLineId,
                    cycleCountId: currentCycleCountId
                },
                itemsPerPage: 1000
            };
            const ccMovementsInfos = await graphqlRequestClient.request(query, variables);
            return ccMovementsInfos;
        }
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getCCMs();
            if (result) {
                setCurrentCCMovements(result.cycleCountMovements.results);
                setCurrentCcmsCreatedByCc(
                    result.cycleCountMovements.results?.filter(
                        (item: any) => item.createdByCycleCount
                    )
                );
            }
        }
        fetchData();
    }, [scannedInfo]);
    //#endregion

    //#region: search article barcode or identifiable feature
    const [fetchResult, setFetchResult] = useState<any>();
    const [contents, setContents] = useState<any>();
    const [newHUCFeatures, setNewHUCFeatures] = useState<any>();

    async function scanArticleOrFeatures(scannedItem: any) {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_RF_scanArticleOrFeature',
            event: {
                input: { scannedItem }
            }
        };

        try {
            const cc_result = await graphqlRequestClient.request(query, variables);
            return cc_result;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const response = await scanArticleOrFeatures(scannedInfo);
                setFetchResult(response.executeFunction.output.response);
                if (response.executeFunction.status === 'ERROR') {
                    showError(response.executeFunction.output);
                } else if (
                    response.executeFunction.status === 'OK' &&
                    response.executeFunction.output.status === 'KO'
                ) {
                    if (response.executeFunction.output.output.code === 'FAPI_000001') {
                        createCycleCountError(
                            currentCycleCountId,
                            `Step ${stepNumber} - ${t('messages:no-article')} - ${scannedInfo}`
                        );
                        showError(t('messages:no-article'));
                    } else {
                        showError(t(`errors:${response.executeFunction.output.output.code}`));
                        console.log('Backend_message', response.executeFunction.output.output);
                    }
                    // setTriggerOnBack(true);
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                } else {
                    const articleResponse = response.executeFunction.output.response;
                    const featureType =
                        articleResponse.resType === 'serialNumber'
                            ? articleResponse.article.featureType
                            : articleResponse.articleLuBarcodes[0].article.featureType;

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
                                            id
                                            featureCode {
                                                id
                                                name
                                                identifiable
                                                unique
                                                dateType
                                            }
                                            value
                                        }
                                    }
                                }
                            }
                        `;

                        const variables = {
                            filters: {
                                handlingUnitId: !huToCreate ? choosenHu.id : undefined,
                                articleId:
                                    articleResponse.resType === 'serialNumber'
                                        ? articleResponse.article.articleId
                                        : articleResponse.articleLuBarcodes[0].article.id
                            }
                        };

                        const contentsResults = await graphqlRequestClient.request(
                            query,
                            variables
                        );
                        setContents(contentsResults.handlingUnitContents.results);
                    };
                    fetchContents();
                    // this to retrieve features when creating new couple HU/HUC
                    if (isHuToCreate && featureType) {
                        const fetchFeatures = async () => {
                            const query = gql`
                                query featureCodes($filters: FeatureCodeSearchFilters) {
                                    featureCodes(filters: $filters) {
                                        results {
                                            id
                                            name
                                            identifiable
                                            unique
                                            dateType
                                        }
                                    }
                                }
                            `;

                            const variables = {
                                filters: {
                                    featureTypeDetail_FeatureType:
                                        articleResponse.articleLuBarcodes[0].article.featureType
                                }
                            };

                            const featureCodes = await graphqlRequestClient.request(
                                query,
                                variables
                            );
                            const formattedFeatures: any[] = [];
                            featureCodes.featureCodes.results.forEach((item: any) => {
                                formattedFeatures.push({ featureCode: item, value: undefined });
                            });
                            setNewHUCFeatures(formattedFeatures);
                        };
                        fetchFeatures();
                    }
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    // perform checks and manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult && contents) {
            //set ExpectedFeatures depending if needed, created by new HU, not yet created but in CCMs or retrieved from existing HU
            const expectedFeatures = isHuToCreate
                ? newHUCFeatures
                : isHuFromCCM
                  ? currentCCMovements[0].features
                  : contents
                    ? contents[0].handlingUnitContentFeatures.filter(
                          (feature: any) => !feature.featureCode.identifiable
                      )
                    : undefined;
            //set content depending if needed, created by new HU, not yet created but in CCMs or retrieved from existing HU
            const content = isHuToCreate || isHuFromCCM ? undefined : contents?.[0];
            // define what will be sent to storage
            let workingObject: { [label: string]: any } = {};
            fetchResult.resType === 'serialNumber'
                ? (workingObject = {
                      resType: fetchResult.resType,
                      article: { ...fetchResult.article, id: fetchResult.article.articleId },
                      feature: fetchResult.handlingUnitContentFeature,
                      handlingUnitContent: content,
                      expectedFeatures,
                      defaultQuantity: 1
                  })
                : (workingObject = {
                      resType: fetchResult.resType,
                      article: fetchResult.articleLuBarcodes[0].article,
                      handlingUnitContent: content,
                      expectedFeatures
                  });

            const currentCCMovement =
                workingObject.resType == 'serialNumber'
                    ? searchByIdInCCMs(currentCcmsCreatedByCc, scannedInfo)
                    : currentCCMovements.find(
                          (item: any) =>
                              item.articleId === workingObject.article.id &&
                              item.handlingUnitNameStr === choosenHu?.name // name because if from CCM, there is no id
                      );
            //Used as reference to check if item scanned passX+n is the same as previous passes
            const ccmFromPreviousPass = currentCCMovements.find(
                (item: any) =>
                    item.createdByCycleCount && item.handlingUnitNameStr === choosenHu?.name
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
                ccmFromPreviousPass &&
                ccmFromPreviousPass.articleId !== workingObject.article.id
            ) {
                createCycleCountError(
                    currentCycleCountId,
                    `Step ${stepNumber} - ${t('messages:unexpected-scanned-item')} - ${scannedInfo}`
                );
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
                setContents(undefined);
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
                        if (!isOverwrittingModalVisible) {
                            setIsOverwrittingModalVisible(true);
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
                                    setIsOverwrittingModalVisible(false);
                                },
                                onCancel: () => {
                                    console.log('CancelQuantityOverwritting');
                                    setResetForm(true);
                                    setIsLoading(false);
                                    setScannedInfo(undefined);
                                    setIsOverwrittingModalVisible(false);
                                },
                                okText: t('messages:confirm'),
                                cancelText: t('messages:cancel'),
                                bodyStyle: { fontSize: '2px' }
                            });
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
                    triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    setTriggerRender(!triggerRender);
                }
            }
        }
    }, [triggerAlternativeSubmit1.triggerAlternativeSubmit1]);

    return <WrapperForm>{isLoading || isHuClosureLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
