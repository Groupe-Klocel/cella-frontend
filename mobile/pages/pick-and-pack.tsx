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
import {
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    getModesFromPermissions,
    useTranslationWithFallback as useTranslation,
    showError,
    showSuccess,
    ButtonManagementType,
    HeaderManagementType
} from '@helpers';
import { Form, InputNumber, Modal, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { EnterQuantity_reducer, SimilarLocationsV2 } from '@CommonRadio';
import { SelectLocationByLevelForm } from 'modules/Preparation/PickAndPack/Forms/SelectLocationByLevelForm';
import { QuantityChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/PickAndPack/Forms/SelectRoundForm';
import { SelectEquipmentForm } from 'modules/Preparation/PickAndPack/Forms/SelectEquipmentForm';
import { HandlingUnitChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/HandlingUnitChecks';
import { HandlingUnitChecksWithoutChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/HandlingUnitChecksWithoutChecks';
import { ScanLocation } from 'modules/Preparation/PickAndPack/PagesContainer/ScanLocation';
import { LocationChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/LocationChecks';
import { ArticleChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/ArticleChecks';
import { ScanFeature } from 'modules/Preparation/PickAndPack/PagesContainer/ScanFeature';
import { FeatureChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/FeatureChecks';
import { ScanHandlingUnit } from 'modules/Preparation/PickAndPack/PagesContainer/ScanHandlingUnit';
import moment from 'moment';
import { ScanArticleEAN } from 'modules/Preparation/PickAndPack/PagesContainer/ScanArticleEAN';
import { AutoValidatePickAndPackForm } from 'modules/Preparation/PickAndPack/Forms/AutoValidatePickAndPack';
import { HandlingUnitOutboundFinalChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/HandlingUnitOutboundFinalChecks';
import { ScanFinalHandlingUnitOutbound } from 'modules/Preparation/PickAndPack/PagesContainer/ScanFinalHandlingUnitOutbound';
import { SelectHuModelForm } from 'modules/Preparation/PickAndPack/Forms/SelectHuModelForm';
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { RadioButtonWrapper, useValidationButtonLock } from 'helpers/utils/radioButtonWrapper';
import { ModeEnum } from 'generated/graphql';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import {
    handlePickAndPackProcessResult,
    roundAdvisedAddressCouple
} from 'modules/Preparation/PickAndPack/Elements/endOfProcessHandling';
import {
    getExpectedArticle,
    getExpectedArticleId
} from 'modules/Preparation/PickAndPack/Elements/expectedArticle';

type PageComponent = FC & { layout: typeof MainLayout };

const PickAndPack: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters, permissions } = useAppState();
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [triggerHuClose, setTriggerHuClose] = useState<boolean>(false);
    const [triggerNextRaa, setTriggerNextRaa] = useState<boolean>(false);
    const [isHuInProgress, setIsHuInProgress] = useState<boolean>(false);
    const [isAutoValidateLoading, setIsAutoValidateLoading] = useState<boolean>(false);
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [toBePalletizedForBackEnd, setToBePalletizedForBackEnd] = useState<boolean>(true);
    const [toBePalletizedForHUModel, setToBePalletizedForHUModel] = useState<boolean>(true);
    const [triggerChangeLocationFromArticle, setTriggerChangeLocationFromArticle] =
        useState<boolean>(false);
    const [visible, setVisible] = useState<boolean>(false);
    const [form] = Form.useForm();
    const [missingForm] = Form.useForm();
    const { graphqlRequestClient } = useAuth();

    const processName = 'pickAndPack';

    // 10 -> SelectRoundForm
    // 15 -> ScanHU (optional on parameter parameters.HANDLING_UNIT_AUTO_GENERATE_PARENT)
    // 20 -> Scan location
    // 30 -> SelectLocation
    // 40 -> Scan HU
    // 50 -> Scan Article
    // 60 -> Scan features
    // 70 -> Enter quantity
    // 75 -> (for detail only) scan finalHU
    // 80 -> SelectHUModel
    // 90 -> Autovalidate pickAndPack
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // While a submit-triggered validation is in flight, every other button is blocked
    const { blockingButtonKey, lockButtons } = useValidationButtonLock(storedObject);

    console.log(`${processName}`, storedObject);
    //#endregion

    // #region Config parameters
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
            'PICK_AND_PACK_MANUALLY_GENERATE_PARENT'
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
            'PICK_AND_PACK_DEFAULT_QUANTITY'
        );

        const autoValidate1QuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_AND_PACK_AUTOVALIDATE_1_QUANTITY'
        );
        const highlightedQuantity = findValueByScopeAndCode(
            parameters,
            'outbound',
            'IS_QUANTITY_HIGHLIGHTED'
        );
        const checkRemainingQuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PICK_AND_PACK_CHECK_REMAINING_QUANTITY'
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

        const checkRemainingQuantity = checkRemainingQuantityValue === '1';

        return {
            equipmentScanAtPreparation,
            manuallyGenerateParent,
            noAskBeforeLocationChange,
            forceLocationScan,
            forceArticleScan,
            defaultQuantity,
            autoValidate1Quantity,
            highlightQuantity,
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

    const [tmpForceLocation, setTmpforceLocation] = useState<any>(forceLocationScan);
    useEffect(() => {
        if (parameters && parameters.length > 0) {
            setIsLoading(false);
        }
    }, [parameters]);
    //#endregion

    // #region Extracting data & checks
    const proposedRoundAdvisedAddress =
        storedObject?.step10?.data?.proposedRoundAdvisedAddresses[0] || [];
    const isLocationDefined = !!proposedRoundAdvisedAddress.locationId;
    const expectedArticle = getExpectedArticle(proposedRoundAdvisedAddress);
    const expectedArticleId = getExpectedArticleId(proposedRoundAdvisedAddress);

    // The couple the operator is standing on, i.e. what "next" has to leave behind.
    const currentRoundAdvisedAddressCouple = roundAdvisedAddressCouple(
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0]
    );

    // Every location/article couple still to prepare, the skip list deliberately left out of the
    // count: skipping a line only defers it, it never prepares it, so a skipped line is still to
    // prepare and has to be reachable again.
    const roundAdvisedAddressCouplesLeftToPrepare = (() => {
        const roundAdvisedAddresses =
            storedObject['step10']?.data?.round?.roundAdvisedAddresses || [];
        return new Set(
            roundAdvisedAddresses
                .filter((raa: any) => raa.quantity != 0)
                .map((raa: any) => roundAdvisedAddressCouple(raa))
        );
    })();

    // The "next" button used to be rendered on "the round mixes several locationIds", which is
    // the wrong unit: it hid the button when several articles shared one location, and when no
    // location was known at all. It is now offered as long as one couple other than the one on
    // screen is left to prepare - with or without an advised location - because at the end of the
    // list "next" wraps back onto the first couple left instead of stopping, which is what spares
    // the operator leaving the module and coming back to finish the lines he skipped.
    // A round with nothing left to prepare gets no button: that is the end of the process, and
    // closing the round stays the backend's call (isRoundClosed, read by endOfProcessHandling).
    const canGoToNextRoundAdvisedAddress =
        roundAdvisedAddressCouplesLeftToPrepare.size >
        (roundAdvisedAddressCouplesLeftToPrepare.has(currentRoundAdvisedAddressCouple) ? 1 : 0);

    // function to add next location display in italics
    const addNextLocationDisplay = (currentLocationName: string) => {
        const allAddresses = storedObject['step10']?.data?.round?.roundAdvisedAddresses || [];
        const currentProposedAddresses =
            storedObject['step10']?.data?.proposedRoundAdvisedAddresses || [];

        // Only addresses still to be picked (and not currently proposed) can be shown as next
        const proposedIds = currentProposedAddresses.map((addr: any) => addr.id);
        const remainingAddresses = allAddresses.filter(
            (addr: any) => addr.quantity != 0 && !proposedIds.includes(addr.id)
        );

        //Find next location among remaining ones (walking order, with wrap-around)
        let currentIndex = -1;
        if (currentProposedAddresses.length > 0) {
            const firstProposedId = currentProposedAddresses[0].id;
            currentIndex = allAddresses.findIndex((addr: any) => addr.id === firstProposedId);
        }

        const nextAddress =
            remainingAddresses.find((addr: any) => allAddresses.indexOf(addr) > currentIndex) ||
            remainingAddresses[0];
        const nextLocationFull = nextAddress?.location?.name || '';

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
    // #endregion

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

    // Supplier article code: the scanned article first, the expected one otherwise
    const scannedArticleForSupplier = storedObject['step50']?.data?.article;
    const supplierArticleCode =
        scannedArticleForSupplier?.genericArticleComment ?? expectedArticle?.genericArticleComment;

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
        availableQuantity = handling_unit_contents?.quantity;
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
                label: t('common:handling-unit-parent_abbr'),
                value: storedObject['step15']?.data?.handlingUnit,
                visible: !!storedObject['step15']?.data?.handlingUnit
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
                value: supplierArticleCode,
                visible: !!supplierArticleCode
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
        const shouldBePalletized =
            proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]
                ?.handlingUnitOutbound?.carrierShippingMode?.toBePalletized;
        const forcePickingCheck = storedObject['step10']?.data?.round?.equipment?.forcePickingCheck;

        if (storedObject['step10']?.data) {
            if (!shouldBePalletized && !forcePickingCheck) {
                setToBePalletizedForBackEnd(false);
                setToBePalletizedForHUModel(false);
            } else if (!shouldBePalletized && forcePickingCheck) {
                setToBePalletizedForHUModel(false);
                setToBePalletizedForBackEnd(true);
            } else {
                setToBePalletizedForBackEnd(true);
                setToBePalletizedForHUModel(true);
            }
        }

        if (storedObject['step10']?.data?.round) {
            const currentShippingPalletId = storedObject['step10']?.data?.round.extraText1;
            const isHuInProgress = currentShippingPalletId ? true : false;
            setIsHuInProgress(isHuInProgress);
        }
        if (storedObject.currentStep >= 80) {
            setTmpforceLocation(forceLocationScan);
        }

        // If isLocationDefined is false after selectRound step, enforce scanLocation
        if (storedObject['step10']?.data && !isLocationDefined) {
            setTmpforceLocation(true);
        }
    }, [storedObject]);
    //#endregion

    //#region global buttons
    const onReset = () => {
        // storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setShowSimilarLocations(false);
        setTmpforceLocation(forceLocationScan);
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        form.resetFields();
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
    const ignoreHUContentIds = storedObject.ignoreHUContentIds || [];

    const [isHuClosureLoading, setIsHuClosureLoading] = useState(false);
    async function closeHUO(currentShippingPalletId: any) {
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
                        // same key as the skip list itself, see roundAdvisedAddressCouple
                        return !newStoredObject.ignoreHUContentIds.includes(
                            roundAdvisedAddressCouple(raa)
                        );
                    })
                    .filter((raa: any) => raa.quantity != 0);
                if (remainingHUContentIds.length === 0) {
                    newStoredObject.ignoreHUContentIds = [];
                    remainingHUContentIds = updatedRound.roundAdvisedAddresses.filter(
                        (raa: any) => raa.quantity != 0
                    );
                }

                const data = {
                    // Rebuilt on the couple, exactly like the skip list above: comparing raw
                    // handlingUnitContentIds folded every line without picking stock onto the
                    // same key, which put lines of different articles on one screen and made
                    // the skip list useless in this branch.
                    proposedRoundAdvisedAddresses: remainingHUContentIds.filter(
                        (raa: any) =>
                            roundAdvisedAddressCouple(raa) ===
                            roundAdvisedAddressCouple(remainingHUContentIds[0])
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

    useEffect(() => {
        if (triggerNextRaa) {
            setTriggerNextRaa(false);
            let newIgnoreHUContentIds = [...ignoreHUContentIds, currentRoundAdvisedAddressCouple];
            let remainingHUContentIds = storedObject[`step10`]?.data?.round.roundAdvisedAddresses
                .filter((raa: any) => {
                    return !newIgnoreHUContentIds.includes(roundAdvisedAddressCouple(raa));
                })
                .filter((raa: any) => raa.quantity != 0);
            if (remainingHUContentIds.length === 0) {
                // End of the list, and lines are still to prepare: emptying the skip list is what
                // puts the skipped ones back in the game, so the walk wraps around onto the first
                // couple left instead of stopping here. Already prepared lines carry a zero
                // quantity and stay out of the cycle.
                newIgnoreHUContentIds = [];
                remainingHUContentIds = storedObject[
                    `step10`
                ]?.data?.round.roundAdvisedAddresses.filter((raa: any) => raa.quantity != 0);
            }
            if (remainingHUContentIds.length === 0) {
                // Nothing left to prepare anywhere: this is the end of the process, not a cycle.
                // Say so and leave the screen as it is - proposing an advised address out of an
                // empty list is what would turn "next" into a loop over nothing. Closing the
                // round remains the backend's call (isRoundClosed, read by endOfProcessHandling),
                // so the exit path is left exactly as it was.
                showError(t('messages:no-round-advised-address-left'));
                return;
            }
            const raaForHUC = remainingHUContentIds.filter(
                (raa: any) =>
                    roundAdvisedAddressCouple(raa) ===
                    roundAdvisedAddressCouple(remainingHUContentIds[0])
            );

            // Apply checkPosition condition to propose one or cumulated article
            const newProposedRoundAdvisedAddresses = storedObject[`step10`]?.data?.round.equipment
                .checkPosition
                ? [raaForHUC[0]]
                : raaForHUC;

            // A "next" lands on another line, so the location step has to be judged on that line
            // alone. tmpForceLocation still carried the verdict of the line left behind - a line
            // without advised location forces the scan - and nothing lowered it again, so the
            // operator kept being asked to scan a location the new line already carries. The
            // FORCE_LOCATION_SCAN parameter stays authoritative: when it is on, the scan is
            // still forced here as it is everywhere else in the flow, and only the "Change
            // location" button reopens it on a line that carries one.
            const isLocationStepNeeded = newProposedRoundAdvisedAddresses[0]?.locationId
                ? forceLocationScan
                : true;
            setTmpforceLocation(isLocationStepNeeded);
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

            // Raising tmpForceLocation is not enough on this path: the location step is not
            // mounted at the article scan, so nobody reads the flag, and steps 20/30/40 still
            // hold the location of the line left behind - the operator would stay on the article
            // scan with a location that is not the one of the line he is now on, and a line
            // without advised location would leave him no screen to pick one from. Truncating the
            // state back to the location step is what brings the scan screen up again; it also
            // drops the stale location instead of carrying it over. Steps 10 and 15 are below the
            // cut, so the round and the parent handling unit are kept.
            //
            // The truncation is only needed when the operator had progressed past step20 (it
            // carries a resolved `.data`): ON_BACK does not stop at the step it is given, it steps
            // out of it onto its own previousStep - fine when step20 is about to be unmounted and
            // remounted anyway (its mount effect re-derives currentStep=20), but when the operator
            // never left the location scan (two consecutive lines without an advised location),
            // step20 is already mounted with no `.data`, nothing remounts it, and this dispatch
            // regressed currentStep below 20 - hiding the step-20-only buttons (Loc., next) on a
            // screen that still is the location scan.
            if (isLocationStepNeeded) {
                if (storedObject['step20']?.data) {
                    dispatch({
                        type: 'ON_BACK',
                        processName,
                        stepToReturn: `step20`
                    });
                }
                // Nothing below this point may run, whether the state had to be truncated or the
                // operator already stands on the location step: prefilling steps 30 and 40 from
                // the new line is exactly what would skip the location scan just asked for.
                return;
            }

            // No location step means no screen will rebuild steps 30 and 40, so they keep the
            // location and the handling unit of the line left behind. The article scan reads its
            // candidate contents from step40, so the article of the line just proposed is absent
            // from that list and ArticleChecks refuses every scan with "unexpected-scanned-item".
            // Prefilling both steps from the proposed line is what pick.tsx already does here.
            const raaToUse = raaForHUC[0];
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
            // The location of the advised address carries no handlingUnits - the round query does
            // not select them - while the location step normally fills step30 from the locations
            // query, which does. QuantityChecks reads the stock of the line from
            // chosenLocation.handlingUnits to decide whether the pick empties the location: left
            // absent, it counts zero stock and asks whether the location is empty on every line
            // "next" lands on. Carrying the handling unit of the line gives that count the
            // quantity actually held there.
            const chosenLocationFromRaa = {
                ...raaToUse?.location,
                id: raaToUse?.locationId,
                handlingUnits: [handlingUnitFromRaa]
            };
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step30`,
                object: {
                    ...storedObject[`step30`],
                    data: {
                        ...storedObject[`step30`]?.data,
                        chosenLocation: chosenLocationFromRaa,
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
    // #endregion

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
                    round: storedObject['step10']?.data?.round
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

                handlePickAndPackProcessResult({
                    result: validateFullBoxResult,
                    t,
                    storedObject,
                    processName,
                    dispatch,
                    setIsAutoValidateLoading,
                    huName: storedObject?.step15?.data?.handlingUnit,
                    huType: storedObject.step15?.data?.handlingUnitType,
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
                confirmLoading={missingModalConfirmLoading}
                width={800}
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
                        <InputNumber min={1} max={maxQuantity} style={{ width: '100%' }} />
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
            visibleOnSteps: [5, 10, 15, 20, 30, 40, 50, 60, 70, 75, 80],
            onClick: () => {
                form.validateFields()
                    .then(() => {
                        lockButtons('submit');
                        form.submit();
                    })
                    .catch(() => {
                        // client-side validation failed: antd shows the field errors, keep buttons active
                    });
            },
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
            permissionsToSeeTheButton: canGoToNextRoundAdvisedAddress,
            onClick: () => {
                setTriggerNextRaa(true);
            },
            position: 'bottom'
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [10, 15, 20, 30, 40, 50, 60, 70, 75, 80],
            permissionsToSeeTheButton:
                equipmentScanAtPreparation && storedObject['step10'] ? true : false || true,
            onClick: () => {
                if (showSimilarLocations) {
                    setShowSimilarLocations(false);
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

    //#region RETURN
    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:pickAndPack')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > (equipmentScanAtPreparation ? 5 : 10) ? (
                            <NavButton
                                icon={<UndoOutlined />}
                                onClick={onReset}
                                disabled={!!blockingButtonKey || isAutoValidateLoading}
                            ></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton
                            icon={<ArrowLeftOutlined />}
                            onClick={previousPage}
                            disabled={!!blockingButtonKey || isAutoValidateLoading}
                        ></NavButton>
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
                    blockingButtonKey={blockingButtonKey}
                >
                    {showSimilarLocations && storedObject['step10']?.data ? (
                        <SimilarLocationsV2
                            articleId={expectedArticleId}
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
                            processName={processName}
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
                    storedObject['step10']?.data?.round?.handlingUnitOutbounds?.filter(
                        (huo: any) => huo.status === 500
                    ).length === 0 &&
                    !storedObject['step15']?.data &&
                    manuallyGenerateParent ? (
                        <ScanHandlingUnit
                            processName={processName}
                            stepNumber={15}
                            label={t('common:handling-unit')}
                            checkComponent={(data: any) => (
                                <HandlingUnitChecksWithoutChecks dataToCheck={data} />
                            )}
                            formToUse={form}
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
                            dontAskBeforeLocationChange={dontAskBeforeLocationChange}
                            forceLocation={{ tmpForceLocation, setTmpforceLocation }}
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
                            scanCarrierBox={false}
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
                                name: `${
                                    expectedArticle?.name ??
                                    proposedRoundAdvisedAddress?.handlingUnitContent?.article?.name
                                }`
                            })}
                            forceArticleScan={forceArticleScan}
                            contents={
                                storedObject['step40']?.data?.handlingUnit?.handlingUnitContents
                            }
                            checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                            formToUse={form}
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
                            checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                            formToUse={form}
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
                                )?.quantity
                            )}
                            stockMaxQuantity={Math.min(
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
                            checkRemainingQuantity={checkRemainingQuantity}
                            checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                            formToUse={form}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {storedObject['step70']?.data && !storedObject['step75']?.data ? (
                        <ScanFinalHandlingUnitOutbound
                            processName={processName}
                            stepNumber={75}
                            label={t('common:handling-unit-final')}
                            checkComponent={(data: any) => (
                                <HandlingUnitOutboundFinalChecks dataToCheck={data} />
                            )}
                            defaultValue={
                                storedObject['step10']?.data?.pickAndPackType === 'fullBox'
                                    ? 'fullBox'
                                    : undefined
                            }
                            formToUse={form}
                        ></ScanFinalHandlingUnitOutbound>
                    ) : (
                        <></>
                    )}
                    {storedObject['step75']?.data && !storedObject['step80']?.data ? (
                        <SelectHuModelForm
                            processName={processName}
                            stepNumber={80}
                            defaultValue={
                                isHuInProgress
                                    ? 'huModelExist'
                                    : !toBePalletizedForHUModel
                                      ? 'defaultModel'
                                      : undefined
                            }
                            formToUse={form}
                        ></SelectHuModelForm>
                    ) : (
                        <></>
                    )}
                    {storedObject['step80']?.data || isAutoValidateLoading ? (
                        <AutoValidatePickAndPackForm
                            processName={processName}
                            stepNumber={90}
                            headerContent={{ setHeaderContent }}
                            toBePalletized={toBePalletizedForBackEnd}
                            autoValidateLoading={{
                                isAutoValidateLoading,
                                setIsAutoValidateLoading
                            }}
                        ></AutoValidatePickAndPackForm>
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
PickAndPack.layout = MainLayout;

export default PickAndPack;
