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
    EnterQuantity,
    ScanHandlingUnit,
    SelectStockOwnerForm,
    SelectStockStatusForm
} from '@CommonRadio';
import { SelectCycleCountForm } from 'modules/StockManagement/CycleCount/Forms/SelectCycleCountForm';
import { LocationChecks } from 'modules/StockManagement/CycleCount/ChecksAndRecords/LocationChecks';
import { HandlingUnitChecks } from 'modules/StockManagement/CycleCount/ChecksAndRecords/HandlingUnitChecks';
import { ScanArticleOrFeature } from 'modules/StockManagement/CycleCount/PagesContainer/ScanArticleOrFeature';
import { ArticleOrFeatureChecks } from 'modules/StockManagement/CycleCount/ChecksAndRecords/ArticleOrFeatureChecks';
import { QuantityChecks } from 'modules/StockManagement/CycleCount/ChecksAndRecords/QuantityChecks';
import { ParentHandlingUnitChecks } from 'modules/StockManagement/CycleCount/ChecksAndRecords/ParentHandlingUnitChecks';
import { SelectArticleForm } from 'modules/StockManagement/CycleCount/Forms/SelectArticleForm';
import { SelectFeatureCodeForm } from 'modules/StockManagement/CycleCount/Forms/SelectFeatureCodeForm';
import { ValidateCycleCountMovementForm } from 'modules/StockManagement/CycleCount/Forms/ValidateCycleCountMovementForm';
import { ScanLocation } from 'modules/StockManagement/CycleCount/PagesContainer/ScanLocation';
import { ScanCCHandlingUnit } from 'modules/StockManagement/CycleCount/PagesContainer/ScanHandlingUnit';
import { ReviewFeatures } from 'modules/StockManagement/CycleCount/PagesContainer/ReviewFeatures';
import { AutoValidateCycleCountMovementForm } from 'modules/StockManagement/CycleCount/Forms/AutoValidateCycleCountMovementForm';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCounts: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [triggerLocationClose, setTriggerLocationClose] = useState<boolean>(false);
    const [triggerHUClose, setTriggerHuClose] = useState<boolean>(false);
    const [isAutoValidateLoading, setIsAutoValidateLoading] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'cycleCounts',
        expectedSteps: [10, 20, 25, 30, 40, 50, 55, 60, 65, 70, 80, 90]
    };
    // [0] : 10-> SelectCycleCountForm
    // [1] : 20 -> Scan location
    // [2] : 25 -> Scan parentHU
    // [3] : 30 -> Scan HU
    // [4] : 40 -> Scan Article
    // [5] : 50 -> Select StockOwner
    // [6] : 55 -> Select Article
    // [7] : 60 -> Select Stock Status
    // [8] : 65 -> Select feature Code
    // [9] : 70 -> Review features
    // [10] : 80 -> Enter quantity
    // [11] : 90 -> Count CCMovement
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('cycleCounts', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.cycleCount) {
            const cycleCount = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.cycleCount;
            object[t('common:cycle-count')] = cycleCount.name;
        }
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.currentCycleCountLine) {
            const currentCycleCountLine =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.currentCycleCountLine;
            object[t('common:location')] = currentCycleCountLine.locationNameStr;
            currentCycleCountLine.handlingUnitNameStr
                ? (object[t('common:handling-unit')] = currentCycleCountLine.handlingUnitNameSt)
                : undefined;
            currentCycleCountLine.articleNameStr
                ? (object[t('common:article')] = currentCycleCountLine.articleNameStr)
                : undefined;
        }
        if (
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit ||
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.huToCreate
        ) {
            const handlingUnit =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit ??
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.huToCreate;
            object[t('common:handling-unit_abbr')] = handlingUnit.name;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.article) {
            const article = storedObject[`step${workflow.expectedSteps[4]}`]?.data?.article;
            const serialNumber =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.feature?.value ?? undefined;
            object[t('common:article')] = serialNumber
                ? '1 x ' + article.name + ' / ' + serialNumber
                : article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.currentCCMovement) {
            const currentCCMovement =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.currentCCMovement;
            object[t('common:currentCCMovement-status')] = currentCCMovement.statusText;
        }
        if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.stockOwner) {
            const stockOwner = storedObject[`step${workflow.expectedSteps[5]}`]?.data?.stockOwner;
            object[t('common:stock-owner')] = stockOwner.name;
        }
        if (storedObject[`step${workflow.expectedSteps[6]}`]?.data?.article) {
            const article = storedObject[`step${workflow.expectedSteps[6]}`]?.data?.article;
            object[t('common:article')] = article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[6]}`]?.data?.article) {
            const article = storedObject[`step${workflow.expectedSteps[6]}`]?.data?.article;
            const serialNumber =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.feature?.value ?? undefined;
            object[t('common:article')] = serialNumber
                ? '1 x ' + article.name + ' / ' + serialNumber
                : article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[7]}`]?.data?.stockStatus) {
            const stockStatus = storedObject[`step${workflow.expectedSteps[7]}`]?.data?.stockStatus;
            object[t('common:stock-status')] = stockStatus?.text;
        }
        if (
            storedObject[`step${workflow.expectedSteps[8]}`]?.data?.featureCode &&
            storedObject[`step${workflow.expectedSteps[8]}`]?.data?.featureCode !== 'N/A'
        ) {
            const featureCode = storedObject[`step${workflow.expectedSteps[8]}`]?.data?.featureCode;
            object[t('common:feature-code')] = featureCode?.name;
        }
        if (storedObject[`step${workflow.expectedSteps[9]}`]?.data?.movingQuantity) {
            const article = storedObject[`step${workflow.expectedSteps[4]}`]?.data?.article;
            const resType = storedObject[`step${workflow.expectedSteps[4]}`]?.data?.resType;
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[9]}`]?.data?.movingQuantity;
            if (resType === 'barcode') {
                object[t('common:article')] = movingQuantity + ' x ' + article.name;
            }
        }

        setOriginDisplay(object);
    }, [triggerRender, isAutoValidateLoading]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:cycle-count')}
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
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <SelectCycleCountForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectCycleCountForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:location')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:parent-handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        !storedObject[`step${workflow.expectedSteps[0]}`]?.data
                            .currentCycleCountLine.parentHandlingUnitNameString
                            ? 'OK'
                            : undefined
                    }
                    checkComponent={(data: any) => <ParentHandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanCCHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: storedObject[`step${workflow.expectedSteps[1]}`]
                            ?.data?.location
                            ? true
                            : false
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1: triggerLocationClose,
                        setTriggerAlternativeSubmit1: setTriggerLocationClose
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanCCHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <ScanArticleOrFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    label={t('common:article')}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1:
                            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit ||
                            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.huToCreate
                                ? true
                                : false
                    }}
                    trigger={{ triggerRender, setTriggerRender }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1: triggerHUClose,
                        setTriggerAlternativeSubmit1: setTriggerHuClose
                    }}
                    checkComponent={(data: any) => <ArticleOrFeatureChecks dataToCheck={data} />}
                ></ScanArticleOrFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                <SelectStockOwnerForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data.handlingUnitContent
                            ?.stockOwner ?? undefined
                    }
                ></SelectStockOwnerForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <SelectArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data.article ?? undefined
                    }
                ></SelectArticleForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <SelectStockStatusForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data?.handlingUnitContent
                            ?.stockStatus
                            ? {
                                  key: storedObject[`step${workflow.expectedSteps[4]}`]?.data
                                      .handlingUnitContent?.stockStatus,
                                  text: storedObject[`step${workflow.expectedSteps[4]}`]?.data
                                      .handlingUnitContent?.stockStatusText
                              }
                            : undefined
                    }
                ></SelectStockStatusForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[7]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[8]}`]?.data ? (
                <SelectFeatureCodeForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data?.resType !==
                        'serialNumber'
                            ? 'N/A'
                            : (storedObject[`step${workflow.expectedSteps[4]}`]?.data.feature
                                  ?.featureCode ?? undefined)
                    }
                ></SelectFeatureCodeForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[8]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <ReviewFeatures
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[9]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    expectedFeatures={
                        storedObject[`step${workflow.expectedSteps[4]}`].data.expectedFeatures
                    }
                ></ReviewFeatures>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[9]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[10]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[10]}
                    label={t('common:observed-quantity')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data?.defaultQuantity ??
                        undefined
                    }
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {/* {storedObject[`step${workflow.expectedSteps[10]}`]?.data ? (
                <ValidateCycleCountMovementForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[11]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateCycleCountMovementForm>
            ) : (
                <></>
            )} */}
            {storedObject[`step${workflow.expectedSteps[10]}`]?.data || isAutoValidateLoading ? (
                <AutoValidateCycleCountMovementForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[11]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                    autoValidateLoading={{ isAutoValidateLoading, setIsAutoValidateLoading }}
                ></AutoValidateCycleCountMovementForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

CycleCounts.layout = MainLayout;

export default CycleCounts;
