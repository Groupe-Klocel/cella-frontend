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
import { FC, useEffect, useMemo, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import {
    ButtonManagementType,
    HeaderManagementType,
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    getLastStepWithPreviousStep,
    getStockOwnerIdFromArticleLuBarcode,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Form, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    SimilarLocationsV2,
    ScanLocation_reducer,
    SelectLocationByLevelForm_reducer,
    EnterQuantity_reducer,
    ScanArticleOrFeature_reducer,
    SelectArticleByStockOwnerForm_reducer,
    SelectContentForArticleForm_reducer,
    SelectContentForFeatureForm_reducer
} from '@CommonRadio';
import { ScanHandlingUnit_reducer } from 'modules/StockManagement/ContentMovement/PagesContainer/ScanHandlingUnit_reducer';
import { LocationChecks_reducer } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/LocationChecks_reducer';
import { ArticleOrFeatureChecks_reducer } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/ArticleOrFeatureChecks_reducer';
import { QuantityChecks_reducer } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/QuantityChecks_reducer';
import { HandlingUnitOriginChecks_reducer } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitOriginChecks_reducer';
import { HandlingUnitFinalChecks_reducer } from 'modules/StockManagement/ContentMovement/ChecksAndRecords/HandlingUnitFinalChecks_reducer';
import { ValidateQuantityMoveForm_reducer } from 'modules/StockManagement/ContentMovement/Forms/ValidateQuantityMove_reducer';
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const ContentMvmt: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { parameters } = useAppState();
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [form] = Form.useForm();

    const { originLocation: enforcedOriginLocation } = router.query;

    //define workflow parameters
    const processName =
        enforcedOriginLocation && enforcedOriginLocation === 'defaultReception'
            ? 'contentMvtReception'
            : 'contentMvt';

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

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

    //initialize workflow on step 10
    useEffect(() => {
        if (!storedObject.currentStep) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: 'step10',
                object: { previousStep: 0 },
                customFields: [{ key: 'currentStep', value: 10 }]
            });
        }
    }, [storedObject, processName]);
    //#endregion

    //#region Configs and parameters
    const configsParamsCodes = useMemo(() => {
        const findValueByCode = (code: string) => {
            return parameters.find(
                (item: any) =>
                    ['inbound', 'radio'].includes(item.scope) &&
                    item.code?.toUpperCase() === code.toUpperCase()
            )?.value;
        };

        return {
            defaultReceptionLocationName: findValueByCode('DEFAULT_RECEPTION_LOCATION'),
            movementRoundChecks: findValueByCode('MOVEMENT_CHECK_ROUND')
        };
    }, [parameters]);

    const isRoundToBeChecked = configsParamsCodes.movementRoundChecks === '1';
    //#endregion

    //#region origin location handling (enforced reception flow)
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
            if (enforcedOriginLocation && configsParamsCodes.defaultReceptionLocationName) {
                const locations = await getLocations(
                    configsParamsCodes.defaultReceptionLocationName
                );
                setDefaultReceptionLocation(locations?.locations.results[0]);
            }
        }
        fetchData();
    }, [enforcedOriginLocation, configsParamsCodes.defaultReceptionLocationName]);
    //#endregion

    //#region extract data for the header
    const originLocationsList = storedObject['step10']?.data?.locations;
    const chosenOriginLocation = storedObject['step15']?.data?.chosenLocation;
    const originHu = storedObject['step20']?.data?.handlingUnit;
    const articleLuBarcodesList = storedObject['step30']?.data?.articleLuBarcodes;
    const feature = storedObject['step30']?.data?.feature;
    const chosenArticleLuBarcode = storedObject['step35']?.data?.chosenArticleLuBarcode;
    const chosenContent = storedObject['step40']?.data?.chosenContent;
    const movingQuantity = storedObject['step50']?.data?.movingQuantity;
    const finalLocationsList = storedObject['step60']?.data?.locations;
    const chosenFinalLocation = storedObject['step65']?.data?.chosenLocation;
    const finalHu = storedObject['step70']?.data?.finalHandlingUnit;

    // same priority as getStockOwnerIdFromArticleLuBarcode: barcode > articleLu > article
    const stockOwnerName =
        chosenArticleLuBarcode?.stockOwner?.name ??
        chosenArticleLuBarcode?.articleLu?.stockOwner?.name ??
        chosenArticleLuBarcode?.article?.stockOwner?.name ??
        undefined;
    const article = chosenArticleLuBarcode
        ? (chosenArticleLuBarcode.article ?? chosenArticleLuBarcode)
        : undefined;

    //switch RadioInfosHeader from origin to final display along the workflow
    useEffect(() => {
        if (storedObject?.currentStep <= 50) {
            setHeaderContent(false);
        }
        if (storedObject['step65']?.data?.chosenLocation) {
            setHeaderContent(true);
        }
    }, [storedObject]);
    //#endregion

    //#region RadioInfosHeader settings
    // Declarative header configuration (mirrors buttonManagement). Order = display order:
    // rows sharing a label override the previous one when both are visible.
    const headerManagement: HeaderManagementType = [
        // origin display (until the final location is engaged)
        {
            label: t('common:location-origin_abbr'),
            value: originLocationsList?.[0]?.barcode,
            visible: !headerContent && originLocationsList?.length > 1
        },
        {
            label: t('common:location-origin_abbr'),
            value: chosenOriginLocation?.name,
            visible: !headerContent && !!chosenOriginLocation
        },
        {
            label: t('common:handling-unit-origin_abbr'),
            value: originHu?.name,
            visible: !headerContent && !!(chosenOriginLocation?.huManagement && originHu)
        },
        {
            label: t('common:article-barcode'),
            value: articleLuBarcodesList?.[0]?.barcode?.name,
            visible: !headerContent && articleLuBarcodesList?.length > 1
        },
        {
            label: t('common:article'),
            value: stockOwnerName ? article?.name + ' (' + stockOwnerName + ')' : article?.name,
            visible: !headerContent && !!chosenArticleLuBarcode
        },
        {
            label: t('common:supplier-article-code'),
            value: article?.genericArticleComment,
            visible: !headerContent && !!chosenArticleLuBarcode
        },
        {
            label: t('common:article-description'),
            value: article?.description,
            visible: !headerContent && !!chosenArticleLuBarcode
        },
        {
            label: t('common:serial-number'),
            value: feature?.value,
            visible: !headerContent && !!(chosenArticleLuBarcode && feature)
        },
        {
            label: t('common:stock-status'),
            value: chosenContent?.stockStatusText,
            visible: !headerContent && !!chosenContent
        },
        {
            label: t('common:stock-owner'),
            value: chosenContent?.stockOwner?.name,
            visible: !headerContent && !!chosenContent
        },
        {
            label: t('common:quantity'),
            value: movingQuantity,
            visible: !headerContent && !!movingQuantity
        },
        // final display (once the final location is engaged)
        {
            label: t('common:handling-unit-origin_abbr'),
            value: originHu?.name,
            visible: headerContent && !!originHu
        },
        {
            label: t('common:article'),
            value: movingQuantity + ' x ' + article?.name + ' (' + stockOwnerName + ')',
            visible: headerContent && !!(chosenArticleLuBarcode && movingQuantity && stockOwnerName)
        },
        {
            label: t('common:movement_abbr'),
            value: movingQuantity + ' x ' + article?.name,
            visible:
                headerContent && !!(chosenArticleLuBarcode && movingQuantity && !stockOwnerName)
        },
        {
            label: t('common:article-description'),
            value: article?.description,
            visible: headerContent && !!(chosenArticleLuBarcode && movingQuantity)
        },
        {
            label: t('common:location-final_abbr'),
            value: finalLocationsList?.[0]?.barcode,
            visible: headerContent && finalLocationsList?.length > 1
        },
        {
            label: t('common:location-final_abbr'),
            value: chosenFinalLocation?.name,
            visible: headerContent && !!chosenFinalLocation
        },
        {
            label: t('common:handling-unit-final_abbr'),
            value: finalHu?.name,
            visible: headerContent && !!finalHu
        }
    ];

    // Build the displayed object from the declarative configuration
    const headerDisplay = buildHeaderDisplay(headerManagement);
    //#endregion

    //#region global buttons
    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
        form.resetFields();
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
        form.resetFields();
    };

    const onBack = () => {
        // steps recorded without previousStep (e.g. content selection) fall back to
        // the last step of the workflow that holds one
        const stepToReturn =
            storedObject[`step${storedObject.currentStep}`]?.previousStep ??
            getLastStepWithPreviousStep(storedObject, storedObject.currentStep);
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${stepToReturn}`
        });
        form.resetFields();
    };
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonManagementType = [
        {
            key: 'submit',
            label: t('actions:submit'),
            visibleOnSteps: [10, 15, 20, 30, 35, 50, 60, 65, 70, 80],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'locations',
            label: t('common:locations_abbr'),
            visibleOnSteps: [60],
            permissionsToSeeTheButton: !showSimilarLocations && !showEmptyLocations,
            onClick: () => {
                setHeaderContent(true);
                setShowSimilarLocations(true);
            },
            position: 'bottom'
        },
        {
            key: 'empty-locations',
            label: t('common:locations-empty_abbr'),
            visibleOnSteps: [60],
            permissionsToSeeTheButton: !showSimilarLocations && !showEmptyLocations,
            onClick: () => {
                setShowEmptyLocations(true);
            },
            position: 'bottom'
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [15, 20, 30, 35, 40, 50, 60, 65, 70, 80],
            permissionsToSeeTheButton: !(
                storedObject.currentStep === 30 && enforcedOriginLocation === 'defaultReception'
            ),
            onClick: () => {
                if (showSimilarLocations || showEmptyLocations) {
                    setShowSimilarLocations(false);
                    setShowEmptyLocations(false);
                    if (!storedObject['step65']?.data?.chosenLocation) {
                        setHeaderContent(false);
                    }
                } else {
                    onBack();
                }
            },
            position: 'bottom'
        }
    ];

    // Apply configurable order/color to any button (matched by its `key`) from the
    // 'RF_PREPARATION_ACTION_BUTTONS' parameter extras; keeps base behaviour when unset.
    const orderedButtonManagement = applyRfActionButtonsConfig(buttonManagement, parameters);
    //#endregion

    //#region reset form on step change
    useEffect(() => {
        form.resetFields();
    }, [storedObject.currentStep]);
    //#endregion

    //#region visual handling of automatically processed steps
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
    //#endregion

    //#region RETURN
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
                <RadioButtonWrapper
                    buttonManagement={orderedButtonManagement}
                    currentStep={storedObject.currentStep}
                >
                    {showSimilarLocations &&
                    storedObject['step35']?.data?.chosenArticleLuBarcode?.articleId ? (
                        <SimilarLocationsV2
                            articleId={storedObject['step35'].data.chosenArticleLuBarcode.articleId}
                            originalContentId={storedObject['step40'].data.chosenContent.id}
                            stockOwnerId={storedObject['step40'].data.chosenContent.stockOwnerId}
                            stockStatus={storedObject['step40'].data.chosenContent.stockStatus}
                            handlingUnitCategory={storedObject['step20'].data.handlingUnit.category}
                            processName={'contentMvt'}
                        />
                    ) : (
                        <></>
                    )}
                    {showEmptyLocations &&
                    storedObject['step35']?.data?.chosenArticleLuBarcode?.articleId ? (
                        <SimilarLocationsV2
                            isEmptyLocations={true}
                            articleId={storedObject['step35'].data.chosenArticleLuBarcode.articleId}
                            processName={'contentMvt'}
                            isEmptyWithHU={true}
                        />
                    ) : (
                        <></>
                    )}
                    {!storedObject['step10']?.data ? (
                        <ScanLocation_reducer
                            processName={processName}
                            stepNumber={10}
                            label={t('common:location-origin')}
                            checkComponent={(data: any) => (
                                <LocationChecks_reducer dataToCheck={data} />
                            )}
                            defaultValue={
                                enforcedOriginLocation ? defaultReceptionLocation : undefined
                            }
                            formToUse={form}
                        ></ScanLocation_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step10']?.data && !storedObject['step15']?.data ? (
                        <SelectLocationByLevelForm_reducer
                            processName={processName}
                            stepNumber={15}
                            locations={storedObject['step10'].data.locations}
                            roundsCheck={
                                enforcedOriginLocation &&
                                enforcedOriginLocation === 'defaultReception'
                                    ? false
                                    : isRoundToBeChecked
                            }
                            isOriginLocation={true}
                            formToUse={form}
                        ></SelectLocationByLevelForm_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step15']?.data && !storedObject['step20']?.data ? (
                        <ScanHandlingUnit_reducer
                            processName={processName}
                            stepNumber={20}
                            label={t('common:handling-unit')}
                            enforcedValue={
                                !storedObject['step15']?.data?.chosenLocation.huManagement
                                    ? storedObject['step15']?.data?.chosenLocation.name
                                    : undefined
                            }
                            checkComponent={(data: any) => (
                                <HandlingUnitOriginChecks_reducer
                                    dataToCheck={data}
                                    isEnforcedOriginLocation={!!enforcedOriginLocation}
                                />
                            )}
                            formToUse={form}
                        ></ScanHandlingUnit_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <ScanArticleOrFeature_reducer
                            processName={processName}
                            stepNumber={30}
                            label={t('common:article')}
                            checkComponent={(data: any) => (
                                <ArticleOrFeatureChecks_reducer dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ScanArticleOrFeature_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step30']?.data && !storedObject['step35']?.data ? (
                        <SelectArticleByStockOwnerForm_reducer
                            processName={processName}
                            stepNumber={35}
                            articleLuBarcodes={storedObject['step30'].data.articleLuBarcodes}
                            formToUse={form}
                        ></SelectArticleByStockOwnerForm_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step35']?.data && !storedObject['step40']?.data ? (
                        storedObject['step30'].data?.resType != 'serialNumber' ? (
                            <SelectContentForArticleForm_reducer
                                processName={processName}
                                stepNumber={40}
                                buttons={{}}
                                articleId={
                                    storedObject['step35'].data.chosenArticleLuBarcode.articleId
                                }
                                locationId={storedObject['step15'].data.chosenLocation.id}
                                handlingUnitId={storedObject['step20'].data.handlingUnit.id}
                                stockOwnerId={getStockOwnerIdFromArticleLuBarcode(
                                    storedObject['step35'].data.chosenArticleLuBarcode
                                )}
                            ></SelectContentForArticleForm_reducer>
                        ) : (
                            <SelectContentForFeatureForm_reducer
                                processName={processName}
                                stepNumber={40}
                                buttons={{}}
                                articleId={
                                    storedObject['step35'].data.chosenArticleLuBarcode.articleId
                                }
                                locationId={storedObject['step15'].data.chosenLocation.id}
                                uniqueId={storedObject['step30'].data.feature.value}
                            ></SelectContentForFeatureForm_reducer>
                        )
                    ) : (
                        <></>
                    )}
                    {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                        <EnterQuantity_reducer
                            processName={processName}
                            stepNumber={50}
                            requiredMaxQuantity={
                                storedObject['step40']?.data.chosenContent?.quantity
                            }
                            defaultValue={
                                storedObject['step30'].data.resType === 'serialNumber'
                                    ? 1
                                    : undefined
                            }
                            checkComponent={(data: any) => (
                                <QuantityChecks_reducer dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step50']?.data && !storedObject['step60']?.data ? (
                        <ScanLocation_reducer
                            processName={processName}
                            stepNumber={60}
                            label={t('common:location-final')}
                            showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                            showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                            headerContent={{ headerContent, setHeaderContent }}
                            checkComponent={(data: any) => (
                                <LocationChecks_reducer dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ScanLocation_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step60']?.data && !storedObject['step65']?.data ? (
                        <SelectLocationByLevelForm_reducer
                            processName={processName}
                            stepNumber={65}
                            locations={storedObject['step60'].data.locations}
                            originLocationId={storedObject['step15'].data.chosenLocation.id}
                            formToUse={form}
                        ></SelectLocationByLevelForm_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step65']?.data && !storedObject['step70']?.data ? (
                        <ScanHandlingUnit_reducer
                            processName={processName}
                            stepNumber={70}
                            label={t('common:handling-unit')}
                            enforcedValue={
                                !storedObject['step65']?.data?.chosenLocation.huManagement
                                    ? storedObject['step65']?.data?.chosenLocation.name
                                    : undefined
                            }
                            checkComponent={(data: any) => (
                                <HandlingUnitFinalChecks_reducer dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ScanHandlingUnit_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step70']?.data ? (
                        <ValidateQuantityMoveForm_reducer
                            processName={processName}
                            stepNumber={80}
                            buttons={{}}
                            headerContent={{ setHeaderContent }}
                            formToUse={form}
                        ></ValidateQuantityMoveForm_reducer>
                    ) : (
                        <></>
                    )}
                </RadioButtonWrapper>
            </div>
        </PageContentWrapper>
    );
};
//#endregion

ContentMvmt.layout = MainLayout;

export default ContentMvmt;
