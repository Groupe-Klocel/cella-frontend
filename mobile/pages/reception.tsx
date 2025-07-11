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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    EmptyLocations,
    SelectLocationByLevelForm,
    SelectStockStatusForm,
    EnterQuantity,
    ScanArticle,
    ScanLocation
} from '@CommonRadio';
import { ValidateReceptionForm } from 'modules/ReceptionManagement/Reception/Forms/ValidateReception';
import { QuantityChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/QuantityChecks';
import { SelectGoodsInForm } from 'modules/ReceptionManagement/Reception/Forms/SelectGoodsInForm';
import { ScanHandlingUnit } from 'modules/ReceptionManagement/Reception/PagesContainer/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/HandlingUnitChecks';
import { ArticleChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/ArticleChecks';
import { ScanFeature } from 'modules/Common/Features/PagesContainer/ScanFeature';
import { FeatureChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/FeatureChecks';
import { LocationChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/LocationChecks';
import { ScanGoodsInOrPo } from 'modules/ReceptionManagement/Reception/PagesContainer/ScanGoodsInOrPo';
import { GoodsInOrPoChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/GoodsInOrPoChecks';
import { SelectArticleForm } from 'modules/ReceptionManagement/Reception/Forms/SelectArticleForm';
import moment from 'moment';
import { SimilarLocations } from 'modules/ReceptionManagement/Reception/Elements/SimilarLocations';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const Reception: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [requestNewGoodsIn, setRequestNewGoodsIn] = useState<boolean>(false);
    const [triggerHUClose, setTriggerHUClose] = useState<boolean>(false);

    const { receptionType } = router.query;

    //define workflow parameters
    const processName = receptionType === 'return' ? 'return-reception' : 'reception';

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
    const storedObject = JSON.parse(storage.get(processName) || '{}');

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
                code: ['DEFAULT_RECEPTION_LOCATION', 'RECEPTION_SCAN_HU']
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

    const [isHuScannedAtEnd, setIsHuScannedAtEnd] = useState<boolean>(false);
    const [defaultReceptionLocation, setDefaultReceptionLocation] = useState<any>(null);
    const [availableQuantity, setAvailableQuantity] = useState<number | undefined>(undefined);
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
            }
        }
        fetchData();
    }, []);
    //#endregion

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject['step10']?.data?.purchaseOrder) {
            const purchaseOrder = storedObject['step10']?.data?.purchaseOrder;
            object[t('common:purchase-order_abbr')] = purchaseOrder.name;
            object[t('common:supplier_abbr')] = purchaseOrder.supplier;
        }
        if (storedObject['step20']?.data?.chosenGoodsIn) {
            const goodsIn = storedObject['step20']?.data?.chosenGoodsIn;
            object[t('common:goods-in')] = goodsIn.name ? goodsIn.name : t('common:new');
        }
        if (!isHuScannedAtEnd && storedObject['step30']?.data?.handlingUnit) {
            const handlingUnit = storedObject['step30']?.data?.handlingUnit;
            object[t('common:hu')] = handlingUnit.barcode;
        }
        if (storedObject['step50']?.data?.chosenArticleLuBarcode) {
            const articleLuBarcode = storedObject['step50']?.data?.chosenArticleLuBarcode;
            object[t('common:article_abbr')] =
                articleLuBarcode.article.name + '-' + articleLuBarcode.article.description;
        }
        if (storedObject['step50']?.data?.currentPurchaseOrderLine) {
            object[t('common:stock-owner')] =
                storedObject['step50']?.data?.currentPurchaseOrderLine[0]?.stockOwner?.name;
            const quantityReceived = storedObject['step50']?.data?.currentPurchaseOrderLine.reduce(
                (acc: number, line: any) => acc + (line.receivedQuantity || 0),
                0
            );
            const quantityMax = storedObject['step50']?.data?.currentPurchaseOrderLine.reduce(
                (acc: number, line: any) => acc + (line.quantityMax || 0),
                0
            );
            console.log(quantityMax, quantityReceived, 'quantityMax, quantityReceived');
            setAvailableQuantity(
                quantityMax - quantityReceived > 0 ? quantityMax - quantityReceived : undefined
            );
        }
        if (storedObject['step60']?.data?.processedFeatures) {
            const processedFeatures = storedObject['step60']?.data?.processedFeatures;
            processedFeatures.map((feature: any) => {
                object[`${feature.featureCode.name}`] = !Array.isArray(feature.value)
                    ? feature.featureCode.dateType
                        ? moment(feature.value).format('YYYY-MM-DD')
                        : feature.value
                    : feature.value.map((value: any) => value).join(' / ');
            });
        }
        if (storedObject['step70']?.data?.stockStatus) {
            const stockStatus = storedObject['step70']?.data?.stockStatus;
            object[t('common:stock-status')] = stockStatus.text;
        }
        if (storedObject['step80']?.data?.movingQuantity) {
            const movingQuantity = storedObject['step80']?.data?.movingQuantity;
            object[t('common:quantity')] = movingQuantity;
        }
        if (storedObject['step100']?.data?.chosenLocation) {
            const chosenLocation = storedObject['step100']?.data?.chosenLocation;
            object[t('common:location-reception')] = chosenLocation.name;
        }
        if (
            isHuScannedAtEnd &&
            storedObject['step100']?.data?.chosenLocation.huManagement &&
            storedObject['step110']?.data?.handlingUnit
        ) {
            const handlingUnit = storedObject['step110']?.data?.handlingUnit;
            object[t('common:hu')] = handlingUnit.barcode;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
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
            {Object.keys(originDisplay).length === 0 && Object.keys(finalDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: displayed
                    }}
                ></RadioInfosHeader>
            )}
            {isLoading ? <UpperMobileSpinner></UpperMobileSpinner> : <></>}
            <div hidden={isLoading}>
                {showSimilarLocations &&
                storedObject['step50']?.data.currentPurchaseOrderLine &&
                (storedObject['step60']?.data.processedFeatures ||
                    storedObject['step60']?.data.feature === null) ? (
                    <SimilarLocations
                        currentPurchaseOrderLine={
                            storedObject['step50'].data.currentPurchaseOrderLine
                        }
                        currentFeatures={storedObject['step60'].data.processedFeatures ?? undefined}
                        locationIdToExclude={defaultReceptionLocation?.id ?? undefined}
                    />
                ) : (
                    <></>
                )}
                {showEmptyLocations && storedObject['step50']?.data ? <EmptyLocations /> : <></>}
                {!storedObject['step10']?.data ? (
                    <ScanGoodsInOrPo
                        process={processName}
                        stepNumber={10}
                        label={t('common:goodsIn-po')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: false }}
                        checkComponent={(data: any) => <GoodsInOrPoChecks dataToCheck={data} />}
                        receptionType={receptionType}
                    ></ScanGoodsInOrPo>
                ) : (
                    <></>
                )}
                {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                    <SelectGoodsInForm
                        process={processName}
                        stepNumber={20}
                        trigger={{ triggerRender, setTriggerRender }}
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
                {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                    <ScanHandlingUnit
                        process={processName}
                        stepNumber={30}
                        label={t('common:handling-unit')}
                        trigger={{ triggerRender, setTriggerRender }}
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
                        process={processName}
                        stepNumber={40}
                        label={t('common:article')}
                        trigger={{ triggerRender, setTriggerRender }}
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
                        process={processName}
                        stepNumber={50}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: true }}
                        articleLuBarcodes={storedObject['step40'].data.articleLuBarcodes}
                    ></SelectArticleForm>
                ) : (
                    <></>
                )}
                {storedObject['step50']?.data &&
                !(storedObject['step60']?.data?.remainingFeatures?.length === 0) ? (
                    <ScanFeature
                        process={processName}
                        stepNumber={60}
                        label={t('common:feature-code')}
                        trigger={{ triggerRender, setTriggerRender }}
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
                    <SelectStockStatusForm
                        process={processName}
                        stepNumber={70}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        initialValue={
                            storedObject['step50'].data.currentPurchaseOrderLine.blockingStatus
                        }
                        isCommentDisplayed={true}
                    ></SelectStockStatusForm>
                ) : (
                    <></>
                )}
                {storedObject['step70']?.data && !storedObject['step80']?.data ? (
                    <EnterQuantity
                        process={processName}
                        stepNumber={80}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
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
                        isCommentDisplayed={true}
                    ></EnterQuantity>
                ) : (
                    <></>
                )}
                {storedObject['step80']?.data && !storedObject['step90']?.data ? (
                    <ScanLocation
                        process={processName}
                        stepNumber={90}
                        label={t('common:location-reception')}
                        trigger={{ triggerRender, setTriggerRender }}
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
                    ></ScanLocation>
                ) : (
                    <></>
                )}
                {storedObject['step90']?.data && !storedObject['step100']?.data ? (
                    <SelectLocationByLevelForm
                        process={processName}
                        stepNumber={100}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        locations={storedObject['step90'].data.locations}
                    ></SelectLocationByLevelForm>
                ) : (
                    <></>
                )}
                {storedObject['step100']?.data && !storedObject['step110']?.data ? (
                    <ScanHandlingUnit
                        process={processName}
                        stepNumber={110}
                        label={t('common:handling-unit')}
                        trigger={{ triggerRender, setTriggerRender }}
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
                {storedObject['step110']?.data ? (
                    <ValidateReceptionForm
                        process={processName}
                        stepNumber={120}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            alternativeSubmitButton1: true
                        }}
                        trigger={{ triggerRender, setTriggerRender }}
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
