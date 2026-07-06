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
import { FC, use, useEffect, useMemo, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import {
    ButtonManagementType,
    HeaderManagementType,
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    getModesFromPermissions,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Form, InputNumber, Modal, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { EnterQuantity_reducer } from '@CommonRadio';
import { SelectLocationByLevelForm } from 'modules/Preparation/Pick/Forms/SelectLocationByLevelForm';
import { QuantityChecks } from 'modules/Preparation/Pick/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/Pick/Forms/SelectRoundForm';
import { SelectEquipmentForm } from 'modules/Preparation/Pick/Forms/SelectEquipmentForm';
import { HandlingUnitChecks } from 'modules/Preparation/Pick/ChecksAndRecords/HandlingUnitChecks';
import { HandlingUnitChecksWithoutChecks } from 'modules/Preparation/Pick/ChecksAndRecords/HandlingUnitEquipmentChecks';
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
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';
import { ModeEnum } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { handlePickProcessResult } from 'modules/Preparation/Pick/Elements/endOfProcessHandling';

type PageComponent = FC & { layout: typeof MainLayout };

const Pick: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters, configs, permissions } = useAppState();
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
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
    const [visible, setVisible] = useState<boolean>(false);
    const [form] = Form.useForm();
    const [missingForm] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const [uptodateQty, setUptodateQty] = useState<number | null>(null);
    const [isEnterQtyDisplay, setIsEnterQtyDisplay] = useState<boolean>(false);

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
    //#endregion

    //#region Configs and parameters
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
        const checkRemainingQuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_CHECK_REMAINING_QUANTITY'
        );

        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const movementValidatedValue = findCodeByScopeAndValue(
            configs,
            'movement_status',
            'VALIDATED'
        );

        const movementPreparationValue = findCodeByScopeAndValue(
            configs,
            'movement_type',
            'PREPARATION'
        );

        const movementProductPickValue = findCodeByScopeAndValue(
            parameters,
            'movement_code',
            'PRODUCT PICK'
        );

        // Convert value in boolean or number as needed
        const movementValidated = movementValidatedValue ? parseInt(movementValidatedValue) : null;
        const movementPreparation = movementPreparationValue
            ? parseInt(movementPreparationValue)
            : null;
        const movementProductPick = movementProductPickValue
            ? parseInt(movementProductPickValue)
            : null;
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

        const checkRemainingQuantity = checkRemainingQuantityValue === '1';

        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const equipmentHuType = findCodeByScope(parameters, 'handling_unit_type', 'EQUIPMENT');

        return {
            movementValidated,
            movementPreparation,
            movementProductPick,
            equipmentScanAtPreparation,
            manuallyGenerateParent,
            noAskBeforeLocationChange,
            forceLocationScan,
            forceArticleScan,
            defaultQuantity,
            autoValidate1Quantity,
            highlightQuantity,
            equipmentHuType,
            checkRemainingQuantity
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
    const checkRemainingQuantity = configsParamsCodes.checkRemainingQuantity;
    //#endregion

    //#region forcelocation
    const [tmpForceLocation, setTmpforceLocation] = useState<any>(forceLocationScan);
    useEffect(() => {
        if (parameters && parameters.length > 0) {
            setIsLoading(false);
        }
    }, [parameters]);
    ///#endregion

    //#region extract data & checks
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
    //#endregion

    //#region RadioInfosHeader settings
    const round = storedObject['step10']?.data?.round;
    const hasRound = !!(round && storedObject['step10']?.data?.proposedRoundAdvisedAddresses);

    // Global picking progress of the round
    const totalProcessedQuantity = hasRound
        ? round.roundAdvisedAddresses.reduce(
              (sum: number, address: any) => sum + address.roundLineDetail.processedQuantity,
              0
          )
        : 0;
    const totalQuantityToBeProcessed = hasRound
        ? round.roundAdvisedAddresses.reduce(
              (sum: number, address: any) => sum + address.roundLineDetail.quantityToBeProcessed,
              0
          )
        : 0;

    // Grouping HU (either the scanned string or the fetched object)
    const groupingHu = storedObject['step15']?.data?.handlingUnit;
    const groupingHuValue = typeof groupingHu === 'string' ? groupingHu : groupingHu?.name;

    // Location: expected (before choosing) vs actual, with a dynamic label
    const chosenLocation = storedObject['step30']?.data?.chosenLocation;
    const locationLabel =
        !chosenLocation && isLocationDefined
            ? t('common:expected-location_abbr')
            : t('common:location_abbr');
    const locationValue = !chosenLocation
        ? isLocationDefined
            ? addNextLocationDisplay(proposedRoundAdvisedAddress.location.name)
            : t('d:no-location-defined')
        : addNextLocationDisplay(chosenLocation.name);

    // Features + available quantity (variable number of dynamic rows)
    const featureRows: HeaderManagementType = [];
    let availableQuantity: any;
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
        availableQuantity = Math.min(handling_unit_contents?.quantity, uptodateQty ?? Infinity);
        processedFeatures.forEach((feature: any) => {
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
            featureRows.push({ label: featureCode.name, value: formattedValue, visible: true });
        });
    }

    const totalExpectedQuantity = hasRound
        ? storedObject['step10']?.data?.proposedRoundAdvisedAddresses.reduce(
              (total: number, current: any) => total + current.quantity,
              0
          )
        : 0;
    const movingQuantity = storedObject['step70']?.data?.movingQuantity;
    const hasStockOwner = !!proposedRoundAdvisedAddress?.handlingUnitContent?.stockOwner;
    const scannedHu = storedObject['step40']?.data?.handlingUnit;

    // Declarative header configuration (mirrors buttonManagement). Order = display order.
    const headerManagement: HeaderManagementType = [
        {
            label: t('common:equipment'),
            value: storedObject['step5']?.data?.equipmentName,
            visible: !!storedObject['step5']?.data?.equipmentName
        }
    ];

    if (hasRound) {
        headerManagement.push(
            { label: t('common:round'), value: round.name, visible: true },
            {
                label: t('common:total-picked-quantity'),
                value: totalProcessedQuantity + '/' + totalQuantityToBeProcessed,
                visible: true
            },
            {
                label: t('common:handling-unit-final_abbr'),
                value: proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]
                    ?.handlingUnitOutbound?.name,
                visible: storedObject['step10']?.data?.pickAndPackType === 'detail'
            },
            {
                label: t('common:pick_handling-unit_grouping'),
                value: groupingHuValue,
                visible: !!groupingHu
            },
            {
                label: t('common:pick_position'),
                value: proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]
                    ?.handlingUnitOutbound?.roundPosition,
                visible: !!isPositionChecked
            },
            { label: locationLabel, value: locationValue, visible: true },
            {
                label: t('common:expected-stock-owner_abbr'),
                value: proposedRoundAdvisedAddress?.handlingUnitContent?.stockOwner?.name,
                visible: hasStockOwner && !scannedHu
            },
            {
                // UM (handling unit): once scanned
                label: t('common:handling-unit_abbr'),
                value: scannedHu?.name,
                visible: hasStockOwner && !!scannedHu
            },
            {
                label: t('common:stock-owner_abbr'),
                value: scannedHu?.handlingUnitContents?.[0]?.stockOwner?.name,
                visible: hasStockOwner && !!scannedHu
            },
            {
                label: t('common:expected-article_abbr'),
                value: expectedArticle?.name,
                visible: !storedObject['step50']?.data?.article
            },
            {
                label: t('common:article_abbr'),
                value: storedObject['step50']?.data?.article?.name,
                visible: !!storedObject['step50']?.data?.article
            },
            {
                label: t('common:supplier-article-code'),
                value: (storedObject['step50']?.data?.article ?? expectedArticle)
                    ?.genericArticleComment,
                visible: true
            },
            {
                label: t('common:article-description'),
                value: expectedArticle?.description,
                visible: true
            },
            {
                label: t('common:available-quantity'),
                value: availableQuantity,
                visible: !!storedObject['step60']?.data?.processedFeatures
            },
            ...featureRows,
            {
                label: t('common:expected-quantity_abbr'),
                value: totalExpectedQuantity,
                visible: !movingQuantity,
                highlight: isQuantityHighlighted
            },
            {
                label: t('common:quantity_abbr'),
                value: movingQuantity ? `${movingQuantity}/${totalExpectedQuantity}` : undefined,
                visible: !!movingQuantity
            }
        );
    }

    // Build the displayed object from the declarative configuration
    const headerDisplay = buildHeaderDisplay(headerManagement);
    //#endregion

    //#region settings for this module
    useEffect(() => {
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

        // If isLocationDefined is false after the pick selection step, force location scan
        if (storedObject['step10']?.data && !isLocationDefined) {
            setTmpforceLocation(true);
        }
    }, [storedObject]);

    function findHUEquipment(handlingUnitOutbounds: any[]) {
        return (
            handlingUnitOutbounds.find((huo) => {
                return huo.handlingUnit?.type === parseInt(configsParamsCodes.equipmentHuType);
            }) || null
        );
    }

    let isANewHUEquipment = true;

    if (storedObject['step10']?.data) {
        isANewHUEquipment = findHUEquipment(
            storedObject['step10']?.data?.round?.handlingUnitOutbounds
        )
            ? false
            : true;
    }
    //#endregion

    //#region global buttons
    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setShowSimilarLocations(false);
        setTmpforceLocation(forceLocationScan);
        setIsEnterQtyDisplay(false);
        setUptodateQty(null);
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
        setTmpforceLocation(forceLocationScan);
        form.resetFields();
    };

    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${storedObject.currentStep}`].previousStep}`
        });
        form.resetFields();
    };

    const handleCancel = () => {
        setVisible(false);
        missingForm.resetFields();
    };
    //#endregion

    //#region specific functions
    const [isHuClosureLoading, setIsHuClosureLoading] = useState(false);
    async function closeHUO(currentShippingPalletId: any) {
        const ignoreHUContentIds = storedObject.ignoreHUContentIds || [];
        setIsHuClosureLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_pickAndPack_closeShippingPallet',
            event: {
                input: { currentShippingPalletId }
            }
        };

        try {
            const closeHUOsResult = await graphqlRequestClient.request(query, variables);
            if (closeHUOsResult.executeFunction.status === 'ERROR') {
                showError(closeHUOsResult.executeFunction.output);
            } else if (
                closeHUOsResult.executeFunction.status === 'OK' &&
                closeHUOsResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${closeHUOsResult.executeFunction.output.output.code}`));
                console.log('Backend_message', closeHUOsResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:hu-ready-to-be-loaded'));
                const newStoredObject: any = storedObject;
                if (ignoreHUContentIds.length > 0) {
                    newStoredObject.ignoreHUContentIds = ignoreHUContentIds;
                } else {
                    newStoredObject.ignoreHUContentIds = [];
                }
                const { updatedRound } = closeHUOsResult.executeFunction.output.output;

                let remainingHUContentIds = updatedRound.roundAdvisedAddresses
                    .filter((raa: any) => {
                        return !newStoredObject.ignoreHUContentIds.includes(
                            raa.handlingUnitContentId
                        );
                    })
                    .filter((raa: any) => raa.quantity != 0);
                if (remainingHUContentIds.length === 0) {
                    newStoredObject.ignoreHUContentIds = [];
                    remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
                        (raa: any) => raa.quantity != 0
                    );
                }

                const roundAdvisedAddresses = updatedRound.roundAdvisedAddresses.filter(
                    (raa: any) => raa.quantity != 0
                );
                const data = {
                    proposedRoundAdvisedAddresses: roundAdvisedAddresses.filter(
                        (raa: any) =>
                            raa.handlingUnitContentId ==
                            remainingHUContentIds[0].handlingUnitContentId
                    ),
                    round: updatedRound,
                    pickAndPackType: updatedRound.equipment.checkPosition ? 'detail' : 'fullBox'
                };
                newStoredObject['currentStep'] = 10;
                if (storedObject[`step5`]) {
                    newStoredObject[`step5`] = {
                        ...storedObject[`step5`]
                    };
                }
                newStoredObject[`step10`] = { previousStep: storedObject[`step5`] ? 5 : 0, data };
                delete newStoredObject['step10']['data']['currentShippingPallet'];
                dispatch({
                    type: 'UPDATE_BY_PROCESS',
                    processName,
                    object: newStoredObject
                });
            }
            setIsHuClosureLoading(false);
        } catch (error) {
            showError(t('messages:error-updating-data'));
            console.log('updateHUOsError', error);
            setIsHuClosureLoading(false);
        }
    }

    const handlingUnitContentId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.id;
    const ignoreHUContentIds = storedObject.ignoreHUContentIds || [];

    useEffect(() => {
        if (triggerNextRaa && storedObject['step20']) {
            setTriggerNextRaa(false);
            let newIgnoreHUContentIds = [...ignoreHUContentIds, handlingUnitContentId];
            let remainingHUContentIds = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => {
                    return !newIgnoreHUContentIds.includes(raa.handlingUnitContentId);
                })
                .filter((raa: any) => raa.quantity != 0);
            if (remainingHUContentIds.length === 0) {
                newIgnoreHUContentIds = [];
                remainingHUContentIds = storedObject[
                    `step10`
                ]?.data?.round.roundAdvisedAddresses.filter((raa: any) => raa.quantity != 0);
            }
            const raaForHUC = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => raa.quantity != 0)
                .filter(
                    (raa: any) =>
                        raa.handlingUnitContentId ===
                        remainingHUContentIds[0]?.handlingUnitContentId
                );

            // Find next roundAdvisedAddress with different locationId
            const currentLocationId =
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.locationId;
            const differentLocationRaa = raaForHUC.find(
                (raa: any) => raa.locationId !== currentLocationId
            );
            const raaToUse = differentLocationRaa || raaForHUC[0];

            // Apply checkPosition condition to propose one or cumulated article
            const newProposedRoundAdvisedAddresses = storedObject[`step10`]?.data?.round.equipment
                .checkPosition
                ? [raaToUse]
                : raaForHUC;
            setShowSimilarLocations(false);
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step10`,
                object: {
                    ...storedObject[`step10`],
                    data: {
                        ...storedObject[`step10`]?.data,
                        proposedRoundAdvisedAddresses: newProposedRoundAdvisedAddresses
                    }
                },
                customFields: [{ key: 'ignoreHUContentIds', value: newIgnoreHUContentIds }]
            });
        }
        if (triggerNextRaa && storedObject['step50']) {
            setTriggerNextRaa(false);
            let newIgnoreHUContentIds = [...ignoreHUContentIds, handlingUnitContentId];
            let remainingHUContentIds = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => {
                    return !newIgnoreHUContentIds.includes(raa.handlingUnitContentId);
                })
                .filter((raa: any) => raa.quantity != 0);
            if (remainingHUContentIds.length === 0) {
                newIgnoreHUContentIds = [];
                remainingHUContentIds = storedObject[
                    `step10`
                ]?.data?.round.roundAdvisedAddresses.filter((raa: any) => raa.quantity != 0);
            }
            const raaForHUC = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => raa.quantity != 0)
                .filter(
                    (raa: any) =>
                        raa.handlingUnitContentId ===
                        remainingHUContentIds[0]?.handlingUnitContentId
                );

            // Find next roundAdvisedAddress with different locationId
            const currentLocationId =
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.locationId;
            const differentLocationRaa = raaForHUC.find(
                (raa: any) => raa.locationId !== currentLocationId
            );
            const raaToUse = differentLocationRaa || raaForHUC[0];

            // Apply checkPosition condition to propose one or cumulated article
            const newProposedRoundAdvisedAddresses = storedObject[`step10`]?.data?.round.equipment
                .checkPosition
                ? [raaToUse]
                : raaForHUC;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step10`,
                object: {
                    ...storedObject[`step10`],
                    data: {
                        ...storedObject[`step10`]?.data,
                        proposedRoundAdvisedAddresses: newProposedRoundAdvisedAddresses
                    }
                },
                customFields: [{ key: 'ignoreHUContentIds', value: newIgnoreHUContentIds }]
            });

            // Transform raaToUse.handlingUnitContent to handlingUnit format
            const handlingUnitContent = raaToUse?.handlingUnitContent;
            const handlingUnitFromRaa = {
                id: handlingUnitContent?.handlingUnit?.id,
                name: handlingUnitContent?.handlingUnit?.name,
                locationId: raaToUse?.locationId,
                location: raaToUse?.location,
                handlingUnitContents: [
                    {
                        id: handlingUnitContent?.id,
                        quantity: handlingUnitContent?.quantity,
                        reservation: handlingUnitContent?.reservation,
                        stockStatus: handlingUnitContent?.stockStatus,
                        stockStatusText: handlingUnitContent?.stockStatusText,
                        stockOwnerId: handlingUnitContent?.stockOwnerId,
                        stockOwner: handlingUnitContent?.stockOwner,
                        articleId: handlingUnitContent?.articleId,
                        article: handlingUnitContent?.article,
                        handlingUnitContentFeatures:
                            handlingUnitContent?.handlingUnitContentFeatures || []
                    }
                ]
            };
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step30`,
                object: {
                    ...storedObject[`step30`],
                    data: {
                        ...storedObject[`step30`]?.data,
                        chosenLocation: { ...raaToUse?.location, id: raaToUse?.locationId },
                        handlingUnit: handlingUnitFromRaa
                    }
                }
            });
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step40`,
                object: {
                    ...storedObject[`step40`],
                    data: {
                        ...storedObject[`step40`]?.data,
                        handlingUnit: handlingUnitFromRaa
                    }
                }
            });
        }
    }, [triggerNextRaa]);

    const currentShippingPalletId = storedObject?.step10?.data?.round.extraText1 ?? undefined;
    useEffect(() => {
        if (triggerHuClose) {
            if (!currentShippingPalletId) {
                showError(t('messages:no-hu-to-close'));
                setTriggerHuClose(false);
            } else {
                setTriggerHuClose(false);
                closeHUO(currentShippingPalletId);
            }
        }
    }, [triggerHuClose, currentShippingPalletId]);

    useEffect(() => {
        if (triggerChangeLocationFromArticle) {
            dispatch({
                type: 'ON_BACK',
                processName: processName,
                stepToReturn: `step20`
            });
            setTriggerChangeLocationFromArticle(false);
            setTmpforceLocation(true);
        }
    }, [triggerChangeLocationFromArticle, currentShippingPalletId]);
    //#endregion

    //#region missing declaration modal
    const [missingModalConfirmLoading, setMissingModalConfirmLoading] = useState<boolean>(false);

    const onClickOk = () => {
        setMissingModalConfirmLoading(true);
        missingForm
            .validateFields()
            .then(async (values) => {
                console.log('Missing modal form values:', values);
                const inputToValidate = {
                    ...values,
                    proposedRoundAdvisedAddresses:
                        storedObject['step10']?.data?.proposedRoundAdvisedAddresses,
                    round: storedObject['step10']?.data?.round,
                    equipmentHUOPalletId:
                        storedObject['step15']?.data?.handlingUnit?.handlingUnitOutbounds?.[0]?.id
                };
                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'declare_missing_quantity',
                    event: {
                        input: inputToValidate
                    }
                };
                const validateFullBoxResult = await graphqlRequestClient.request(query, variables);

                handlePickProcessResult({
                    result: validateFullBoxResult,
                    t,
                    storedObject,
                    processName,
                    dispatch,
                    setIsAutoValidateLoading,
                    huName: storedObject.step15?.data?.handlingUnit,
                    huType: storedObject.step15?.data?.handlingUnitType,
                    roundNumber: storedObject.step10?.data?.round?.number,
                    context: 'declareMissing'
                });

                setVisible(false);
                missingForm.resetFields();
                setMissingModalConfirmLoading(false);
            })
            .catch((errorInfo) => {
                console.log('Validation failed:', errorInfo);
                setMissingModalConfirmLoading(false);
            });
    };

    const missingModal = () => {
        const maxQuantity = storedObject['step10']?.data?.proposedRoundAdvisedAddresses.reduce(
            (total: number, current: any) => total + current.quantity,
            0
        );
        return (
            <Modal
                title={t('common:missing-quantity')}
                open={visible}
                onCancel={handleCancel}
                onOk={onClickOk}
                width={800}
                confirmLoading={missingModalConfirmLoading}
                okText={t('actions:submit')}
                cancelText={t('actions:cancel')}
            >
                <Form form={missingForm} layout="vertical" scrollToFirstError size="small">
                    <Form.Item
                        label={t('common:quantity')}
                        name="missingQuantity"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') },
                            {
                                type: 'number',
                                min: 1,
                                message: t('messages:select-number-min', {
                                    min: 1
                                })
                            },
                            {
                                type: 'number',
                                max: maxQuantity,
                                message: t('messages:select-number-max', {
                                    max: maxQuantity
                                })
                            }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            max={maxQuantity}
                            style={{ width: '100%' }}
                            autoFocus
                        />
                    </Form.Item>
                </Form>
            </Modal>
        );
    };
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonManagementType = [
        {
            key: 'submit',
            label: t('actions:submit'),
            visibleOnSteps: [5, 10, 15, 20, 30, 40, 50, 60, 70, 75],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'close-shipping-hu',
            label: t('actions:close-shipping-hu'),
            visibleOnSteps: [20],
            permissionsToSeeTheButton: isHuInProgress,
            onClick: () => setTriggerHuClose(true),
            position: 'bottom'
        },
        {
            key: 'missing-quantity',
            label: t('common:missing-quantity'),
            visibleOnSteps: [50],
            permissionsToSeeTheButton: getModesFromPermissions(
                permissions,
                'mobile_button_missing-handling'
            ).includes(ModeEnum.Read),
            onClick: () => {
                setVisible(true);
            },
            position: 'top',
            style: {
                background: 'radial-gradient(circle, #ff8a1ce8 5%, #f4a261 100%)'
            }
        },
        {
            key: 'locations',
            label: t('common:locations_abbr'),
            icon: null,
            visibleOnSteps: [20],
            permissionsToSeeTheButton: !showSimilarLocations && !showEmptyLocations,
            onClick: () => {
                setShowSimilarLocations(true);
            },
            position: 'bottom'
        },
        {
            key: 'change-location',
            label: t('common:change-location'),
            visibleOnSteps: [50],
            permissionsToSeeTheButton: !forceLocationScan && forceArticleScan ? true : false,
            onClick: () => {
                setTriggerChangeLocationFromArticle(true);
            },
            position: 'bottom'
        },
        {
            key: 'next',
            label: t('actions:next'),
            visibleOnSteps: [20, 50],
            permissionsToSeeTheButton: hasMultipleLocationIds ? true : false,
            onClick: () => {
                setTriggerNextRaa(true);
            },
            position: 'bottom'
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [10, 15, 20, 30, 40, 50, 60, 70, 75],
            permissionsToSeeTheButton:
                equipmentScanAtPreparation && storedObject['step10'] ? true : false || true,
            onClick: () => {
                if (showSimilarLocations) {
                    setShowSimilarLocations(false);
                } else {
                    setIsEnterQtyDisplay(false);
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

    // #region EnterQuantity pre checks
    // this part to adjust pick movement quantitites not yet terminated and display step 70 accordingly
    if (
        storedObject['step60']?.data &&
        storedObject['step60']?.data.processedFeatures?.length >=
            storedObject['step50'].data?.article?.featureType?.length &&
        !storedObject['step70']?.data &&
        !isEnterQtyDisplay
    ) {
        const getUptodateQuantity = async (originalContentId: string) => {
            const contentQuery = gql`
                query handlingUnitContent($id: String!) {
                    handlingUnitContent(id: $id) {
                        id
                        quantity
                    }
                }
            `;

            const movementQuery = gql`
                query movementsQuantities(
                    $filters: MovementSearchFilters!
                    $advancedFilters: [MovementAdvancedSearchFilters!]
                    $functions: [JSON!]
                ) {
                    movements(
                        filters: $filters
                        advancedFilters: $advancedFilters
                        functions: $functions
                    ) {
                        results {
                            originalContentIdStr
                            functionSum
                        }
                    }
                }
            `;

            const [contentResponse, movementsResponse] = await Promise.all([
                graphqlRequestClient.request(contentQuery, { id: originalContentId }),
                graphqlRequestClient.request(movementQuery, {
                    filters: {
                        originalContentIdStr: originalContentId,
                        code: configsParamsCodes.movementProductPick,
                        type: configsParamsCodes.movementPreparation
                    },
                    advancedFilters: {
                        filter: [
                            {
                                field: { status: configsParamsCodes.movementValidated },
                                searchType: 'INFERIOR'
                            }
                        ]
                    },
                    functions: [{ function: 'sum', fields: ['quantity'] }]
                })
            ]);

            if (movementsResponse.movements.results && contentResponse.handlingUnitContent) {
                const movementsQuantity =
                    movementsResponse.movements.results[0]?.functionSum.quantity ?? 0;
                const contentQuantity = contentResponse.handlingUnitContent?.quantity ?? 0;
                const adjustedQuantity = contentQuantity - movementsQuantity;
                setIsEnterQtyDisplay(true);
                setUptodateQty(adjustedQuantity);
            }
        };
        getUptodateQuantity(storedObject['step60']?.data?.content?.id);
    } else if (storedObject['step70']?.data && isEnterQtyDisplay) {
        setIsEnterQtyDisplay(false);
    }
    //#end region

    //#region RETURN
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
                <RadioButtonWrapper
                    buttonManagement={orderedButtonManagement}
                    currentStep={storedObject.currentStep}
                >
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
                            formToUse={form}
                        ></SelectEquipmentForm>
                    ) : (
                        <></>
                    )}
                    {(!equipmentScanAtPreparation || storedObject['step5']?.data) &&
                    !storedObject['step10']?.data ? (
                        <SelectRoundForm
                            processName={processName}
                            stepNumber={10}
                            formToUse={form}
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
                            formToUse={form}
                            isANewHUEquipment={isANewHUEquipment}
                            checkComponent={(data: any) => (
                                <HandlingUnitChecksWithoutChecks dataToCheck={data} />
                            )}
                        ></ScanHandlingUnit>
                    ) : (
                        <></>
                    )}
                    {storedObject[
                        !manuallyGenerateParent ||
                        storedObject['step10']?.data?.round?.handlingUnitOutbounds?.filter(
                            (huo: any) => huo.status === 500
                        ).length !== 0
                            ? 'step10'
                            : 'step15'
                    ]?.data && !storedObject['step20']?.data ? (
                        <ScanLocation
                            processName={processName}
                            stepNumber={20}
                            label={
                                isLocationDefined
                                    ? t('common:location-var', {
                                          name: `${proposedRoundAdvisedAddress.location?.name || t('d:no-location-defined')}`
                                      })
                                    : t('common:location')
                            }
                            enforcedValue={
                                !tmpForceLocation
                                    ? proposedRoundAdvisedAddress.location?.name ||
                                      t('d:no-location-defined')
                                    : undefined
                            }
                            checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                            showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                            showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                            isHuClosureLoading={isHuClosureLoading}
                            headerContent={{ headerContent, setHeaderContent }}
                            forceLocation={{ tmpForceLocation, setTmpforceLocation }}
                            formToUse={form}
                        ></ScanLocation>
                    ) : (
                        <></>
                    )}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <SelectLocationByLevelForm
                            processName={processName}
                            stepNumber={30}
                            showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                            locations={storedObject['step20'].data.locations}
                            setTmpforceLocation={setTmpforceLocation}
                            dontAskBeforeLocationChange={dontAskBeforeLocationChange}
                            formToUse={form}
                        ></SelectLocationByLevelForm>
                    ) : (
                        <></>
                    )}
                    {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                        <ScanHandlingUnit
                            processName={processName}
                            stepNumber={40}
                            label={t('common:handling-unit')}
                            checkComponent={(data: any) => (
                                <HandlingUnitChecks dataToCheck={data} />
                            )}
                            defaultValue={storedObject['step30'].data.handlingUnit ?? undefined}
                            formToUse={form}
                        ></ScanHandlingUnit>
                    ) : (
                        <></>
                    )}
                    {storedObject['step40']?.data && !storedObject['step50']?.data ? (
                        <ScanArticleEAN
                            processName={processName}
                            stepNumber={50}
                            label={t('common:article-var', {
                                name: `${proposedRoundAdvisedAddress?.handlingUnitContent?.article?.name}`
                            })}
                            form={form}
                            forceArticleScan={forceArticleScan}
                            contents={
                                storedObject['step40']?.data?.handlingUnit?.handlingUnitContents
                            }
                            checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
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
                            form={form}
                            checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                        ></ScanFeature>
                    ) : (
                        <></>
                    )}
                    {isEnterQtyDisplay ? (
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
                            initialValueType={quantityDefaultValue}
                            requiredMaxQuantity={Math.min(
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
                                )?.quantity,
                                uptodateQty ?? Infinity
                            )}
                            stockMaxQuantity={uptodateQty ?? Infinity}
                            autoValidate1Quantity={autoValidate1Quantity}
                            checkRemainingQuantity={checkRemainingQuantity}
                            formToUse={form}
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
                            formToUse={form}
                        ></ScanPosition>
                    ) : (
                        <></>
                    )}
                    {storedObject['step75']?.data ||
                    (!isPositionChecked && storedObject['step70']?.data) ? (
                        <AutoValidatePickForm
                            processName={processName}
                            stepNumber={80}
                            toBePalletized={toBePalletizedForBackEnd}
                            autoValidateLoading={{
                                isAutoValidateLoading,
                                setIsAutoValidateLoading
                            }}
                        ></AutoValidatePickForm>
                    ) : (
                        <></>
                    )}
                </RadioButtonWrapper>
            )}
            {missingModal()}
        </PageContentWrapper>
    );
};
// #endregion

Pick.layout = MainLayout;

export default Pick;
