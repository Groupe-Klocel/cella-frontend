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
    ScanLocationForm,
    SelectLocationByLevelForm,
    ScanArticleByLocationForm,
    SelectArticleByStockOwnerForm,
    SelectContentForArticleForm,
    EnterQuantityForm
} from '@CommonRadio';
import { CheckFinalLocationQuantityForm } from 'modules/StockManagement/Forms/CheckFinalLocationQuantityForm';
import { ValidateQuantityMoveForm } from 'modules/StockManagement/Forms/ValidateQuantityMove';

type PageComponent = FC & { layout: typeof MainLayout };

const QuantityMvmt: PageComponent = () => {
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
        processName: 'quantityMvt',
        expectedSteps: [10, 15, 20, 30, 35, 40, 50, 60, 65, 70]
    };
    const quantityMvt = JSON.parse(storage.get(workflow.processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(quantityMvt).length === 0) {
        quantityMvt[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        quantityMvt['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(quantityMvt));
    }

    //function to retrieve information to display in RadioInfosHeader before step 50
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (quantityMvt?.currentStep <= 50) {
            setHeaderContent(false);
        }
        if (
            quantityMvt[`step${workflow.expectedSteps[0]}`]?.data?.locations &&
            quantityMvt[`step${workflow.expectedSteps[0]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = quantityMvt[`step${workflow.expectedSteps[0]}`]?.data?.locations;
            object[t('common:location-origin_abbr')] = locationsList[0].barcode;
        }
        if (quantityMvt[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation) {
            const location = quantityMvt[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            object[t('common:location-origin_abbr')] = location.name;
        }
        if (
            quantityMvt[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes &&
            quantityMvt[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes.length > 1
        ) {
            const articleLuBarcodesList =
                quantityMvt[`step${workflow.expectedSteps[2]}`]?.data.articleLuBarcodes;
            object[t('common:article-barcode')] = articleLuBarcodesList[0].barcode.name;
        }
        if (quantityMvt[`step${workflow.expectedSteps[3]}`]?.data?.chosenArticleLuBarcode) {
            const articleLuBarcode =
                quantityMvt[`step${workflow.expectedSteps[3]}`]?.data.chosenArticleLuBarcode;
            object[t('common:article-barcode')] =
                articleLuBarcode.barcode.name + ' (' + articleLuBarcode.stockOwner.name + ')';
            object[t('common:article-description')] =
                articleLuBarcode.article.additionalDescription;
        }
        if (quantityMvt[`step${workflow.expectedSteps[4]}`]?.data?.chosenContent) {
            const chosenContent =
                quantityMvt[`step${workflow.expectedSteps[4]}`]?.data.chosenContent;
            object[t('common:status')] = chosenContent.stockStatusText;
        }
        if (quantityMvt[`step${workflow.expectedSteps[5]}`]?.data?.movingQuantity) {
            const movingQuantity =
                quantityMvt[`step${workflow.expectedSteps[5]}`]?.data?.movingQuantity;
            object[t('common:quantity')] = movingQuantity;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 50
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (quantityMvt?.currentStep === 70) {
            const originLocation =
                quantityMvt[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            finalObject[t('common:location-origin_abbr')] = originLocation.name;
            setHeaderContent(true);
        }
        if (
            quantityMvt[`step${workflow.expectedSteps[3]}`]?.data?.chosenArticleLuBarcode &&
            quantityMvt[`step${workflow.expectedSteps[5]}`]?.data?.movingQuantity
        ) {
            const articleLuBarcode =
                quantityMvt[`step${workflow.expectedSteps[3]}`]?.data?.chosenArticleLuBarcode;
            const movingQuantity =
                quantityMvt[`step${workflow.expectedSteps[5]}`]?.data?.movingQuantity;

            finalObject[t('common:movement_abbr')] =
                movingQuantity +
                ' x ' +
                articleLuBarcode.barcode.name +
                ' (' +
                articleLuBarcode.stockOwner.name +
                ')';
            finalObject[t('common:article-description')] =
                articleLuBarcode.article.additionalDescription;
        }
        if (
            quantityMvt[`step${workflow.expectedSteps[6]}`]?.data?.locations &&
            quantityMvt[`step${workflow.expectedSteps[6]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = quantityMvt[`step${workflow.expectedSteps[6]}`]?.data?.locations;
            finalObject[t('common:location-final_abbr')] = locationsList[0].barcode;
        }
        if (quantityMvt[`step${workflow.expectedSteps[7]}`]?.data?.chosenLocation) {
            const location = quantityMvt[`step${workflow.expectedSteps[7]}`]?.data?.chosenLocation;
            finalObject[t('common:location-final_abbr')] = location.name;
            setHeaderContent(true);
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
                        {quantityMvt.currentStep > workflow.expectedSteps[0] ? (
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
            quantityMvt[`step${workflow.expectedSteps[3]}`].data.chosenArticleLuBarcode
                .articleId ? (
                <SimilarLocations
                    articleId={
                        quantityMvt[`step${workflow.expectedSteps[3]}`].data.chosenArticleLuBarcode
                            .articleId
                    }
                    chosenContentId={
                        quantityMvt[`step${workflow.expectedSteps[4]}`].data.chosenContent.id
                    }
                />
            ) : (
                <></>
            )}
            {showEmptyLocations &&
            quantityMvt[`step${workflow.expectedSteps[3]}`].data.chosenArticleLuBarcode
                .articleId ? (
                <EmptyLocations withAvailableHU={true} />
            ) : (
                <></>
            )}
            {!quantityMvt[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:location-origin')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></ScanLocationForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[0]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={quantityMvt[`step${workflow.expectedSteps[0]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[1]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanArticleByLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:article')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locationId={
                        quantityMvt[`step${workflow.expectedSteps[1]}`].data.chosenLocation.id
                    }
                ></ScanArticleByLocationForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[2]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[3]}`]?.data ? (
                <SelectArticleByStockOwnerForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleLuBarcodes={
                        quantityMvt[`step${workflow.expectedSteps[2]}`].data.articleLuBarcodes
                    }
                ></SelectArticleByStockOwnerForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[3]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[4]}`]?.data ? (
                <SelectContentForArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleId={
                        quantityMvt[`step${workflow.expectedSteps[3]}`].data.chosenArticleLuBarcode
                            .articleId
                    }
                    locationId={
                        quantityMvt[`step${workflow.expectedSteps[1]}`].data.chosenLocation.id
                    }
                ></SelectContentForArticleForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[4]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[5]}`]?.data ? (
                <EnterQuantityForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    availableQuantity={
                        quantityMvt[`step${workflow.expectedSteps[4]}`]?.data.chosenContent
                            ?.quantity
                    }
                ></EnterQuantityForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[5]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[6]}`]?.data ? (
                <ScanLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    label={t('common:location-final')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true, locationButton: true }}
                    headerContent={{ headerContent, setHeaderContent }}
                    showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                ></ScanLocationForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[6]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[7]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={quantityMvt[`step${workflow.expectedSteps[6]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[7]}`]?.data &&
            !quantityMvt[`step${workflow.expectedSteps[8]}`]?.data ? (
                // <Step60Form trigger={{ triggerRender, setTriggerRender }}></Step60Form>
                <CheckFinalLocationQuantityForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleId={
                        quantityMvt[`step${workflow.expectedSteps[3]}`].data.chosenArticleLuBarcode
                            .articleId
                    }
                    originLocationId={
                        quantityMvt[`step${workflow.expectedSteps[1]}`].data.chosenLocation.id
                    }
                    destinationLocation={
                        quantityMvt[`step${workflow.expectedSteps[7]}`].data.chosenLocation
                    }
                    headerContent={{ setHeaderContent }}
                ></CheckFinalLocationQuantityForm>
            ) : (
                <></>
            )}
            {quantityMvt[`step${workflow.expectedSteps[8]}`]?.data ? (
                <ValidateQuantityMoveForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[9]}
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

QuantityMvmt.layout = MainLayout;

export default QuantityMvmt;
