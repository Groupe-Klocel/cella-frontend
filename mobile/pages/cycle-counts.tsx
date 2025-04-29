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
import { useTranslationWithFallback as useTranslation } from '@helpers';
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
import { SelectLocationByLevelForm } from 'modules/StockManagement/CycleCount/Forms/SelectLocationByLevelForm';

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
    const processName = 'cycleCounts';

    // step10-> SelectCycleCountForm
    // step20 -> Scan location
    //step22 -> Select location by level
    // step25 -> Scan parentHU
    // step30 -> Scan HU
    // step40 -> Scan Article
    // step50 -> Select StockOwner
    // step55 -> Select Article
    // step60 -> Select Stock Status
    // step65 -> Select feature Code
    // step70 -> Review features
    // step80 -> Enter quantity
    // step90 -> Count CCMovement
    const storedObject = JSON.parse(storage.get(processName) || '{}');

    console.log('cycleCounts', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject['step10']?.data?.cycleCount) {
            const cycleCount = storedObject['step10']?.data?.cycleCount;
            object[t('common:cycle-count')] = cycleCount.name;
        }
        if (storedObject['step10']?.data?.currentCycleCountLine) {
            const currentCycleCountLine = storedObject['step10']?.data?.currentCycleCountLine;
            object[t('common:location')] = currentCycleCountLine.locationNameStr;
            currentCycleCountLine.handlingUnitNameStr
                ? (object[t('common:handling-unit')] = currentCycleCountLine.handlingUnitNameSt)
                : undefined;
            currentCycleCountLine.articleNameStr
                ? (object[t('common:article')] = currentCycleCountLine.articleNameStr)
                : undefined;
        }
        if (
            storedObject['step30']?.data?.handlingUnit ||
            storedObject['step30']?.data?.huToCreate
        ) {
            const handlingUnit =
                storedObject['step30']?.data?.handlingUnit ??
                storedObject['step30']?.data?.huToCreate;
            object[t('common:handling-unit_abbr')] = handlingUnit.name;
        }
        if (storedObject['step40']?.data?.article) {
            const article = storedObject['step40']?.data?.article;
            const serialNumber = storedObject['step40']?.data?.feature?.value ?? undefined;
            object[t('common:article')] = serialNumber
                ? '1 x ' + article.name + ' / ' + serialNumber
                : article.name;
        }
        if (storedObject['step40']?.data?.currentCCMovement) {
            const currentCCMovement = storedObject['step40']?.data?.currentCCMovement;
            object[t('common:currentCCMovement-status')] = currentCCMovement.statusText;
        }
        if (storedObject['step50']?.data?.stockOwner) {
            const stockOwner = storedObject['step50']?.data?.stockOwner;
            object[t('common:stock-owner')] = stockOwner.name;
        }
        if (storedObject['step55']?.data?.article) {
            const article = storedObject['step55']?.data?.article;
            object[t('common:article')] = article.name;
        }
        if (storedObject['step55']?.data?.article) {
            const article = storedObject['step55']?.data?.article;
            const serialNumber = storedObject['step40']?.data?.feature?.value ?? undefined;
            object[t('common:article')] = serialNumber
                ? '1 x ' + article.name + ' / ' + serialNumber
                : article.name;
        }
        if (storedObject['step60']?.data?.stockStatus) {
            const stockStatus = storedObject['step60']?.data?.stockStatus;
            object[t('common:stock-status')] = stockStatus?.text;
        }
        if (
            storedObject['step65']?.data?.featureCode &&
            storedObject['step65']?.data?.featureCode !== 'N/A'
        ) {
            const featureCode = storedObject['step65']?.data?.featureCode;
            object[t('common:feature-code')] = featureCode?.name;
        }
        if (storedObject['step70']?.data?.movingQuantity) {
            const article = storedObject['step40']?.data?.article;
            const resType = storedObject['step40']?.data?.resType;
            const movingQuantity = storedObject['step70']?.data?.movingQuantity;
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
            {!storedObject['step10']?.data ? (
                <SelectCycleCountForm
                    process={processName}
                    stepNumber={10}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectCycleCountForm>
            ) : (
                <></>
            )}
            {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                <ScanLocation
                    process={processName}
                    stepNumber={20}
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
            {storedObject['step20']?.data && !storedObject['step22']?.data ? (
                <SelectLocationByLevelForm
                    process={processName}
                    stepNumber={22}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject['step20'].data.locations}
                    roundsCheck={true}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject['step22']?.data && !storedObject['step25']?.data ? (
                <ScanHandlingUnit
                    process={processName}
                    stepNumber={25}
                    label={t('common:parent-handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        !storedObject['step10']?.data.currentCycleCountLine
                            .parentHandlingUnitNameString
                            ? 'OK'
                            : undefined
                    }
                    checkComponent={(data: any) => <ParentHandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject['step25']?.data && !storedObject['step30']?.data ? (
                <ScanCCHandlingUnit
                    process={processName}
                    stepNumber={30}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: storedObject['step22']?.data?.chosenLocation
                            ? true
                            : false
                    }}
                    enforcedValue={
                        !storedObject['step22']?.data?.chosenLocation.huManagement
                            ? storedObject['step22']?.data?.chosenLocation.name
                            : undefined
                    }
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1: triggerLocationClose,
                        setTriggerAlternativeSubmit1: setTriggerLocationClose
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanCCHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                <ScanArticleOrFeature
                    process={processName}
                    stepNumber={40}
                    label={t('common:article')}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1:
                            storedObject['step30']?.data?.handlingUnit ||
                            storedObject['step30']?.data?.huToCreate
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
            {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                <SelectStockOwnerForm
                    process={processName}
                    stepNumber={50}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject['step40']?.data.handlingUnitContent?.stockOwner ?? undefined
                    }
                ></SelectStockOwnerForm>
            ) : (
                <></>
            )}
            {storedObject['step50']?.data && !storedObject['step55']?.data ? (
                <SelectArticleForm
                    process={processName}
                    stepNumber={55}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={storedObject['step40']?.data.article ?? undefined}
                ></SelectArticleForm>
            ) : (
                <></>
            )}
            {storedObject['step55']?.data && !storedObject['step60']?.data ? (
                <SelectStockStatusForm
                    process={processName}
                    stepNumber={60}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    defaultValue={
                        storedObject['step40']?.data?.handlingUnitContent?.stockStatus
                            ? {
                                  key: storedObject['step40']?.data.handlingUnitContent
                                      ?.stockStatus,
                                  text: storedObject['step40']?.data.handlingUnitContent
                                      ?.stockStatusText
                              }
                            : undefined
                    }
                ></SelectStockStatusForm>
            ) : (
                <></>
            )}
            {storedObject['step60']?.data && !storedObject['step65']?.data ? (
                <SelectFeatureCodeForm
                    process={processName}
                    stepNumber={65}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject['step40']?.data?.resType !== 'serialNumber'
                            ? 'N/A'
                            : (storedObject['step40']?.data.feature?.featureCode ?? undefined)
                    }
                ></SelectFeatureCodeForm>
            ) : (
                <></>
            )}
            {storedObject['step65']?.data && !storedObject['step70']?.data ? (
                <ReviewFeatures
                    process={processName}
                    stepNumber={70}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    expectedFeatures={storedObject['step40'].data.expectedFeatures}
                ></ReviewFeatures>
            ) : (
                <></>
            )}
            {storedObject['step70']?.data && !storedObject['step80']?.data ? (
                <EnterQuantity
                    process={processName}
                    stepNumber={80}
                    label={t('common:observed-quantity')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    defaultValue={storedObject['step40']?.data?.defaultQuantity ?? undefined}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {/* {storedObject['step80']?.data ? (
                <ValidateCycleCountMovementForm
                    process={processName}
                    stepNumber={90}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateCycleCountMovementForm>
            ) : (
                <></>
            )} */}
            {storedObject['step80']?.data || isAutoValidateLoading ? (
                <AutoValidateCycleCountMovementForm
                    process={processName}
                    stepNumber={90}
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
