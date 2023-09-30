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
    ScanArticleByPoForm,
    ScanLocationForm,
    SelectLocationByLevelForm,
    SelectStockStatusForm,
    EnterQuantityForm
} from '@CommonRadio';
import { ScanGoodsInPOForm } from 'modules/ReceptionManagement/Forms/ScanGoodsInPOForm';
import { ValidateReceptionForm } from 'modules/ReceptionManagement/Forms/ValidateReception';
import { ScanHuForm } from 'modules/Common/HandlingUnits/Forms/ScanHuForm';

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
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);

    //define workflow parameters
    const workflow = {
        processName: 'lineReception',
        expectedSteps: [10, 15, 20, 40, 50, 60, 65, 70]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    //console.log('lRecp', storedObject);

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
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.goodsIn) {
            const goodsin = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.goodsIn;
            const { handlingUnitInbound, purchaseOrder } = goodsin;
            object[t('common:goods-in')] = handlingUnitInbound.name
                ? handlingUnitInbound.name
                : t('common:new');
            object[t('common:purchase-order_abbr')] = purchaseOrder.name;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnit) {
            const handlingUnit =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnit;
            object[t('common:hu')] = handlingUnit.barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes[0];
            object[t('common:article-description_abbr')] = articleLuBarcode.article.description;
            object[t('common:article_abbr')] = articleLuBarcode.article.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 50
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (storedObject?.currentStep >= 50) {
            setHeaderContent(true);
        }
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.goodsIn) {
            const goodsin = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.goodsIn;
            const { handlingUnitInbound, purchaseOrder } = goodsin;
            finalObject[t('common:goods-in')] = handlingUnitInbound.name
                ? handlingUnitInbound.name
                : t('common:new');
            finalObject[t('common:purchase-order_abbr')] = purchaseOrder.name;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnit) {
            const handlingUnit =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnit;
            finalObject[t('common:hu')] = handlingUnit.barcode;
        }
        if (
            storedObject[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes &&
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.stockStatus &&
            storedObject[`step${workflow.expectedSteps[4]}`]?.data?.movingQuantity
        ) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.articleLuBarcodes[0];
            const stockStatus = storedObject[`step${workflow.expectedSteps[3]}`]?.data?.stockStatus;
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.movingQuantity;
            finalObject[t('common:article_abbr')] =
                movingQuantity +
                ' x ' +
                articleLuBarcode.article.name +
                ' (' +
                stockStatus.text +
                ')';
        }
        if (
            storedObject[`step${workflow.expectedSteps[6]}`]?.data?.locations &&
            storedObject[`step${workflow.expectedSteps[6]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject[`step${workflow.expectedSteps[6]}`]?.data?.locations;
            finalObject[t('common:location-final_abbr')] = locationsList[0].barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[7]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[7]}`]?.data?.chosenLocation;
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
            {showEmptyLocations && storedObject[`step${workflow.expectedSteps[4]}`].data ? (
                <EmptyLocations />
            ) : (
                <></>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanGoodsInPOForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:goodsIn-po')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></ScanGoodsInPOForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <ScanHuForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:hu-reception')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                ></ScanHuForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanArticleByPoForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:article')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    goodsInInfos={storedObject[`step${workflow.expectedSteps[0]}`].data.goodsIn}
                ></ScanArticleByPoForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <SelectStockStatusForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                ></SelectStockStatusForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <EnterQuantityForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    availableQuantity={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.remainQtyToReceive
                    }
                ></EnterQuantityForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                <ScanLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    label={t('common:location-reception')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    headerContent={{ headerContent, setHeaderContent }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                    initValue="Reception"
                ></ScanLocationForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[5]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {/* this part of the code will be adjusted in the next version of this process
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <CheckFinalLocationPalletForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleId={
                        storedObject[`step${workflow.expectedSteps[0]}`].data.handlingUnit
                            .handlingUnitContent[0].articleId
                    }
                    originLocationId={
                        storedObject[`step${workflow.expectedSteps[0]}`].data.handlingUnit
                            .locationId
                    }
                    destinationLocation={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.chosenLocation
                    }
                    headerContent={{ setHeaderContent }}
                ></CheckFinalLocationPalletForm>
            ) : (
                <></>
            )} */}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <ValidateReceptionForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
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
