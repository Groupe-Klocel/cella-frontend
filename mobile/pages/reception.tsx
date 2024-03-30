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
    EmptyLocations,
    SelectLocationByLevelForm,
    SelectStockStatusForm,
    EnterQuantity,
    ScanHandlingUnit,
    ScanArticle,
    ScanLocation
} from '@CommonRadio';
import { ValidateReceptionForm } from 'modules/ReceptionManagement/Reception/Forms/ValidateReception';
import { QuantityChecks } from 'modules/ReceptionManagement/Reception/ChecksAndRecords/QuantityChecks';
import { SelectGoodsInForm } from 'modules/ReceptionManagement/Reception/Forms/SelectGoodsInForm';
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

type PageComponent = FC & { layout: typeof MainLayout };

const Reception: PageComponent = () => {
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
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [requestNewGoodsIn, setRequestNewGoodsIn] = useState<boolean>(false);
    const [triggerHUClose, setTriggerHUClose] = useState<boolean>(false);

    //define workflow parameters
    const workflow = {
        processName: 'reception',
        expectedSteps: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]
    };
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
    // [9] : 110 -> Validate reception
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('DLA-reception', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.purchaseOrder) {
            const purchaseOrder =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.purchaseOrder;
            object[t('common:purchase-order_abbr')] = purchaseOrder.name;
            object[t('common:supplier_abbr')] = purchaseOrder.supplier;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenGoodsIn) {
            const goodsIn = storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenGoodsIn;
            object[t('common:goods-in')] = goodsIn.name ? goodsIn.name : t('common:new');
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.receptionHandlingUnit) {
            const handlingUnit =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.receptionHandlingUnit;
            object[t('common:hu')] = handlingUnit.barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenArticleLuBarcode) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenArticleLuBarcode;
            object[t('common:article_abbr')] =
                articleLuBarcode.article.name + '-' + articleLuBarcode.article.description;
        }
        if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures) {
            const processedFeatures =
                storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures;
            processedFeatures.map((feature: any) => {
                object[`${feature.featureCode.name}`] = !Array.isArray(feature.value)
                    ? feature.featureCode.dateType
                        ? moment(feature.value).format('YYYY-MM-DD')
                        : feature.value
                    : feature.value.map((value: any) => value).join(' / ');
            });
        }
        if (storedObject[`step${workflow.expectedSteps[6]}`]?.data?.stockStatus) {
            const stockStatus = storedObject[`step${workflow.expectedSteps[6]}`]?.data?.stockStatus;
            object[t('common:stock-status')] = stockStatus.text;
        }
        if (storedObject[`step${workflow.expectedSteps[7]}`]?.data?.movingQuantity) {
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[7]}`]?.data?.movingQuantity;
            object[t('common:quantity')] = movingQuantity;
        }
        if (storedObject[`step${workflow.expectedSteps[9]}`]?.data?.chosenLocation) {
            const chosenLocation =
                storedObject[`step${workflow.expectedSteps[9]}`]?.data?.chosenLocation;
            object[t('common:location-reception')] = chosenLocation.name;
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

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:reception')}
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
            storedObject[`step${workflow.expectedSteps[4]}`].data.currentPurchaseOrderLine &&
            storedObject[`step${workflow.expectedSteps[5]}`].data.processedFeatures ? (
                <SimilarLocations
                    currentPurchaseOrderLine={
                        storedObject[`step${workflow.expectedSteps[4]}`].data
                            .currentPurchaseOrderLine
                    }
                    currentFeatures={
                        storedObject[`step${workflow.expectedSteps[5]}`].data.processedFeatures ??
                        undefined
                    }
                />
            ) : (
                <></>
            )}
            {showEmptyLocations && storedObject[`step${workflow.expectedSteps[4]}`].data ? (
                <EmptyLocations />
            ) : (
                <></>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanGoodsInOrPo
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:goodsIn-po')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                    checkComponent={(data: any) => <GoodsInOrPoChecks dataToCheck={data} />}
                ></ScanGoodsInOrPo>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectGoodsInForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    goodsIns={
                        storedObject[`step${workflow.expectedSteps[0]}`].data.goodsIns ?? undefined
                    }
                    responseType={
                        storedObject[`step${workflow.expectedSteps[0]}`].data.responseType ??
                        undefined
                    }
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1: requestNewGoodsIn,
                        setTriggerAlternativeSubmit1: setRequestNewGoodsIn
                    }}
                ></SelectGoodsInForm>
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
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanArticle
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
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
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <SelectArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    articleLuBarcodes={
                        storedObject[`step${workflow.expectedSteps[3]}`].data.articleLuBarcodes
                    }
                ></SelectArticleForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !(
                storedObject[`step${workflow.expectedSteps[5]}`]?.data?.remainingFeatures
                    ?.length === 0
            ) ? (
                <ScanFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
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
                        storedObject[`step${workflow.expectedSteps[4]}`].data.chosenArticleLuBarcode
                            .article.featureType
                    }
                    processedFeatures={
                        storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures ??
                        undefined
                    }
                    nextFeatureCode={
                        storedObject[`step${workflow.expectedSteps[5]}`]?.data?.nextFeatureCode ??
                        undefined
                    }
                    checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                ></ScanFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data?.remainingFeatures?.length ===
                0 && !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <SelectStockStatusForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    initialValue={
                        storedObject[`step${workflow.expectedSteps[4]}`].data
                            .currentPurchaseOrderLine.blockingStatus
                    }
                ></SelectStockStatusForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`].data.chosenArticleLuBarcode
                            .article.featureType
                            ? storedObject[
                                  `step${workflow.expectedSteps[5]}`
                              ].data.processedFeatures.reduce(
                                  (count: number, feature: any) =>
                                      count +
                                      ((feature.featureCode.unique && feature.value?.length) || 0),
                                  0
                              )
                            : undefined
                    }
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[7]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[8]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
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
                    initValue="Reception"
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[8]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[9]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[8]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <ValidateReceptionForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[10]}
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
                    headerContent={{ setHeaderContent }}
                ></ValidateReceptionForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

Reception.layout = MainLayout;

export default Reception;
