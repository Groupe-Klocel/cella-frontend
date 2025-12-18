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
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { getMoreInfos, useTranslationWithFallback as useTranslation } from '@helpers';
import { HeaderContent, NavButton, PageContentWrapper, RadioInfosHeader } from '@components';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { useRouter } from 'next/router';
import { ScanLocation } from 'modules/StockManagement/InitStock/PagesContainer/ScanLocation';
import { LocationChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/LocationChecks';
import { ScanHandlingUnit } from 'modules/StockManagement/InitStock/PagesContainer/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/HandlingUnitChecks';
import { SelectHuModelForm } from 'modules/StockManagement/InitStock/Forms/SelectHuModelForm';
import { EnterQuantity } from 'modules/StockManagement/InitStock/PagesContainer/EnterQuantity';
import { SelectStockStatusForm } from 'modules/StockManagement/InitStock/Forms/SelectStockStatusForm';
import { QuantityChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/QuantityChecks';
import { ValidateInitStockForm } from 'modules/StockManagement/InitStock/Forms/ValidateInitStock';
import { EnterComment } from 'modules/StockManagement/InitStock/Forms/EnterCommentForm';
import { CommentChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/CommentChecks';
import { EnterReservation } from 'modules/StockManagement/InitStock/Forms/EnterReservationForm';
import { ReservationChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/ReservationChecks';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import graphqlRequestClient from 'graphql/graphqlRequestClient';
import { ScanArticleEAN } from 'modules/StockManagement/InitStock/PagesContainer/ScanArticleEAN';
import { ArticleChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/ArticleChecks';
import { SelectArticleByStockOwnerForm } from 'modules/StockManagement/InitStock/Forms/SelectArticleByStockOwner';
import { ScanFeature } from 'modules/StockManagement/InitStock/PagesContainer/ScanFeature';
import { FeatureChecks } from 'modules/StockManagement/InitStock/ChecksAndRecords/FeatureChecks';
import { SelectLocationByLevelForm } from '@CommonRadio';

type PageComponent = FC & { layout: typeof MainLayout };

const InitStock: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [displayed, setDisplayed] = useState<any>({});
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);

    const processName = 'initStock';
    // step10-> Scan location
    // step15-> Select location by level
    // step20 -> Scan HU
    // step30 -> Scan HU model
    // step40 -> Scan Article
    // step50 -> Select article by stock owner
    // step60 -> Scan features
    // step70 -> Enter quantity
    // step80 -> Select stock status
    // step90 -> Enter reservation (not required)
    // step100 -> Validate
    // step 110/ comment -> Enter comment (button)
    const storedObject = JSON.parse(storage.get(processName) || '{}');
    const [triggerAlternativeSubmit1, setTriggerAlternativeSubmit1] = useState<boolean>(false);

    const huModelDefault = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'global',
        code: 'default_handling_unit_model'
    });
    const defaultValueHuModel = huModelDefault?.data?.listParametersForAScope[0].text;

    console.log('initStock', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        setTriggerAlternativeSubmit1(false);
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    useEffect(() => {
        let object: { [k: string]: any } = {};

        if (storedObject['step15']?.data?.chosenLocation) {
            object[t('common:location_abbr')] = storedObject['step15']?.data?.chosenLocation.name;
        }
        if (
            storedObject['step10']?.data &&
            storedObject['step15']?.data &&
            !storedObject['step10']?.data?.locations[0].huManagement
        ) {
            const huName = storedObject['step15']?.data?.chosenLocation.name;
            object[t('common:hu')] = huName;
        } else if (storedObject['step20']?.data) {
            storedObject['step20']?.data &&
                (object[t('common:hu')] = storedObject['step20']?.data?.handlingUnit?.name);
        }
        if (storedObject['step30']?.data && !defaultValueHuModel) {
            const huModel = storedObject['step30']?.data?.handlingUnitModel.name;
            object[t('common:handling-unit-model')] = huModel;
        }
        if (storedObject['step40']?.data) {
            const article = storedObject['step40']?.data?.articleLuBarcodesInfos[0].article.name;
            object[t('common:article')] = article;
        }
        if (storedObject['step50']?.data) {
            const stockOwner =
                storedObject['step50']?.data?.chosenArticleLuBarcode?.stockOwner.name;
            object[t('common:stock-owner')] = stockOwner;
        }
        if (storedObject['step70']?.data) {
            const quantity = storedObject['step70']?.data?.movingQuantity;
            object[t('common:quantity')] = quantity;
        }
        if (storedObject['step80']?.data) {
            const stockStatus = storedObject['step80']?.data?.stockStatus.text;
            object[t('common:stockStatus')] = stockStatus;
        }
        if (
            storedObject['step90']?.data &&
            storedObject['step90']?.data?.reservation !== 'undefined'
        ) {
            const reservation = storedObject['step90']?.data?.reservation;
            object[t('d:reservation')] = reservation;
        }
        if (storedObject['step110']?.data && storedObject['step110']?.data?.comment) {
            const comment = storedObject['step110']?.data?.comment;
            object[t('common:comment')] = comment;
        }
        object = getMoreInfos(object, storedObject, processName, t);
        setOriginDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(processName);
        setHeaderContent(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(processName);
        setHeaderContent(false);
    };
    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:init-stock')}
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
                <ScanLocation
                    process={processName}
                    stepNumber={10}
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
            {storedObject['step10']?.data && !storedObject['step15']?.data ? (
                <SelectLocationByLevelForm
                    process={processName}
                    stepNumber={15}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject['step10'].data.locations}
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
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    enforcedValue={
                        !storedObject['step15']?.data?.chosenLocation.huManagement
                            ? storedObject['step15']?.data?.chosenLocation.name
                            : undefined
                    }
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                <SelectHuModelForm
                    process={processName}
                    stepNumber={30}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    defaultValue={defaultValueHuModel}
                ></SelectHuModelForm>
            ) : (
                <></>
            )}
            {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                <ScanArticleEAN
                    process={processName}
                    stepNumber={40}
                    label={t('common:article')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                ></ScanArticleEAN>
            ) : (
                <></>
            )}
            {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                <SelectArticleByStockOwnerForm
                    process={processName}
                    stepNumber={50}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject['step40']?.data?.articleLuBarcodesInfos[0]?.stockOwnerId
                    }
                    articleLuBarcodes={storedObject['step40']?.data?.articleLuBarcodesInfos}
                ></SelectArticleByStockOwnerForm>
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
                        !storedObject['step50'].data.featureType
                            ? storedObject['step50'].data.chosenArticleLuBarcode.article.featureType
                            : storedObject['step50'].data.featureType
                    }
                    processedFeatures={storedObject['step60']?.data?.processedFeatures ?? undefined}
                    nextFeatureCode={storedObject['step60']?.data?.nextFeatureCode ?? undefined}
                    checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                ></ScanFeature>
            ) : (
                <></>
            )}
            {storedObject['step60']?.data?.remainingFeatures?.length === 0 &&
            !storedObject['step70']?.data ? (
                <EnterQuantity
                    process={processName}
                    stepNumber={70}
                    label={t('common:observed-quantity')}
                    trigger={{ triggerRender, setTriggerRender }}
                    defaultValue={
                        storedObject['step50'].data.chosenArticleLuBarcode.article.featureType
                            ? storedObject['step60'].data.processedFeatures.reduce(
                                  (count: number, feature: any) =>
                                      count +
                                      ((feature.featureCode.unique && feature.value?.length) || 0),
                                  0
                              )
                            : undefined
                    }
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject['step70']?.data && !storedObject['step80']?.data ? (
                <SelectStockStatusForm
                    process={processName}
                    stepNumber={80}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    isCommentDisplayed={true}
                ></SelectStockStatusForm>
            ) : (
                <></>
            )}
            {storedObject['step80']?.data && !storedObject['step90']?.data ? (
                <EnterReservation
                    process={processName}
                    stepNumber={90}
                    label={t('d:reservation')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    checkComponent={(data: any) => <ReservationChecks dataToCheck={data} />}
                ></EnterReservation>
            ) : (
                <></>
            )}
            {storedObject['step80']?.data && storedObject['step90']?.data ? (
                <ValidateInitStockForm
                    process={processName}
                    stepNumber={100}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: true
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateInitStockForm>
            ) : (
                <></>
            )}
            {storedObject['step10']?.data && triggerAlternativeSubmit1 ? (
                <EnterComment
                    process={processName}
                    stepNumber={110}
                    label={t('common:comment')}
                    trigger={{ triggerRender, setTriggerRender }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    buttons={{
                        submitButton: true,
                        alternativeSubmitButton1: true
                    }}
                    defaultValue={storedObject['step110']?.data?.comment ?? undefined}
                    checkComponent={(data: any) => <CommentChecks dataToCheck={data} />}
                ></EnterComment>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

InitStock.layout = MainLayout;

export default InitStock;
