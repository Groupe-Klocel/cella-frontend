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
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    SimilarLocations,
    EmptyLocations,
    SelectLocationByLevelForm,
    SelectArticleByStockOwnerForm,
    SelectContentForArticleForm,
    ScanLocation,
    EnterQuantity,
    ScanArticleOrFeature,
    ScanHandlingUnit
} from '@CommonRadio';
import { LocationChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/LocationChecks';
import { ArticleOrFeatureChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/ArticleOrFeatureChecks';
import { QuantityChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/QuantityChecks';
import { HandlingUnitOriginChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitOriginChecks';
import { HandlingUnitFinalChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitFinalChecks';
import { ValidateQuantityMoveForm } from 'modules/StockManagement/Forms/ValidateQuantityMove';
import { SelectContentForFeatureForm } from 'modules/Common/Contents/Forms/SelectContentForFeatureForm';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const ContentMvmt: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [isRoundToBeChecked, setIsRoundToBeChecked] = useState<boolean>(false);

    const { originLocation: enforcedOriginLocation } = router.query;

    //define workflow parameters
    const processName =
        enforcedOriginLocation && enforcedOriginLocation === 'defaultReception'
            ? 'contentMvtReception'
            : 'contentMvt';

    const storedObject = JSON.parse(storage.get(processName) || '{}');

    //step10: scan Location (origin)
    //step15: select Location by level (origin)
    //step20: scan Handling Unit (origin)
    //step30: scan Article or Feature
    //step35: select Article by Stock Owner
    //step40: select Content for Article
    //step50: enter Quantity
    //step60: scan Location (final)
    //step65: select Location by level (final)
    //step70: scan Handling Unit (final)
    //step80: validate Quantity Move

    console.log(`${processName}`, storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    //origin parameters handling
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
                scope: ['inbound', 'radio'],
                code: ['DEFAULT_RECEPTION_LOCATION', 'MOVEMENT_CHECK_ROUND']
            }
        };
        const parametersResults = await graphqlRequestClient.request(query, variables);
        return parametersResults;
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
        const locationResults = await graphqlRequestClient.request(query, variables);
        return locationResults;
    };
    const [defaultReceptionLocation, setDefaultReceptionLocation] = useState<any>(null);
    useEffect(() => {
        async function fetchData() {
            const parametersResults = await getParameters();
            if (parametersResults) {
                const parameters = parametersResults.parameters.results;
                const defaultReceptionLocation = parameters.find(
                    (param: any) => param.code === 'DEFAULT_RECEPTION_LOCATION'
                ).value;
                const movementRoundChecks = parameters.find(
                    (param: any) => param.code === 'MOVEMENT_CHECK_ROUND'
                ).value;
                if (defaultReceptionLocation && enforcedOriginLocation) {
                    const locations = await getLocations(defaultReceptionLocation);
                    setDefaultReceptionLocation(locations?.locations.results[0]);
                }
                if (movementRoundChecks) {
                    setIsRoundToBeChecked(movementRoundChecks === '1' ? true : false);
                }
            }
        }
        fetchData();
    }, []);

    //function to retrieve information to display in RadioInfosHeader before step 50
    useEffect(() => {
        let object: { [k: string]: any } = {};
        if (storedObject?.currentStep <= 50) {
            setHeaderContent(false);
        }
        if (
            storedObject['step10']?.data?.locations &&
            storedObject['step10']?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject['step10']?.data?.locations;
            object[t('common:location-origin_abbr')] = locationsList[0].barcode;
        }
        if (storedObject['step15']?.data?.chosenLocation) {
            const location = storedObject['step15']?.data?.chosenLocation;
            object[t('common:location-origin_abbr')] = location.name;
        }
        if (
            storedObject['step15']?.data?.chosenLocation.huManagement &&
            storedObject['step20']?.data?.handlingUnit
        ) {
            const originalHu = storedObject['step20']?.data?.handlingUnit;
            object[t('common:handling-unit-origin_abbr')] = originalHu.name;
        }
        if (
            storedObject['step30']?.data?.articleLuBarcodes &&
            storedObject['step30']?.data?.articleLuBarcodes.length > 1
        ) {
            const articleLuBarcodesList = storedObject['step30']?.data.articleLuBarcodes;
            object[t('common:article-barcode')] = articleLuBarcodesList[0].barcode.name;
        }
        if (storedObject['step35']?.data?.chosenArticleLuBarcode) {
            const articleLuBarcode = storedObject['step35']?.data.chosenArticleLuBarcode;
            const stockOwnerName = articleLuBarcode?.stockOwner?.name ?? undefined;
            const article = articleLuBarcode.article ? articleLuBarcode.article : articleLuBarcode;
            stockOwnerName
                ? (object[t('common:article')] = article.name + ' (' + stockOwnerName + ')')
                : (object[t('common:article')] = article.name);
            object[t('common:article-description')] = article.description;
            if (storedObject['step30']?.data?.feature) {
                const serialNumber = storedObject['step30']?.data.feature.value;
                object[t('common:serial-number')] = serialNumber;
            }
        }
        if (storedObject['step40']?.data?.chosenContent) {
            const chosenContent = storedObject['step40']?.data.chosenContent;
            object[t('common:stock-status')] = chosenContent.stockStatusText;
            object[t('common:stock-owner')] = chosenContent.stockOwner.name;
        }
        if (storedObject['step50']?.data?.movingQuantity) {
            const movingQuantity = storedObject['step50']?.data?.movingQuantity;
            object[t('common:quantity')] = movingQuantity;
        }
        object = getMoreInfos(object, storedObject, processName, t);
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 50
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (storedObject?.currentStep === 90) {
            const originLocation = storedObject['step15']?.data?.chosenLocation;
            finalObject[t('common:location-origin_abbr')] = originLocation.name;
            setHeaderContent(true);
        }
        if (storedObject['step20']?.data?.handlingUnit) {
            const originalHu = storedObject['step20']?.data?.handlingUnit;
            finalObject[t('common:handling-unit-origin_abbr')] = originalHu.name;
        }
        if (
            storedObject['step35']?.data?.chosenArticleLuBarcode &&
            storedObject['step50']?.data?.movingQuantity
        ) {
            const articleLuBarcode = storedObject['step35']?.data?.chosenArticleLuBarcode;
            const movingQuantity = storedObject['step50']?.data?.movingQuantity;
            const stockOwnerName = articleLuBarcode?.stockOwner?.name ?? undefined;
            const article = articleLuBarcode.article ? articleLuBarcode.article : articleLuBarcode;
            stockOwnerName
                ? (finalObject[t('common:article')] =
                      movingQuantity + ' x ' + article.name + ' (' + stockOwnerName + ')')
                : (finalObject[t('common:movement_abbr')] = movingQuantity + ' x ' + article.name);
            finalObject[t('common:article-description')] = article.description;
        }
        if (
            storedObject['step60']?.data?.locations &&
            storedObject['step60']?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject['step60']?.data?.locations;
            finalObject[t('common:location-final_abbr')] = locationsList[0].barcode;
        }
        if (storedObject['step65']?.data?.chosenLocation) {
            const location = storedObject['step65']?.data?.chosenLocation;
            finalObject[t('common:location-final_abbr')] = location.name;
            setHeaderContent(true);
        }
        if (storedObject['step70']?.data?.finalHandlingUnit) {
            const finalHu = storedObject['step70']?.data?.finalHandlingUnit;
            finalObject[t('common:handling-unit-final_abbr')] = finalHu.name;
        }
        setFinalDisplay(finalObject);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(processName);
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(processName);
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
    };

    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        switch (storedObject.currentStep) {
            case 10:
                setIsLoading(
                    !!enforcedOriginLocation ||
                        !!storedObject['step10']?.data?.locations ||
                        (!storedObject['step15']?.data?.chosenLocation?.huManagement &&
                            !!storedObject['step15']?.data?.chosenLocation?.barcode)
                );
                break;
            case 20:
                setIsLoading(
                    !storedObject['step15']?.data?.chosenLocation?.huManagement &&
                        !!storedObject['step15']?.data?.chosenLocation?.barcode
                );
                break;
            default:
                setIsLoading(false);
        }
    }, [storedObject]);

    return (
        <PageContentWrapper>
            <HeaderContent
                title={
                    enforcedOriginLocation && enforcedOriginLocation === 'defaultReception'
                        ? t('common:reception-content-movement')
                        : t('common:content-movement')
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
                storedObject['step35'].data.chosenArticleLuBarcode.articleId ? (
                    <SimilarLocations
                        articleId={storedObject['step35'].data.chosenArticleLuBarcode.articleId}
                        chosenContentId={storedObject['step40'].data.chosenContent.id}
                        stockOwnerId={storedObject['step40'].data.chosenContent.stockOwnerId}
                        stockStatus={storedObject['step40'].data.chosenContent.stockStatus}
                    />
                ) : (
                    <></>
                )}
                {showEmptyLocations &&
                storedObject['step35'].data.chosenArticleLuBarcode.articleId ? (
                    <EmptyLocations withAvailableHU={true} />
                ) : (
                    <></>
                )}
                {!storedObject['step10']?.data ? (
                    <ScanLocation
                        process={processName}
                        stepNumber={10}
                        label={t('common:location-origin')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: false }}
                        checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                        defaultValue={enforcedOriginLocation ? defaultReceptionLocation : undefined}
                    ></ScanLocation>
                ) : (
                    <></>
                )}
                {storedObject['step10']?.data && !storedObject['step15']?.data ? (
                    <SelectLocationByLevelForm
                        process={processName}
                        stepNumber={15}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        locations={storedObject['step10'].data.locations}
                        roundsCheck={
                            enforcedOriginLocation && enforcedOriginLocation === 'defaultReception'
                                ? false
                                : isRoundToBeChecked
                        }
                        isOriginLocation={true}
                    ></SelectLocationByLevelForm>
                ) : (
                    <></>
                )}
                {storedObject['step15']?.data && !storedObject['step20']?.data ? (
                    <ScanHandlingUnit
                        process={processName}
                        stepNumber={20}
                        label={t('common:handling-unit')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: true }}
                        enforcedValue={
                            !storedObject['step15']?.data?.chosenLocation.huManagement
                                ? storedObject['step15']?.data?.chosenLocation.name
                                : undefined
                        }
                        checkComponent={(data: any) => (
                            <HandlingUnitOriginChecks
                                dataToCheck={data}
                                isEnforcedOriginLocation={!!enforcedOriginLocation}
                            />
                        )}
                    ></ScanHandlingUnit>
                ) : (
                    <></>
                )}
                {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                    <ScanArticleOrFeature
                        process={processName}
                        stepNumber={30}
                        label={t('common:article')}
                        buttons={{
                            submitButton: true,
                            backButton: enforcedOriginLocation !== 'defaultReception'
                        }}
                        trigger={{ triggerRender, setTriggerRender }}
                        checkComponent={(data: any) => (
                            <ArticleOrFeatureChecks dataToCheck={data} />
                        )}
                    ></ScanArticleOrFeature>
                ) : (
                    <></>
                )}
                {storedObject['step30']?.data && !storedObject['step35']?.data ? (
                    <SelectArticleByStockOwnerForm
                        process={processName}
                        stepNumber={35}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        articleLuBarcodes={storedObject['step30'].data.articleLuBarcodes}
                    ></SelectArticleByStockOwnerForm>
                ) : (
                    <></>
                )}
                {storedObject['step35']?.data && !storedObject['step40']?.data ? (
                    storedObject['step30'].data?.resType != 'serialNumber' ? (
                        <SelectContentForArticleForm
                            process={processName}
                            stepNumber={40}
                            buttons={{ backButton: true }}
                            trigger={{ triggerRender, setTriggerRender }}
                            articleId={storedObject['step35'].data.chosenArticleLuBarcode.articleId}
                            locationId={storedObject['step15'].data.chosenLocation.id}
                            handlingUnitId={storedObject['step20'].data.handlingUnit.id}
                            stockOwnerId={
                                storedObject['step35'].data.chosenArticleLuBarcode.article
                                    ? storedObject['step35'].data.chosenArticleLuBarcode.article
                                          .stockOwnerId
                                    : undefined
                            }
                        ></SelectContentForArticleForm>
                    ) : (
                        <SelectContentForFeatureForm
                            process={processName}
                            stepNumber={40}
                            buttons={{ backButton: true }}
                            trigger={{ triggerRender, setTriggerRender }}
                            articleId={storedObject['step35'].data.chosenArticleLuBarcode.articleId}
                            locationId={storedObject['step15'].data.chosenLocation.id}
                            uniqueId={storedObject['step30'].data.feature.value}
                        ></SelectContentForFeatureForm>
                    )
                ) : (
                    <></>
                )}
                {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                    <EnterQuantity
                        process={processName}
                        stepNumber={50}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        availableQuantity={storedObject['step40']?.data.chosenContent?.quantity}
                        defaultValue={
                            storedObject['step30'].data.resType === 'serialNumber' ? 1 : undefined
                        }
                        checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    ></EnterQuantity>
                ) : (
                    <></>
                )}
                {storedObject['step50']?.data && !storedObject['step60']?.data ? (
                    <ScanLocation
                        process={processName}
                        stepNumber={60}
                        label={t('common:location-final')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            locationButton: true,
                            emptyButton: true
                        }}
                        showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                        showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                        headerContent={{ headerContent, setHeaderContent }}
                        checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                    ></ScanLocation>
                ) : (
                    <></>
                )}
                {storedObject['step60']?.data && !storedObject['step65']?.data ? (
                    <SelectLocationByLevelForm
                        process={processName}
                        stepNumber={65}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        locations={storedObject['step60'].data.locations}
                        originLocationId={storedObject['step15'].data.chosenLocation.id}
                    ></SelectLocationByLevelForm>
                ) : (
                    <></>
                )}
                {storedObject['step65']?.data && !storedObject['step70']?.data ? (
                    <ScanHandlingUnit
                        process={processName}
                        stepNumber={70}
                        label={t('common:handling-unit')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: true }}
                        enforcedValue={
                            !storedObject['step65']?.data?.chosenLocation.huManagement
                                ? storedObject['step65']?.data?.chosenLocation.name
                                : undefined
                        }
                        checkComponent={(data: any) => (
                            <HandlingUnitFinalChecks dataToCheck={data} />
                        )}
                    ></ScanHandlingUnit>
                ) : (
                    <></>
                )}

                {storedObject['step70']?.data ? (
                    <ValidateQuantityMoveForm
                        process={processName}
                        stepNumber={80}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        headerContent={{ setHeaderContent }}
                    ></ValidateQuantityMoveForm>
                ) : (
                    <></>
                )}
            </div>
        </PageContentWrapper>
    );
};

ContentMvmt.layout = MainLayout;

export default ContentMvmt;
