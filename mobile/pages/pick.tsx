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
import { FC, useEffect, useMemo, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import { getMoreInfos, useTranslationWithFallback as useTranslation } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { EnterQuantity_reducer } from '@CommonRadio';
import { SelectLocationByLevelForm } from 'modules/Preparation/Pick/Forms/SelectLocationByLevelForm';
import { QuantityChecks } from 'modules/Preparation/Pick/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/Pick/Forms/SelectRoundForm';
import { SelectEquipmentForm } from 'modules/Preparation/Pick/Forms/SelectEquipmentForm';
import { HandlingUnitChecks } from 'modules/Preparation/Pick/ChecksAndRecords/HandlingUnitChecks';
import { HandlingUnitChecksWithoutChecks } from 'modules/Preparation/Pick/ChecksAndRecords/HandlingUnitChecksWithoutChecks';
import { ScanLocation } from 'modules/Preparation/Pick/PagesContainer/ScanLocation';
import { LocationChecks } from 'modules/Preparation/Pick/ChecksAndRecords/LocationChecks';
import { ArticleChecks } from 'modules/Preparation/Pick/ChecksAndRecords/ArticleChecks';
import { ScanFeature } from 'modules/Preparation/Pick/PagesContainer/ScanFeature';
import { FeatureChecks } from 'modules/Preparation/Pick/ChecksAndRecords/FeatureChecks';
import { ScanHandlingUnit } from 'modules/Preparation/Pick/PagesContainer/ScanHandlingUnit';
import moment from 'moment';
import { ScanArticleEAN } from 'modules/Preparation/Pick/PagesContainer/ScanArticleEAN';
import { AutoValidatePickForm } from 'modules/Preparation/Pick/Forms/AutoValidatePick';
import { PositionChecks } from 'modules/Preparation/Pick/ChecksAndRecords/PositionChecks';
import { ScanPosition } from 'modules/Preparation/Pick/PagesContainer/ScanPosition';
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { SimilarLocationsV2 } from 'modules/Common/Locations/Elements/SimilarLocationsV2';

type PageComponent = FC & { layout: typeof MainLayout };

const Pick: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters } = useAppState();
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [locationToPropose, setLocationToPropose] = useState<string>('noValue');
    const [articleToPropose, setArticleToPropose] = useState<string>();
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [triggerHuClose, setTriggerHuClose] = useState<boolean>(false);
    const [triggerNextRaa, setTriggerNextRaa] = useState<boolean>(false);
    const [isHuInProgress, setIsHuInProgress] = useState<boolean>(false);
    const [triggerChangeLocationFromArticle, setTriggerChangeLocationFromArticle] =
        useState<boolean>(false);
    const [isAutoValidateLoading, setIsAutoValidateLoading] = useState<boolean>(false);
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [toBePalletizedForBackEnd, setToBePalletizedForBackEnd] = useState<boolean>(true);

    const processName = 'pick';

    //  5 -> SelectEquipmentForm
    // 10 -> SelectRoundForm
    // 15 -> ScanHU (optional on parameter parameters.HANDLING_UNIT_AUTO_GENERATE_PARENT)
    // 20 -> Scan location
    // 30 -> SelectLocation
    // 40 -> Scan HU
    // 50 -> Scan Article
    // 60 -> Scan features
    // 70 -> Enter quantity
    // 75 -> (for detail only) scan position
    // 80 -> Autovalidate pickAndPack
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    console.log(`${processName}`, storedObject);

    const configsParamsCodes = useMemo(() => {
        const findValueByScopeAndCode = (items: any[], scope: string, code: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.code.toLowerCase() === code.toLowerCase()
            )?.value;
        };

        const equipmentScanAtPreparationValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'EQUIPMENT_SCAN_AT_PREPARATION'
        );

        const manuallyGenerateParentValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_MANUALLY_GENERATE_PARENT'
        );

        const noAskBeforeLocationChangeValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'NO_ASK_BEFORE_LOCATION_CHANGE'
        );
        const forceLocationScanValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'FORCE_LOCATION_SCAN'
        );
        const forceArticleScanValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'FORCE_ARTICLE_SCAN'
        );
        const defaultQuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_DEFAULT_QUANTITY'
        );

        const autoValidate1QuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_AUTOVALIDATE_1_QUANTITY'
        );
        const highlightedQuantity = findValueByScopeAndCode(
            parameters,
            'outbound',
            'IS_QUANTITY_HIGHLIGHTED'
        );
        // Convert value in boolean or number as needed
        const equipmentScanAtPreparation = equipmentScanAtPreparationValue === '1';
        const manuallyGenerateParent = manuallyGenerateParentValue === '1';
        const noAskBeforeLocationChange = noAskBeforeLocationChangeValue === '1';
        const forceLocationScan = forceLocationScanValue === '1';
        const forceArticleScan = forceArticleScanValue === '1';
        const defaultQuantity = (() => {
            switch (defaultQuantityValue) {
                case '1':
                    return 1;
                case '2':
                    return 2;
                default:
                    return 0;
            }
        })();
        const autoValidate1Quantity = autoValidate1QuantityValue === '1';
        const highlightQuantity = highlightedQuantity === '1';

        return {
            equipmentScanAtPreparation,
            manuallyGenerateParent,
            noAskBeforeLocationChange,
            forceLocationScan,
            forceArticleScan,
            defaultQuantity,
            autoValidate1Quantity,
            highlightQuantity
        };
    }, [parameters]);

    const equipmentScanAtPreparation = configsParamsCodes.equipmentScanAtPreparation;
    const manuallyGenerateParent = configsParamsCodes.manuallyGenerateParent;
    const dontAskBeforeLocationChange = configsParamsCodes.noAskBeforeLocationChange;
    const forceLocationScan = configsParamsCodes.forceLocationScan;
    const forceArticleScan = configsParamsCodes.forceLocationScan
        ? configsParamsCodes.forceArticleScan
        : true;
    const quantityDefaultValue = configsParamsCodes.defaultQuantity;
    const autoValidate1Quantity = configsParamsCodes.autoValidate1Quantity;
    const isQuantityHighlighted = configsParamsCodes.highlightQuantity;

    const [tmpForceLocation, setTmpforceLocation] = useState<any>(forceLocationScan);
    useEffect(() => {
        if (parameters && parameters.length > 0) {
            setIsLoading(false);
        }
    }, [parameters]);

    const proposedRoundAdvisedAddress =
        storedObject?.step10?.data?.proposedRoundAdvisedAddresses[0] || [];
    const isLocationDefined = !!proposedRoundAdvisedAddress.locationId;
    const expectedArticle = proposedRoundAdvisedAddress?.roundLineDetail?.roundLine.article;
    const isPositionChecked = storedObject?.step10?.data?.round?.equipment?.checkPosition;

    // Check if there are different locationIds available for action1Button
    const hasMultipleLocationIds = (() => {
        const proposedAddresses = storedObject['step10']?.data?.round?.roundAdvisedAddresses || [];
        const locationIds = proposedAddresses.map((addr: any) => addr?.locationId);
        const uniqueLocationIds = Array.from(new Set(locationIds));
        return uniqueLocationIds.length > 1;
    })();

    // function to add next location display in italics
    const addNextLocationDisplay = (currentLocationName: string) => {
        const allAddresses = storedObject['step10']?.data?.round?.roundAdvisedAddresses || [];
        const currentProposedAddresses =
            storedObject['step10']?.data?.proposedRoundAdvisedAddresses || [];

        //Find next location
        let currentIndex = -1;
        if (currentProposedAddresses.length > 0) {
            const firstProposedId = currentProposedAddresses[0].id;
            currentIndex = allAddresses.findIndex((addr: any) => addr.id === firstProposedId);
        }

        const nextIndex = currentIndex + currentProposedAddresses.length;
        let nextLocationFull = '';

        if (nextIndex < allAddresses.length) {
            nextLocationFull = allAddresses[nextIndex]?.location?.name || '';
        } else if (allAddresses.length > 0) {
            nextLocationFull = allAddresses[0]?.location?.name || '';
        }

        let nextLocation = '';
        if (nextLocationFull) {
            // Remove position according to first separator from the end
            let lastSeparatorIndex = -1;
            for (let i = nextLocationFull.length - 1; i >= 0; i--) {
                if (!/[a-zA-Z0-9]/.test(nextLocationFull[i])) {
                    lastSeparatorIndex = i;
                    break;
                }
            }
            if (lastSeparatorIndex !== -1) {
                nextLocation = nextLocationFull.substring(0, lastSeparatorIndex);
            } else {
                nextLocation = nextLocationFull;
            }
        }

        return nextLocation ? (
            <>
                {currentLocationName}{' '}
                <em>
                    ({t('actions:next')}: {nextLocation})
                </em>
            </>
        ) : (
            currentLocationName
        );
    };

    //function to retrieve information to display in RadioInfosHeader
    let headerDisplay: { [k: string]: any } = {};
    if (storedObject['step5']?.data?.equipmentName) {
        headerDisplay[t('common:equipment')] = storedObject['step5']?.data?.equipmentName;
    }
    if (
        storedObject['step10']?.data?.round &&
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses
    ) {
        const round = storedObject['step10']?.data?.round;
        const totalProcessedQuantity = round.roundAdvisedAddresses.reduce(
            (sum: number, address: any) => {
                return sum + address.roundLineDetail.processedQuantity;
            },
            0
        );
        headerDisplay[t('common:round')] = round.name;
        headerDisplay[t('common:total-picked-quantity')] =
            totalProcessedQuantity + '/' + round.nbPickArticle;
        if (storedObject['step10']?.data?.pickAndPackType === 'detail') {
            headerDisplay[t('common:handling-unit-final_abbr')] =
                proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]?.handlingUnitOutbound?.name;
        }
        if (storedObject['step15']?.data?.handlingUnit) {
            const handlingUnit = storedObject['step15']?.data?.handlingUnit;
            headerDisplay[t('common:pick_handling-unit_grouping')] =
                typeof handlingUnit === 'string' ? handlingUnit : handlingUnit.name;
        }
        if (!storedObject['step30']?.data?.chosenLocation) {
            if (isLocationDefined) {
                headerDisplay[t('common:expected-location_abbr')] = addNextLocationDisplay(
                    proposedRoundAdvisedAddress.location.name
                );
            } else {
                headerDisplay[t('common:location_abbr')] = t('d:no-location-defined');
            }
        } else {
            headerDisplay[t('common:location_abbr')] = addNextLocationDisplay(
                storedObject['step30']?.data?.chosenLocation.name
            );
        }

        if (proposedRoundAdvisedAddress?.handlingUnitContent?.stockOwner) {
            if (!storedObject['step40']?.data?.handlingUnit) {
                const handlingUnitContent = proposedRoundAdvisedAddress?.handlingUnitContent;
                headerDisplay[t('common:expected-stock-owner_abbr')] =
                    handlingUnitContent.stockOwner?.name;
            } else {
                headerDisplay[t('common:handling-unit_abbr')] =
                    storedObject['step40']?.data?.handlingUnit?.name;
                headerDisplay[t('common:stock-owner_abbr')] =
                    storedObject[
                        'step40'
                    ]?.data?.handlingUnit?.handlingUnitContents[0]?.stockOwner?.name;
            }
        }
        if (!storedObject['step50']?.data?.article) {
            headerDisplay[t('common:expected-article_abbr')] = expectedArticle?.name;
        } else {
            headerDisplay[t('common:article_abbr')] = storedObject['step50']?.data?.article.name;
        }
        headerDisplay[t('common:article-description')] = expectedArticle?.description;
        if (storedObject['step60']?.data?.processedFeatures) {
            const processedFeatures = storedObject['step60']?.data?.processedFeatures;
            const handling_unit_contents = storedObject[
                'step40'
            ]?.data?.handlingUnit?.handlingUnitContents.find((content: any) =>
                processedFeatures.every((feature_filter: any) =>
                    content.handlingUnitContentFeatures.some(
                        (feature_content: any) =>
                            feature_content.featureCode.id === feature_filter.featureCodeId &&
                            feature_content.value === feature_filter.value
                    )
                )
            );
            headerDisplay[t('common:available-quantity')] = handling_unit_contents?.quantity;
            processedFeatures.map((feature: any) => {
                const { featureCode, value } = feature;
                let formattedValue = value;
                if (!Array.isArray(value)) {
                    // If it's a date type and a valid date in 'YYYY-MM-DD' format, format it
                    if (featureCode.dateType && moment(value, 'YYYY-MM-DD', true).isValid()) {
                        formattedValue = moment(value).format('YYYY-MM-DD');
                    }
                } else {
                    formattedValue = value.join(' / ');
                }
                headerDisplay[featureCode.name] = formattedValue;
            });
        }
        if (!storedObject['step70']?.data?.movingQuantity) {
            headerDisplay[t('common:expected-quantity_abbr')] = {
                value: storedObject['step10']?.data?.proposedRoundAdvisedAddresses.reduce(
                    (total: number, current: any) => total + current.quantity,
                    0
                ),
                highlight: isQuantityHighlighted
            };
        } else {
            headerDisplay[t('common:quantity_abbr')] =
                storedObject['step70']?.data?.movingQuantity +
                '/' +
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses.reduce(
                    (total: number, current: any) => total + current.quantity,
                    0
                );
        }
        headerDisplay = getMoreInfos(headerDisplay, storedObject, processName, t);
    }

    // retrieve location, article and qty to propose
    useEffect(() => {
        if (storedObject['step10']?.data?.proposedRoundAdvisedAddresses) {
            setLocationToPropose(
                proposedRoundAdvisedAddress.location?.name || t('d:no-location-defined')
            );
            setArticleToPropose(proposedRoundAdvisedAddress?.handlingUnitContent?.article?.name);
        }
        if (
            storedObject['step10']?.data &&
            !proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]
                ?.handlingUnitOutbound?.carrierShippingMode?.toBePalletized &&
            !storedObject['step10']?.data?.round?.equipment?.forcePickingCheck
        ) {
            setToBePalletizedForBackEnd(false);
        }

        if (storedObject['step10']?.data?.round) {
            const currentShippingPalletId = storedObject['step10']?.data?.round.extraText1;
            const isHuInProgress = currentShippingPalletId ? true : false;
            setIsHuInProgress(isHuInProgress);
        }
        if (storedObject.currentStep >= 80) {
            setTmpforceLocation(forceLocationScan);
        }

        // Si isLocationDefined est false après l'étape de sélection de ramasse, forcer le scan de location
        if (storedObject['step10']?.data && !isLocationDefined) {
            setTmpforceLocation(true);
        }
    }, [storedObject]);

    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        // storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setShowSimilarLocations(false);
        setTmpforceLocation(forceLocationScan);
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
        // storage.remove(processName);
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
        setTmpforceLocation(forceLocationScan);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:round-picking')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > (equipmentScanAtPreparation ? 5 : 10) ? (
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
            {isLoading ? (
                <UpperMobileSpinner></UpperMobileSpinner>
            ) : (
                <>
                    {showSimilarLocations && storedObject['step10']?.data ? (
                        <SimilarLocationsV2
                            articleId={expectedArticle?.id}
                            originalContentId={
                                proposedRoundAdvisedAddress?.handlingUnitContent?.id ?? undefined
                            }
                            stockOwnerId={
                                proposedRoundAdvisedAddress.roundLineDetail.deliveryLine
                                    .stockOwnerId
                            }
                            stockStatus={
                                proposedRoundAdvisedAddress.roundLineDetail.deliveryLine.stockStatus
                            }
                            reservation={
                                proposedRoundAdvisedAddress.roundLineDetail.deliveryLine.reservation
                            }
                            processName={'pick'}
                        />
                    ) : (
                        <></>
                    )}
                    {equipmentScanAtPreparation && !storedObject['step5']?.data ? (
                        <SelectEquipmentForm
                            processName={processName}
                            stepNumber={5}
                            buttons={{ submitButton: true, backButton: false }}
                        ></SelectEquipmentForm>
                    ) : (
                        <></>
                    )}
                    {(!equipmentScanAtPreparation || storedObject['step5']?.data) &&
                    !storedObject['step10']?.data ? (
                        <SelectRoundForm
                            processName={processName}
                            stepNumber={10}
                            buttons={{ submitButton: true, backButton: equipmentScanAtPreparation }}
                        ></SelectRoundForm>
                    ) : (
                        <></>
                    )}
                    {storedObject['step10']?.data &&
                    !storedObject['step15']?.data &&
                    manuallyGenerateParent ? (
                        <ScanHandlingUnit
                            processName={processName}
                            stepNumber={15}
                            label={t('common:pick_handling-unit_grouping')}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            checkComponent={(data: any) => (
                                <HandlingUnitChecksWithoutChecks dataToCheck={data} />
                            )}
                        ></ScanHandlingUnit>
                    ) : (
                        <></>
                    )}
                    {locationToPropose !== 'noValue' &&
                    storedObject[
                        !manuallyGenerateParent ||
                        storedObject['step10']?.data?.round?.handlingUnitOutbounds?.filter(
                            (huo: any) => huo.status === 500
                        ).length !== 0
                            ? 'step10'
                            : 'step15'
                    ]?.data &&
                    !storedObject['step20']?.data ? (
                        <ScanLocation
                            processName={processName}
                            stepNumber={20}
                            label={
                                isLocationDefined
                                    ? t('common:location-var', {
                                          name: `${locationToPropose}`
                                      })
                                    : t('common:location')
                            }
                            triggerAlternativeSubmit1={{
                                triggerAlternativeSubmit1: triggerHuClose,
                                setTriggerAlternativeSubmit1: setTriggerHuClose
                            }}
                            action1Trigger={{
                                action1Trigger: triggerNextRaa,
                                setAction1Trigger: setTriggerNextRaa
                            }}
                            buttons={{
                                submitButton: true,
                                backButton: true,
                                alternativeSubmitButton1: isHuInProgress,
                                locationButton: true,
                                action1Button: hasMultipleLocationIds
                            }}
                            enforcedValue={!tmpForceLocation ? locationToPropose : undefined}
                            checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                            showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                            showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                            headerContent={{ headerContent, setHeaderContent }}
                            forceLocation={{ tmpForceLocation, setTmpforceLocation }}
                        ></ScanLocation>
                    ) : (
                        <></>
                    )}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <SelectLocationByLevelForm
                            processName={processName}
                            stepNumber={30}
                            buttons={{ submitButton: true, backButton: true }}
                            showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                            locations={storedObject['step20'].data.locations}
                            dontAskBeforeLocationChange={dontAskBeforeLocationChange}
                        ></SelectLocationByLevelForm>
                    ) : (
                        <></>
                    )}
                    {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                        <ScanHandlingUnit
                            processName={processName}
                            stepNumber={40}
                            label={t('common:handling-unit')}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            checkComponent={(data: any) => (
                                <HandlingUnitChecks dataToCheck={data} />
                            )}
                            defaultValue={storedObject['step30'].data.handlingUnit ?? undefined}
                        ></ScanHandlingUnit>
                    ) : (
                        <></>
                    )}
                    {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                        <ScanArticleEAN
                            processName={processName}
                            stepNumber={50}
                            label={t('common:article-var', {
                                name: `${articleToPropose}`
                            })}
                            triggerAlternativeSubmit1={{
                                triggerAlternativeSubmit1: triggerChangeLocationFromArticle,
                                setTriggerAlternativeSubmit1: setTriggerChangeLocationFromArticle
                            }}
                            action1Trigger={{
                                action1Trigger: triggerNextRaa,
                                setAction1Trigger: setTriggerNextRaa
                            }}
                            buttons={{
                                submitButton: true,
                                backButton: true,
                                alternativeSubmitButton1: !forceLocationScan && forceArticleScan,
                                action1Button: hasMultipleLocationIds
                            }}
                            forceArticleScan={forceArticleScan}
                            contents={
                                storedObject['step40']?.data?.handlingUnit?.handlingUnitContents
                            }
                            checkComponent={(data: any) => (
                                <ArticleChecks
                                    dataToCheck={data}
                                    setTmpforceLocation={setTmpforceLocation}
                                />
                            )}
                        ></ScanArticleEAN>
                    ) : (
                        <></>
                    )}
                    {storedObject['step50']?.data &&
                    !(
                        storedObject['step60']?.data?.processedFeatures?.length >=
                        storedObject['step50'].data?.article?.featureType?.length
                    ) ? (
                        <ScanFeature
                            processName={processName}
                            stepNumber={60}
                            label={t('common:feature-code')}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            dataInfos={storedObject['step50']?.data}
                            action1Trigger={{
                                action1Trigger: finishUniqueFeatures,
                                setAction1Trigger: setFinishUniqueFeatures
                            }}
                            featureType={storedObject['step50'].data?.article?.featureType}
                            processedFeatures={
                                storedObject['step60']?.data?.processedFeatures ?? undefined
                            }
                            nextFeatureCode={
                                storedObject['step60']?.data?.nextFeatureCode ?? undefined
                            }
                            checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                        ></ScanFeature>
                    ) : (
                        <></>
                    )}
                    {storedObject['step60']?.data &&
                    storedObject['step60']?.data.processedFeatures?.length >=
                        storedObject['step50'].data?.article?.featureType?.length &&
                    !storedObject['step70']?.data ? (
                        <EnterQuantity_reducer
                            processName={processName}
                            stepNumber={70}
                            label={t('common:quantity-var', {
                                number: `${storedObject[
                                    'step10'
                                ].data.proposedRoundAdvisedAddresses.reduce(
                                    (total: number, current: any) => total + current.quantity,
                                    0
                                )}`
                            })}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            initialValueType={quantityDefaultValue}
                            availableQuantity={Math.min(
                                storedObject['step10'].data.proposedRoundAdvisedAddresses.reduce(
                                    (total: number, current: any) => total + current.quantity,
                                    0
                                ),
                                storedObject[
                                    'step40'
                                ]?.data?.handlingUnit?.handlingUnitContents.find((content: any) =>
                                    storedObject['step60']?.data.processedFeatures.every(
                                        (feature_filter: any) =>
                                            content.handlingUnitContentFeatures.some(
                                                (feature_content: any) =>
                                                    feature_content.featureCode.id ===
                                                        feature_filter.featureCodeId &&
                                                    feature_content.value === feature_filter.value
                                            )
                                    )
                                )?.quantity
                            )}
                            autoValidate1Quantity={autoValidate1Quantity}
                            checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {isPositionChecked &&
                    storedObject['step70']?.data &&
                    !storedObject['step75']?.data ? (
                        <ScanPosition
                            processName={processName}
                            stepNumber={75}
                            label={t('common:pick_position')}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            checkComponent={(data: any) => (
                                <PositionChecks
                                    dataToCheck={data}
                                    handlingUnitOutboundInfos={
                                        proposedRoundAdvisedAddress?.roundLineDetail
                                            ?.handlingUnitContentOutbounds[0]?.handlingUnitOutbound
                                    }
                                />
                            )}
                            defaultValue={
                                storedObject['step10']?.data?.pickAndPackType === 'fullBox'
                                    ? 'fullBox'
                                    : undefined
                            }
                        ></ScanPosition>
                    ) : (
                        <></>
                    )}
                    {storedObject['step75']?.data || isAutoValidateLoading ? (
                        <AutoValidatePickForm
                            processName={processName}
                            stepNumber={80}
                            buttons={{ submitButton: true, backButton: true }}
                            toBePalletized={toBePalletizedForBackEnd}
                            autoValidateLoading={{
                                isAutoValidateLoading,
                                setIsAutoValidateLoading
                            }}
                        ></AutoValidatePickForm>
                    ) : (
                        <></>
                    )}
                </>
            )}
        </PageContentWrapper>
    );
};

Pick.layout = MainLayout;

export default Pick;
