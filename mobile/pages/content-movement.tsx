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
import { PageContentWrapper, NavButton } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import useTranslation from 'next-translate/useTranslation';
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
    ScanHandlingUnit,
    ScanFinalHandlingUnit
} from '@CommonRadio';
import { LocationChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/LocationChecks';
import { ArticleOrFeatureChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/ArticleOrFeatureChecks';
import { QuantityChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/QuantityChecks';
import { HandlingUnitOriginChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitOriginChecks';
import { HandlingUnitFinalChecks } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitFinalChecks';
import { ValidateQuantityMoveForm } from 'modules/StockManagement/Forms/ValidateQuantityMove';
import { SelectContentForFeatureForm } from 'modules/Common/Contents/Forms/SelectContentForFeatureForm';

type PageComponent = FC & { layout: typeof MainLayout };

const ContentMvmt: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'contentMvt',
        expectedSteps: [10, 15, 20, 30, 35, 40, 50, 60, 65, 80, 90]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('contentMvt', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader before step 50
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject?.currentStep <= 50) {
            setHeaderContent(false);
        }
        if (
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations &&
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations;
            object[t('common:location-origin_abbr')] = locationsList[0].barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            object[t('common:location-origin_abbr')] = location.name;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit) {
            const originalHu = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit;
            object[t('common:handling-unit-origin_abbr')] = originalHu.name;
        }
        if (
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcodes &&
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcodes.length > 1
        ) {
            const articleLuBarcodesList =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data.articleLuBarcodes;
            object[t('common:article-barcode')] = articleLuBarcodesList[0].barcode.name;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenArticleLuBarcode) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data.chosenArticleLuBarcode;
            const stockOwnerName = articleLuBarcode?.stockOwner?.name ?? undefined;
            const article = articleLuBarcode.article ? articleLuBarcode.article : articleLuBarcode;
            stockOwnerName
                ? (object[t('common:article')] = article.name + ' (' + stockOwnerName + ')')
                : (object[t('common:article')] = article.name);
            object[t('common:article-description')] = article.description;
            if (storedObject[`step${workflow.expectedSteps[3]}`]?.data?.feature) {
                const serialNumber =
                    storedObject[`step${workflow.expectedSteps[3]}`]?.data.feature.value;
                object[t('common:serial-number')] = serialNumber;
            }
        }
        if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.chosenContent) {
            const chosenContent =
                storedObject[`step${workflow.expectedSteps[5]}`]?.data.chosenContent;
            object[t('common:stock-status')] = chosenContent.stockStatusText;
            object[t('common:stock-owner')] = chosenContent.stockOwner.name;
        }
        if (storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity) {
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity;
            object[t('common:quantity')] = movingQuantity;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 50
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (storedObject?.currentStep === 90) {
            const originLocation =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            finalObject[t('common:location-origin_abbr')] = originLocation.name;
            setHeaderContent(true);
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit) {
            const originalHu = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit;
            finalObject[t('common:handling-unit-origin_abbr')] = originalHu.name;
        }
        if (
            storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenArticleLuBarcode &&
            storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity
        ) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenArticleLuBarcode;
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity;
            const stockOwnerName = articleLuBarcode?.stockOwner?.name ?? undefined;
            const article = articleLuBarcode.article ? articleLuBarcode.article : articleLuBarcode;
            stockOwnerName
                ? (finalObject[t('common:article')] =
                      movingQuantity + ' x ' + article.name + ' (' + stockOwnerName + ')')
                : (finalObject[t('common:movement_abbr')] = movingQuantity + ' x ' + article.name);
            finalObject[t('common:article-description')] = article.description;
        }
        if (
            storedObject[`step${workflow.expectedSteps[7]}`]?.data?.locations &&
            storedObject[`step${workflow.expectedSteps[7]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject[`step${workflow.expectedSteps[7]}`]?.data?.locations;
            finalObject[t('common:location-final_abbr')] = locationsList[0].barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[8]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[8]}`]?.data?.chosenLocation;
            finalObject[t('common:location-final_abbr')] = location.name;
            setHeaderContent(true);
        }
        if (storedObject[`step${workflow.expectedSteps[10]}`]?.data?.finalHandlingUnit) {
            const finalHu =
                storedObject[`step${workflow.expectedSteps[10]}`]?.data?.finalHandlingUnit;
            finalObject[t('common:handling-unit-final_abbr')] = finalHu.name;
        }
        setFinalDisplay(finalObject);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:movement')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > workflow.expectedSteps[0] ? (
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
            {showSimilarLocations &&
            storedObject[`step${workflow.expectedSteps[4]}`].data.chosenArticleLuBarcode
                .articleId ? (
                <SimilarLocations
                    articleId={
                        storedObject[`step${workflow.expectedSteps[4]}`].data.chosenArticleLuBarcode
                            .articleId
                    }
                    chosenContentId={
                        storedObject[`step${workflow.expectedSteps[5]}`].data.chosenContent.id
                    }
                    stockOwnerId={
                        storedObject[`step${workflow.expectedSteps[5]}`].data.chosenContent
                            .stockOwnerId
                    }
                    stockStatus={
                        storedObject[`step${workflow.expectedSteps[5]}`].data.chosenContent
                            .stockStatus
                    }
                />
            ) : (
                <></>
            )}
            {showEmptyLocations &&
            storedObject[`step${workflow.expectedSteps[4]}`].data.chosenArticleLuBarcode
                .articleId ? (
                <EmptyLocations withAvailableHU={true} />
            ) : (
                <></>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:location-origin')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[0]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitOriginChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanArticleOrFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:article')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    checkComponent={(data: any) => <ArticleOrFeatureChecks dataToCheck={data} />}
                ></ScanArticleOrFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <SelectArticleByStockOwnerForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleLuBarcodes={
                        storedObject[`step${workflow.expectedSteps[3]}`].data.articleLuBarcodes
                    }
                ></SelectArticleByStockOwnerForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                storedObject[`step${workflow.expectedSteps[3]}`].data?.resType != 'serialNumber' ? (
                    <SelectContentForArticleForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[5]}
                        buttons={{ backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        articleId={
                            storedObject[`step${workflow.expectedSteps[4]}`].data
                                .chosenArticleLuBarcode.articleId
                        }
                        locationId={
                            storedObject[`step${workflow.expectedSteps[1]}`].data.chosenLocation.id
                        }
                        handlingUnitId={
                            storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit.id
                        }
                    ></SelectContentForArticleForm>
                ) : (
                    <SelectContentForFeatureForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[5]}
                        buttons={{ backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        articleId={
                            storedObject[`step${workflow.expectedSteps[4]}`].data
                                .chosenArticleLuBarcode.articleId
                        }
                        locationId={
                            storedObject[`step${workflow.expectedSteps[1]}`].data.chosenLocation.id
                        }
                        uniqueId={
                            storedObject[`step${workflow.expectedSteps[3]}`].data.feature.value
                        }
                    ></SelectContentForFeatureForm>
                )
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    availableQuantity={
                        storedObject[`step${workflow.expectedSteps[5]}`]?.data.chosenContent
                            ?.quantity
                    }
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[3]}`].data.resType ===
                        'serialNumber'
                            ? 1
                            : undefined
                    }
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
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
            {storedObject[`step${workflow.expectedSteps[7]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[8]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[7]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[8]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <ScanFinalHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[9]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitFinalChecks dataToCheck={data} />}
                ></ScanFinalHandlingUnit>
            ) : (
                <></>
            )}

            {storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <ValidateQuantityMoveForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[10]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateQuantityMoveForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

ContentMvmt.layout = MainLayout;

export default ContentMvmt;
