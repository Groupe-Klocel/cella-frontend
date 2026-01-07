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
import { PageContentWrapper, NavButton, UpperMobileSpinner } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import { getMoreInfos, useTranslationWithFallback as useTranslation } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    SelectLocationByLevelForm_reducer,
    SelectStockStatusForm_reducer,
    EnterQuantity_reducer,
    ScanLocation_reducer,
    SimilarLocationsV2
} from '@CommonRadio';
import { ValidateReceptionForm } from 'modules/ReceptionManagement/Reception/Forms/ValidateReception';
import { QuantityChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/QuantityChecks';

import { ScanHandlingUnit } from 'modules/ReceptionManagement/Reception/PagesContainer/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/HandlingUnitChecks';
import { ArticleChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/ArticleChecks';
import { FeatureChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/FeatureChecks';
import { LocationChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/LocationChecks';
import { ScanGoodsInOrPo } from 'modules/ReceptionManagement/Reception/PagesContainer/ScanGoodsInOrPo';
import { GoodsInOrPoChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/GoodsInOrPoChecks';
import { SelectArticleForm } from 'modules/ReceptionManagement/Reception/Forms/SelectArticleForm';
import moment from 'moment';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { SelectGoodsInForm } from 'modules/ReceptionManagement/Reception/Forms/SelectGoodsInForm';
import { ScanArticle } from 'modules/ReceptionManagement/Reception/Forms/ScanArticle';
import { ScanFeature } from 'modules/ReceptionManagement/Reception/Forms/ScanFeature';

type PageComponent = FC & { layout: typeof MainLayout };

const Reception: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [requestNewGoodsIn, setRequestNewGoodsIn] = useState<boolean>(false);
    const [triggerHUClose, setTriggerHUClose] = useState<boolean>(false);
    const [quantityDefaultValue, setQuantityDefaultValue] = useState<number>();

    const { receptionType } = router.query;

    //define workflow parameters
    const processName = receptionType === 'return' ? 'returnReception' : 'reception';

    // [0] : 10-> Scan PO
    // [1] : 20 -> Select GoodsIn
    // [2] : 30 -> Scan HU
    // [3] : 40 -> Scan Article
    // [4] : 50 -> Select Article
    // [5] : 60 -> Scan feature
    // [6] : 70 -> Select Stock Status
    // [7] : 80 -> Enter quantity
    // [8] : 90 -> Scan destination location
    // [9] : 100 -> Select location by level
    // [10] : 110 -> ScanHU (if scanHUAtEnd)
    // [11] : 120 -> Validate reception
    const state = useAppState();
    const dispatch = useAppDispatch();

    const storedObject = state[processName] || {};

    console.log(`${processName}`, storedObject);

    //#region retrieve configuration
    const getParameters = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query parameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        scope
                        code
                        value
                    }
                }
            }
        `;

        const variables = {
            filters: {
                scope: 'inbound',
                code: [
                    'DEFAULT_RECEPTION_LOCATION',
                    'RECEPTION_SCAN_HU',
                    'RECEPTION_DEFAULT_QUANTITY'
                ]
            }
        };
        const receptionParameters = await graphqlRequestClient.request(query, variables);
        return receptionParameters;
    };

    const getLocations = async (name: string): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query locations($filters: LocationSearchFilters) {
                locations(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        name
                        barcode
                        aisle
                        column
                        level
                        position
                        replenish
                        blockId
                        block {
                            name
                        }
                        replenishType
                        constraint
                        comment
                        baseUnitRotation
                        allowCycleCountStockMin
                        category
                        categoryText
                        stockStatus
                        stockStatusText
                        status
                        statusText
                        huManagement
                    }
                }
            }
        `;

        const variables = {
            filters: { name }
        };
        const receptionParameters = await graphqlRequestClient.request(query, variables);
        return receptionParameters;
    };

    const [isHuScannedAtEnd, setIsHuScannedAtEnd] = useState<boolean | undefined>(undefined);
    const [defaultReceptionLocation, setDefaultReceptionLocation] = useState<any>(null);
    // const [availableQuantity, setAvailableQuantity] = useState<number | undefined>(undefined);
    useEffect(() => {
        async function fetchData() {
            const receptionParameters = await getParameters();
            if (receptionParameters) {
                const receptionParametersResults = receptionParameters.parameters.results;
                const receptionScanHU = receptionParametersResults.find(
                    (param: any) => param.code === 'RECEPTION_SCAN_HU'
                )?.value;
                if (receptionScanHU) {
                    setIsHuScannedAtEnd(receptionScanHU === 'atEnd');
                }
                const defaultReceptionLocation = receptionParametersResults.find(
                    (param: any) => param.code === 'DEFAULT_RECEPTION_LOCATION'
                ).value;
                if (defaultReceptionLocation) {
                    const locations = await getLocations(defaultReceptionLocation);
                    setDefaultReceptionLocation(locations?.locations.results[0]);
                }
                const receptionDefaultQuantity = receptionParametersResults.find(
                    (param: any) => param.code === 'RECEPTION_DEFAULT_QUANTITY'
                )?.value;
                // Set quantity default value based on parameter 1=1, 2=Max, else undefined
                setQuantityDefaultValue(() => {
                    switch (receptionDefaultQuantity) {
                        case '1':
                            return 1;
                        case '2':
                            return 2;
                        default:
                            return 0;
                    }
                });
            }
        }
        fetchData();
    }, []);
    //#endregion

    //function to retrieve information to display in RadioInfosHeader
    let availableQuantity: number | undefined = undefined;
    let headerDisplay: { [k: string]: any } = {};
    if (storedObject['step10']?.data?.purchaseOrder) {
        const purchaseOrder = storedObject['step10']?.data?.purchaseOrder;
        headerDisplay[t('common:purchase-order_abbr')] = purchaseOrder.name;
        headerDisplay[t('common:supplier_abbr')] = purchaseOrder.supplier;
    }
    if (storedObject['step20']?.data?.chosenGoodsIn) {
        const goodsIn = storedObject['step20']?.data?.chosenGoodsIn;
        headerDisplay[t('common:goods-in')] = goodsIn.name ? goodsIn.name : t('common:new');
    }
    if (!isHuScannedAtEnd && storedObject['step30']?.data?.handlingUnit) {
        const handlingUnit = storedObject['step30']?.data?.handlingUnit;
        headerDisplay[t('common:hu')] = handlingUnit.barcode;
    }
    if (storedObject['step50']?.data?.chosenArticleLuBarcode) {
        const articleLuBarcode = storedObject['step50']?.data?.chosenArticleLuBarcode;
        headerDisplay[t('common:article_abbr')] =
            articleLuBarcode.article.name + '-' + articleLuBarcode.article.description;
    }
    if (storedObject['step40']?.data?.currentPurchaseOrderLine) {
        headerDisplay[t('common:stock-owner')] =
            storedObject['step40']?.data?.currentPurchaseOrderLine[0]?.stockOwner?.name;
        const quantityReceived = storedObject['step40']?.data?.currentPurchaseOrderLine.reduce(
            (acc: number, line: any) => acc + (line.receivedQuantity || 0),
            0
        );
        const quantityMax = storedObject['step40']?.data?.currentPurchaseOrderLine.reduce(
            (acc: number, line: any) => acc + (line.quantityMax || 0),
            0
        );
        availableQuantity = quantityMax - quantityReceived > 0 ? quantityMax - quantityReceived : 0;
        headerDisplay[t('common:stock-status')] =
            storedObject['step40']?.data?.currentPurchaseOrderLine[0]?.blockingStatusText;
    }
    if (storedObject['step60']?.data?.processedFeatures) {
        const processedFeatures = storedObject['step60']?.data?.processedFeatures;
        processedFeatures.map((feature: any) => {
            headerDisplay[`${feature.featureCode.name}`] = !Array.isArray(feature.value)
                ? feature.featureCode.dateType
                    ? moment(feature.value).format('YYYY-MM-DD')
                    : feature.value
                : feature.value.map((value: any) => value).join(' / ');
        });
    }
    if (storedObject['step70']?.data?.stockStatus) {
        const stockStatus = storedObject['step70']?.data?.stockStatus;
        headerDisplay[t('common:stock-status')] = stockStatus.text;
    }
    if (storedObject['step80']?.data?.movingQuantity) {
        const movingQuantity = storedObject['step80']?.data?.movingQuantity;
        headerDisplay[t('common:quantity')] = movingQuantity;
    }
    if (storedObject['step100']?.data?.chosenLocation) {
        const chosenLocation = storedObject['step100']?.data?.chosenLocation;
        headerDisplay[t('common:location-reception')] = chosenLocation.name;
    }
    if (
        isHuScannedAtEnd === true &&
        storedObject['step100']?.data?.chosenLocation.huManagement &&
        storedObject['step110']?.data?.handlingUnit
    ) {
        const handlingUnit = storedObject['step110']?.data?.handlingUnit;
        headerDisplay[t('common:hu')] = handlingUnit.barcode;
    }
    headerDisplay = getMoreInfos(headerDisplay, storedObject, processName, t);

    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        switch (storedObject.currentStep) {
            //this to define loading parameter for each given step according to conditions if needed,
            //for example:
            // case 20:
            //     setIsLoading(
            //         !storedObject['step10'].data.goodsIns &&
            //             !storedObject['step10'].data.responseType
            //     );
            //     break;
            default:
                setIsLoading(false);
        }
    }, [storedObject.currentStep]);

    return (
        <PageContentWrapper>
            <HeaderContent
                title={
                    receptionType === 'return' ? t('menu:return-reception') : t('common:reception')
                }
                actionsRight={
                    <Space>
                        {storedObject.currentStep > 10 ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(headerDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: headerDisplay
                    }}
                ></RadioInfosHeader>
            )}
            {isLoading ? <UpperMobileSpinner></UpperMobileSpinner> : <></>}
            <div hidden={isLoading}>
                {showSimilarLocations &&
                (storedObject['step40']?.data.currentPurchaseOrderLine ||
                    storedObject['step50']?.data.currentPurchaseOrderLine) &&
                (storedObject['step60']?.data.processedFeatures ||
                    storedObject['step60']?.data.feature === null) ? (
                    <SimilarLocationsV2
                        articleId={
                            storedObject['step50']?.data.chosenArticleLuBarcode.articleId ??
                            storedObject['step40'].data.currentPurchaseOrderLine[0].articleId
                        }
                        stockOwnerId={
                            storedObject['step40'].data.currentPurchaseOrderLine[0].stockOwnerId
                        }
                        stockStatus={
                            storedObject['step70']?.data?.stockStatus
                                ? storedObject['step70'].data.stockStatus.id
                                : storedObject['step40'].data.currentPurchaseOrderLine[0]
                                      .blockingStatus
                        }
                        processName={'reception'}
                        features={storedObject['step60']?.data?.processedFeatures}
                    />
                ) : (
                    <></>
                )}
                {showEmptyLocations && storedObject['step50']?.data ? (
                    <SimilarLocationsV2
                        isEmptyLocations={true}
                        articleId={
                            storedObject['step50']?.data.chosenArticleLuBarcode.articleId ??
                            storedObject['step40'].data.currentPurchaseOrderLine[0].articleId
                        }
                        processName={'reception'}
                    />
                ) : (
                    <></>
                )}
                {!storedObject['step10']?.data ? (
                    <ScanGoodsInOrPo
                        processName={processName}
                        stepNumber={10}
                        label={t('common:goodsIn-po')}
                        buttons={{ submitButton: true, backButton: false }}
                        checkComponent={(data: any) => <GoodsInOrPoChecks dataToCheck={data} />}
                        receptionType={receptionType}
                    ></ScanGoodsInOrPo>
                ) : (
                    <></>
                )}
                {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                    <SelectGoodsInForm
                        processName={processName}
                        stepNumber={20}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            alternativeSubmitButton1: true
                        }}
                        goodsIns={storedObject['step10'].data.goodsIns ?? undefined}
                        responseType={storedObject['step10'].data.responseType ?? undefined}
                        triggerAlternativeSubmit1={{
                            triggerAlternativeSubmit1: requestNewGoodsIn,
                            setTriggerAlternativeSubmit1: setRequestNewGoodsIn
                        }}
                    ></SelectGoodsInForm>
                ) : (
                    <></>
                )}
                {storedObject['step20']?.data &&
                !storedObject['step30']?.data &&
                isHuScannedAtEnd !== undefined ? (
                    <ScanHandlingUnit
                        processName={processName}
                        stepNumber={30}
                        label={t('common:handling-unit')}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        defaultValue={isHuScannedAtEnd ? 'huScannedAtEnd' : undefined}
                        checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                    ></ScanHandlingUnit>
                ) : (
                    <></>
                )}
                {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                    <ScanArticle
                        processName={processName}
                        stepNumber={40}
                        label={t('common:article')}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                    ></ScanArticle>
                ) : (
                    <></>
                )}
                {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                    <SelectArticleForm
                        processName={processName}
                        stepNumber={50}
                        buttons={{ submitButton: true, backButton: true }}
                        articleLuBarcodes={storedObject['step40'].data.articleLuBarcodes}
                    ></SelectArticleForm>
                ) : (
                    <></>
                )}
                {storedObject['step50']?.data &&
                !(storedObject['step60']?.data?.remainingFeatures?.length === 0) ? (
                    <ScanFeature
                        processName={processName}
                        stepNumber={60}
                        label={t('common:feature-code')}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        action1Trigger={{
                            action1Trigger: finishUniqueFeatures,
                            setAction1Trigger: setFinishUniqueFeatures
                        }}
                        featureType={
                            storedObject['step50'].data.chosenArticleLuBarcode.article.featureType
                        }
                        processedFeatures={
                            storedObject['step60']?.data?.processedFeatures ?? undefined
                        }
                        nextFeatureCode={storedObject['step60']?.data?.nextFeatureCode ?? undefined}
                        checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                    ></ScanFeature>
                ) : (
                    <></>
                )}
                {storedObject['step60']?.data?.remainingFeatures?.length === 0 &&
                !storedObject['step70']?.data ? (
                    <SelectStockStatusForm_reducer
                        processName={processName}
                        stepNumber={70}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        initialValue={
                            storedObject['step40'].data.currentPurchaseOrderLine?.[0]
                                ?.blockingStatus
                        }
                        isCommentDisplayed={true}
                    ></SelectStockStatusForm_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step70']?.data && !storedObject['step80']?.data ? (
                    <EnterQuantity_reducer
                        processName={processName}
                        stepNumber={80}
                        buttons={{ submitButton: true, backButton: true }}
                        defaultValue={
                            storedObject['step50'].data.chosenArticleLuBarcode.article.featureType
                                ? storedObject['step60'].data.processedFeatures.reduce(
                                      (count: number, feature: any) =>
                                          count +
                                          ((feature.featureCode.unique && feature.value?.length) ||
                                              0),
                                      0
                                  )
                                : undefined
                        }
                        availableQuantity={availableQuantity}
                        checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                        initialValueType={quantityDefaultValue}
                        isCommentDisplayed={true}
                    ></EnterQuantity_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step80']?.data && !storedObject['step90']?.data ? (
                    <ScanLocation_reducer
                        processName={processName}
                        stepNumber={90}
                        label={t('common:location-reception')}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            locationButton: true,
                            emptyButton: true
                        }}
                        headerContent={{ headerContent, setHeaderContent }}
                        showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                        showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                        initValue={defaultReceptionLocation?.barcode}
                        checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                    ></ScanLocation_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step90']?.data && !storedObject['step100']?.data ? (
                    <SelectLocationByLevelForm_reducer
                        processName={processName}
                        stepNumber={100}
                        buttons={{ submitButton: true, backButton: true }}
                        locations={storedObject['step90'].data.locations}
                    ></SelectLocationByLevelForm_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step100']?.data &&
                !storedObject['step110']?.data &&
                isHuScannedAtEnd !== undefined ? (
                    <ScanHandlingUnit
                        processName={processName}
                        stepNumber={110}
                        label={t('common:handling-unit')}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        defaultValue={
                            !storedObject['step100']?.data?.chosenLocation.huManagement
                                ? 'noHuManagement'
                                : !isHuScannedAtEnd
                                  ? 'huScannedAtStart'
                                  : undefined
                        }
                        checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                    ></ScanHandlingUnit>
                ) : (
                    <></>
                )}
                {storedObject['step110']?.data && isHuScannedAtEnd !== undefined ? (
                    <ValidateReceptionForm
                        processName={processName}
                        stepNumber={120}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            alternativeSubmitButton1: true
                        }}
                        triggerAlternativeSubmit1={{
                            triggerAlternativeSubmit1: triggerHUClose,
                            setTriggerAlternativeSubmit1: setTriggerHUClose
                        }}
                        isHuScannedAtEnd={isHuScannedAtEnd}
                        headerContent={{ setHeaderContent }}
                    ></ValidateReceptionForm>
                ) : (
                    <></>
                )}
            </div>
        </PageContentWrapper>
    );
};

Reception.layout = MainLayout;

export default Reception;
