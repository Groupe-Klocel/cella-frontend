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
    ButtonManagementType,
    HeaderManagementType,
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    getModesFromPermissions,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { ModeEnum } from 'generated/graphql';
import { Form, Modal, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { SelectPrinter } from 'modules/Preparation/Pack/Forms/SelectPrinter_Reducer';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { ScanRoundOrHuOrPosition } from 'modules/Preparation/Pack/PagesContainer/ScanRoundOrHuOrPosition';
import { RoundOrHuOrPositionCheck } from 'modules/Preparation/Pack/ChecksAndRecords/RoundOrHuOrPositionCheck';
import { ScanPosition } from 'modules/Preparation/Pack/PagesContainer/ScanPosition';
import { PositionChecks } from 'modules/Preparation/Pack/ChecksAndRecords/PositionChecks';
import { ScanArticleEAN } from 'modules/Preparation/Pack/PagesContainer/ScanArticleEAN';
import { ArticleChecks } from 'modules/Preparation/Pack/ChecksAndRecords/ArticleChecks';
import { EnterQuantity_reducer } from '@CommonRadio';
import { QuantityChecks } from 'modules/Preparation/Pack/ChecksAndRecords/QuantityChecks';
import { ReviewHuModelWeightForm } from 'modules/Preparation/Pack/Forms/ReviewHuModelWeightForm';
import { ReviewHuModelWeightChecks } from 'modules/Preparation/Pack/ChecksAndRecords/ReviewHuModelWeightChecks';
import { AutoValidatePackForm } from 'modules/Preparation/Pack/Forms/AutoValidatePack';
import { AutoDeclareMissingQuantityForm } from 'modules/Preparation/Pack/Forms/AutoDeclareMissingQuantity';
import { AutoCloseBoxForm } from 'modules/Preparation/Pack/Forms/AutoCloseBox';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';

type PageComponent = FC & { layout: typeof MainLayout };

const Pack: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const { graphqlRequestClient, user } = useAuth();
    const router = useRouter();
    const { parameters, configs, permissions } = useAppState();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [finishPositionLoading, setFinishPositionLoading] = useState<boolean>(false);
    const [closeBox, setCloseBox] = useState<boolean>(false);
    const [isToControl, setIsToControl] = useState<boolean | null>(null);
    const [triggerEnforcedControl, setTriggerEnforcedControl] = useState<boolean>(false);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const findValueByScopeAndCode = (items: any[], scope: string, code: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.code.toLowerCase() === code.toLowerCase()
            )?.value;
        };

        const equipmentHuType = findCodeByScope(parameters, 'handling_unit_type', 'EQUIPMENT');

        const packingWithControlInprogressHuoStatus = findCodeByScope(
            configs,
            'handling_unit_outbound_status',
            'Packing with control in progress'
        );

        const waitingLabelHuoStatus = findCodeByScope(
            configs,
            'handling_unit_outbound_status',
            'Waiting Label'
        );

        const defaultQuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PACK_DEFAULT_QUANTITY'
        );

        const autoValidate1QuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PACK_AUTOVALIDATE_1_QUANTITY'
        );
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

        // Location (without HU management) where the missing stock is booked when finishing a position.
        // Customer-configurable through the 'outbound' parameter flagged 'DEFAULT_MISSING_LOCATION'
        // (same convention as 'DEFAULT_ROUND_LOCATION'); defaults to 'MANQUANT PACK'.
        const missingLocationName = findValueByScopeAndCode(
            parameters,
            'outbound',
            'DEFAULT_MISSING_LOCATION'
        );

        return {
            defaultQuantity,
            autoValidate1Quantity,
            equipmentHuType,
            packingWithControlInprogressHuoStatus,
            waitingLabelHuoStatus,
            missingLocationName
        };
    }, [parameters, configs]);

    const processName = 'pack';

    const quantityDefaultValue = configsParamsCodes.defaultQuantity;
    const autoValidate1Quantity = configsParamsCodes.autoValidate1Quantity;
    const equipmentHuType = parseInt(configsParamsCodes.equipmentHuType);
    const packingWithControlInprogressHuoStatus = parseInt(
        configsParamsCodes.packingWithControlInprogressHuoStatus
    );
    const waitingLabelHuoStatus = parseInt(configsParamsCodes.waitingLabelHuoStatus);

    // 10 -> scan printer
    // 20 -> scan round/equipment/position
    // 30 -> scan position (optional if not scanned in previous step and scanPosition true in equipment)
    // 40 -> scan article (optional from rules named "force_checking_in_pack")
    // 50 -> scan quantity (optional from rules named "force_checking_in_pack")
    // 60 -> ReviewHuModelWeightForm
    // 70 -> autovalidate (RF_pack_validate), auto declare missing when the finish position/box
    //       button was pressed (declare_missing_quantity_post_picking), or auto close
    //       (RF_pack_close_box) when resuming the waiting-label boxes of the round
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [form] = Form.useForm();

    console.log(`${processName}`, storedObject);
    //#endregion

    //#region extract data & checks
    const round = storedObject?.step20?.data?.round;
    const equipmentHu = storedObject?.step20?.data?.equipmentHu;
    const step20Position = storedObject?.step20?.data?.position;
    const step30Position = storedObject?.step30?.data?.position;
    const destinationHuos = round?.handlingUnitOutbounds?.filter(
        (item: any) => item.handlingUnit?.type !== equipmentHuType
    );
    //box currently in progress of packing if any
    const inProgressHuo = storedObject?.step20?.data?.inProgressHuo;

    // total quantity remaining to prepare on a box (sum of its non-prepared HUCO remainders)
    const getHuoRemainingQuantity = (huo: any) =>
        huo?.handlingUnitContentOutbounds?.reduce(
            (total: number, huco: any) =>
                total +
                Math.max(huco.quantityToBePicked - huco.pickedQuantity - huco.missingQuantity, 0),
            0
        ) ?? 0;

    // Waiting-label resume mode: boxes already packed whose label is still to be printed (HUO
    // status 'Waiting Label'). They can only be resumed once the round holds nothing left to
    // pack: while any box still has quantities to prepare or is being packed, the flow stays the
    // normal one and those boxes must be finished first. In this mode the article/quantity steps
    // are skipped (the box is complete by design) and the closure is run by AutoCloseBoxForm
    // instead of AutoValidatePackForm.
    const waitingLabelHuos = destinationHuos?.filter(
        (huo: any) => huo.status === waitingLabelHuoStatus
    );
    const hasHuosToPack = destinationHuos?.some(
        (huo: any) => huo.status !== waitingLabelHuoStatus && getHuoRemainingQuantity(huo) > 0
    );
    const isWaitingLabelHandling = Boolean(
        round && !inProgressHuo && !hasHuosToPack && waitingLabelHuos?.length > 0
    );

    // Check if box closure is allowed
    const isBoxClosureAllowed = useMemo(() => {
        return (
            inProgressHuo &&
            !inProgressHuo.handlingUnitContentOutbounds?.every(
                (huco: any) => huco.pickedQuantity === 0
            )
        );
    }, [inProgressHuo]);

    //selected box (in progress, new one, or waiting-label box being resumed)
    const currentHuo =
        isWaitingLabelHandling || round?.equipment?.checkPosition
            ? storedObject?.step30?.data?.currentHuos?.[0]
            : storedObject?.step40?.data?.currentHuo;
    const currentHuco = storedObject?.step40?.data?.currentHuco;

    const hasOtherIncompleteHucos = storedObject[
        round?.equipment?.checkPosition ? 'step30' : 'step40'
    ]?.data
        ? currentHuo?.handlingUnitContentOutbounds?.filter(
              (huco: any) =>
                  huco.id !== currentHuco?.id &&
                  huco.missingQuantity + huco.pickedQuantity < huco.quantityToBePicked
          ).length > 0
        : true;
    const isCurrentHucoIncomplete = currentHuco
        ? currentHuco.missingQuantity +
              currentHuco.pickedQuantity +
              (storedObject['step50']?.data?.movingQuantity || 0) <
          currentHuco.quantityToBePicked
        : true;
    const proposedHuos = storedObject['step30']?.data?.currentHuos;

    // "Finish position" pressed without position scan nor in-progress box: the whole round is
    // declared missing by the auto-declare step (70) directly, without packaging review.
    const isWholeRoundFinish = Boolean(
        storedObject['step40']?.data?.isFinishPosition &&
            !round?.equipment?.checkPosition &&
            !inProgressHuo
    );

    // this to check if we need to display step 60 (ReviewHuModelWeightForm) or if we can directly go to autovalidate (step 70) after quantity entering (step 50)
    const isBoxReviewNeeded =
        (storedObject['step40']?.data?.isFinishPosition ||
            storedObject['step40']?.data?.isBoxForcedClosed ||
            (!hasOtherIncompleteHucos && !isCurrentHucoIncomplete) ||
            (!isToControl && isToControl !== null && storedObject['step30']?.data) ||
            (isToControl &&
                typeof storedObject['step50']?.data !== 'object' &&
                storedObject['step50']?.data)) &&
        !storedObject['step60']?.data &&
        !isWholeRoundFinish;
    //#endregion

    //#region RadioInfosHeader settings
    const inProgressHuco = inProgressHuo?.handlingUnitContentOutbounds?.[0];
    const movingQuantity = storedObject['step50']?.data?.movingQuantity;

    // Declarative header configuration (mirrors buttonManagement). Order = display order.
    const headerManagement: HeaderManagementType = [
        {
            label: t('common:printer'),
            value: storedObject['step10']?.data?.printers?.value,
            visible: !!storedObject['step10']?.data?.printers
        },
        { label: t('common:round'), value: round?.name, visible: !!round },
        { label: t('common:equipment'), value: equipmentHu?.name, visible: !!equipmentHu },
        {
            // waiting-label resume mode: number of boxes still waiting for their label
            label: t('common:waiting-label-boxes'),
            value: waitingLabelHuos?.length,
            visible: isWaitingLabelHandling,
            highlight: true
        },
        {
            // waiting-label resume mode: box being closed
            label: t('common:huo-in-progress'),
            value: currentHuo?.name,
            visible: !!(isWaitingLabelHandling && currentHuo)
        },
        {
            label: t('common:pack_position'),
            value: step30Position,
            visible: !!(step30Position && round?.equipment?.checkPosition)
        },
        {
            label: t('common:huo-in-progress'),
            value: inProgressHuo?.name,
            visible: !!(inProgressHuo && !round?.equipment?.checkPosition)
        },
        {
            label: t('common:expected-article_abbr'),
            value: inProgressHuco?.article?.name,
            visible: !!(inProgressHuo && !round?.equipment?.checkPosition)
        },
        {
            label: t('common:expected-quantity_abbr'),
            value: inProgressHuco
                ? inProgressHuco.quantityToBePicked -
                  inProgressHuco.pickedQuantity -
                  inProgressHuco.missingQuantity
                : undefined,
            visible: !!(inProgressHuo && !round?.equipment?.checkPosition)
        },
        {
            // remaining quantity to prepare on the proposed box (irrelevant on a resumed
            // waiting-label box, complete by design)
            label: t('common:quantity'),
            value: getHuoRemainingQuantity(storedObject['step30']?.data?.currentHuos?.[0]),
            visible:
                storedObject['step30']?.data?.currentHuos?.length > 0 &&
                !isToControl &&
                isToControl !== null &&
                !isWaitingLabelHandling,
            highlight: true
        },
        {
            label: t('common:article_abbr'),
            value: storedObject['step40']?.data?.currentHuco?.article?.name,
            visible: !!storedObject['step40']?.data?.currentHuco
        },
        {
            label: t('common:supplier-article-code'),
            value: (storedObject['step40']?.data?.currentHuco?.article ?? inProgressHuco?.article)
                ?.genericArticleComment,
            visible: !!(
                storedObject['step40']?.data?.currentHuco ||
                (inProgressHuo && storedObject['step40']?.data && !round?.equipment?.checkPosition)
            )
        },
        {
            // quantity being packed vs remaining on the current HUCO
            label: t('common:quantity'),
            value:
                movingQuantity && currentHuco
                    ? movingQuantity +
                      '/' +
                      (currentHuco.quantityToBePicked -
                          currentHuco.pickedQuantity -
                          currentHuco.missingQuantity)
                    : undefined,
            visible: !!(movingQuantity && currentHuco)
        }
    ];

    // Build the displayed object from the declarative configuration
    const headerDisplay = buildHeaderDisplay(headerManagement);
    //#endregion

    //#region control while packing
    // retrieve rule to apply
    useEffect(() => {
        const fetchRuleResult = async (ruleInputs: any) => {
            const ruleVariables = { context: ruleInputs };
            const ruleQuery = gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "CONTROL_WHILE_PACKING", context: $context)
                }
            `;
            const ruleResult = await graphqlRequestClient.request(ruleQuery, ruleVariables);
            return ruleResult.executeRule['% control'].value;
        };
        if (isWaitingLabelHandling) {
            // Resumed boxes are already packed (and controlled when required): no control, the
            // article/quantity steps are skipped and the flow goes straight to the review step.
            setIsToControl(false);
        } else if (inProgressHuo) {
            setIsToControl(true);
        } else if (round) {
            if (round.equipment?.checkPosition) {
                if (currentHuo?.handlingUnitContentOutbounds) {
                    const promises = currentHuo.handlingUnitContentOutbounds.map(
                        async (huco: any) => {
                            const ruleInputs = {
                                Equipment: round.equipment.name,
                                User: user.username,
                                'Stock owner': currentHuo?.stockOwner?.name,
                                Packaging: currentHuo?.handlingUnitModel?.name,
                                'Client code delivered':
                                    currentHuo?.delivery?.deliveryAddresses?.[0]?.entityName ??
                                    currentHuo?.delivery?.deliveryAddresses?.[0]?.entityCode,
                                'Client country delivered':
                                    currentHuo?.delivery?.deliveryAddresses?.[0]?.entityCountry,
                                'Article code': huco.article?.name
                            };
                            try {
                                const ruleResult = await fetchRuleResult(ruleInputs);
                                return parseFloat(ruleResult) || 0;
                            } catch (error) {
                                console.error(
                                    'Error fetching rule result for article:',
                                    huco.article?.name,
                                    error
                                );
                                return 0;
                            }
                        }
                    );

                    Promise.all(promises).then((results) => {
                        const maxValue = Math.max(...results);
                        const randomInt = Math.floor(Math.random() * 100) + 1;
                        // const randomInt = 60; // For testing purposes, set a fixed value
                        const controlResult = randomInt <= maxValue;

                        setIsToControl(controlResult);
                    });
                }
            } else {
                setIsToControl(true);
            }
        }
    }, [round, step30Position]);

    //if control needed : add currentHUO status update to controlIncourse in the following useEffect
    useEffect(() => {
        if (isToControl && currentHuo) {
            if (currentHuo.status <= packingWithControlInprogressHuoStatus) {
                const updateHandlingUnitOutboundStatus = async () => {
                    const mutation = gql`
                        mutation updateHandlingUnitOutbound(
                            $id: String!
                            $input: UpdateHandlingUnitOutboundInput!
                        ) {
                            updateHandlingUnitOutbound(id: $id, input: $input) {
                                id
                                status
                                statusText
                            }
                        }
                    `;
                    const variables = {
                        id: currentHuo.id,
                        input: {
                            status: packingWithControlInprogressHuoStatus
                        }
                    };

                    try {
                        const result = await graphqlRequestClient.request(mutation, variables);
                        console.log(
                            'HUO status updated to packing with control in progress:',
                            result
                        );
                    } catch (error) {
                        console.error('Failed to update HUO status:', error);
                    }
                };

                updateHandlingUnitOutboundStatus();
            }
        }
    }, [isToControl, currentHuo]);
    //#endregion

    //#region global buttons
    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setIsToControl(null);
        form.resetFields();
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        form.resetFields();
        setIsToControl(null);
        router.back();
    };

    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${storedObject.currentStep}`].previousStep}`
        });
        form.resetFields();
    };
    //#endregion

    //#region specific functions
    useEffect(() => {
        if (closeBox) {
            // Check if all HUCOs of proposedHuos[0] are complete
            const firstHuo = proposedHuos[0];
            const incompleteHucos = firstHuo?.handlingUnitContentOutbounds?.filter(
                (huco: any) =>
                    huco.quantityToBePicked !== huco.missingQuantity + huco.pickedQuantity
            );

            if (incompleteHucos && incompleteHucos.length > 0) {
                Modal.confirm({
                    title: t('messages:confirmation'),
                    content: t('messages:confirm-incomplete-box-closure'),
                    onOk: () => {
                        // Continue with dispatches
                        const step40Data: { [label: string]: any } = {};
                        step40Data['currentHuo'] = proposedHuos[0];
                        step40Data['isBoxForcedClosed'] = true;
                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: 'step40',
                            object: {
                                ...storedObject['step40'],
                                data: step40Data
                            }
                        });

                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: 'step50',
                            object: {
                                ...storedObject['step50'],
                                data: 'allQuantites'
                            }
                        });
                        setCloseBox(false);
                    },
                    onCancel: () => {
                        // Return to current step
                        setCloseBox(false);
                    }
                });
                return;
            }

            const step40Data: { [label: string]: any } = {};
            step40Data['currentHuo'] = proposedHuos[0];
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: 'step40',
                object: {
                    ...storedObject['step40'],
                    data: step40Data
                }
            });

            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: 'step50',
                object: {
                    ...storedObject['step50'],
                    data: 'allQuantites'
                }
            });
            setCloseBox(false);
        }
    }, [closeBox, inProgressHuo]);

    useEffect(() => {
        if (triggerEnforcedControl) {
            setIsToControl(true);
            //N.B. : Need initializing step 40 to have the relevant previousStep before going back
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step40`,
                object: {
                    previousStep: storedObject[`step${storedObject.currentStep}`].previousStep
                },
                customFields: undefined
            });
            dispatch({
                type: 'ON_BACK',
                processName: processName,
                stepToReturn: `step40`
            });
            setTriggerEnforcedControl(false);
        }
    }, [triggerEnforcedControl]);

    // "Finish position"/"Finish box": declare as missing the remaining quantity of every
    // non-prepared HUCO, through the dedicated auto-declare step (70,
    // AutoDeclareMissingQuantityForm) - the finish-path counterpart of AutoValidatePackForm.
    // With position scan the missing quantities are declared on the box at the scanned position;
    // without position scan on the in-progress box if any ("finish box" mode), otherwise on every
    // unpacked box of the round. The single-box variants first go through the packaging
    // selection/weight step (60), whose values the function uses to close the box; the
    // whole-round variant (nothing packed, so no packaging to select) triggers the auto-declare
    // step right away. The step then drives the navigation: back to the position scan while
    // other positions of the round still hold quantities to prepare, to the round scan otherwise.
    const positionHuo = storedObject?.step30?.data?.currentHuos?.[0];
    const isFinishBoxMode = !round?.equipment?.checkPosition && Boolean(inProgressHuo);
    const finishTargetsSingleBox = Boolean(round?.equipment?.checkPosition) || isFinishBoxMode;
    const finishPositionHuos = (
        round?.equipment?.checkPosition
            ? positionHuo
                ? [positionHuo]
                : []
            : isFinishBoxMode
              ? [inProgressHuo]
              : (destinationHuos ?? [])
    ).filter((huo: any) => getHuoRemainingQuantity(huo) > 0);
    const positionRemainingQuantity = finishPositionHuos.reduce(
        (total: number, huo: any) => total + getHuoRemainingQuantity(huo),
        0
    );

    const onFinishPosition = () => {
        if (finishPositionHuos.length === 0) {
            return;
        }
        Modal.confirm({
            title: t('messages:confirmation'),
            content: t(
                isFinishBoxMode
                    ? 'messages:confirm-finish-box-missing'
                    : 'messages:confirm-finish-position-missing',
                {
                    quantity: positionRemainingQuantity
                }
            ),
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel'),
            onOk: () => {
                // Arm the finish path: flag step 40 and mark the quantity step as passed. The
                // single-box variants carry the targeted box and go through the packaging/weight
                // review step (60) first; the whole-round variant triggers the auto-declare step
                // (70) directly. Nothing is sent to the backend at this stage: the declaration is
                // run by AutoDeclareMissingQuantityForm.
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: 'step40',
                    object: {
                        ...storedObject['step40'],
                        data: finishTargetsSingleBox
                            ? { currentHuo: finishPositionHuos[0], isFinishPosition: true }
                            : { isFinishPosition: true }
                    }
                });
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: 'step50',
                    object: {
                        ...storedObject['step50'],
                        data: 'allQuantites'
                    }
                });
                form.resetFields();
            }
        });
    };
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonManagementType = [
        {
            key: 'submit',
            label: t('actions:submit'),
            visibleOnSteps: [10, 20, 30, 40, 50, 60, 70],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'close-box',
            label: t('common:close-box'),
            visibleOnSteps: [40],
            permissionsToSeeTheButton: isBoxClosureAllowed ? true : false,
            onClick: () => {
                setCloseBox(true);
            },
            position: 'bottom'
        },
        {
            key: 'finish-position',
            label: t(isFinishBoxMode ? 'actions:finish-box' : 'actions:finish-position'),
            visibleOnSteps: [40],
            permissionsToSeeTheButton: Boolean(
                getModesFromPermissions(permissions, 'mobile_button_missing-handling').includes(
                    ModeEnum.Read
                ) && positionRemainingQuantity > 0
            ),
            onClick: () => {
                onFinishPosition();
            },
            position: 'top',
            style: {
                background: 'radial-gradient(circle, #ff8a1ce8 5%, #f4a261 100%)'
            }
        },
        {
            key: 'enforce-control',
            label: t('actions:enforce-control'),
            visibleOnSteps: [60],
            // no control enforcement on a resumed waiting-label box: it is already packed
            permissionsToSeeTheButton:
                !isToControl && isToControl !== null && !isWaitingLabelHandling ? true : false,
            onClick: () => {
                setTriggerEnforcedControl(true);
            },
            position: 'bottom'
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [20, 30, 40, 50, 60, 70],
            permissionsToSeeTheButton: true,
            onClick: () => {
                onBack();
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
                title={t('common:round-packing')}
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
            {isLoading || finishPositionLoading ? (
                <UpperMobileSpinner></UpperMobileSpinner>
            ) : (
                <RadioButtonWrapper
                    buttonManagement={orderedButtonManagement}
                    currentStep={storedObject.currentStep}
                >
                    {!storedObject['step10']?.data ? (
                        <SelectPrinter
                            processName={processName}
                            ruleName="pack"
                            stepNumber={10}
                            formToUse={form}
                        ></SelectPrinter>
                    ) : (
                        <></>
                    )}
                    {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                        <ScanRoundOrHuOrPosition
                            processName={processName}
                            stepNumber={20}
                            label={t('d:round-or-equipment-or-position')}
                            checkComponent={(data: any) => (
                                <RoundOrHuOrPositionCheck dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ScanRoundOrHuOrPosition>
                    ) : (
                        <></>
                    )}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <ScanPosition
                            processName={processName}
                            stepNumber={30}
                            label={t('common:pack_position')}
                            checkComponent={(data: any) => (
                                <PositionChecks
                                    dataToCheck={data}
                                    handlingUnitOutboundInfos={
                                        isWaitingLabelHandling ? waitingLabelHuos : destinationHuos
                                    }
                                    allowPackedBoxes={isWaitingLabelHandling}
                                />
                            )}
                            enforcedValue={step20Position ?? undefined}
                            defaultValue={
                                isWaitingLabelHandling
                                    ? !round?.equipment?.checkPosition
                                        ? [waitingLabelHuos[0]]
                                        : undefined
                                    : inProgressHuo
                                      ? [inProgressHuo]
                                      : !round?.equipment?.checkPosition
                                        ? destinationHuos
                                        : undefined
                            }
                            formToUse={form}
                        ></ScanPosition>
                    ) : (
                        <></>
                    )}
                    {isToControl &&
                    isToControl !== null &&
                    storedObject['step30']?.data &&
                    !storedObject['step40']?.data ? (
                        <ScanArticleEAN
                            processName={processName}
                            stepNumber={40}
                            label={t('common:article_abbr')}
                            proposedHuos={storedObject['step30']?.data?.currentHuos}
                            formToUse={form}
                            checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                        ></ScanArticleEAN>
                    ) : (
                        <></>
                    )}
                    {isToControl &&
                    isToControl !== null &&
                    storedObject['step40']?.data &&
                    !storedObject['step50']?.data ? (
                        <EnterQuantity_reducer
                            processName={processName}
                            stepNumber={50}
                            label={t('common:quantity-var', {
                                number: `${
                                    storedObject['step40']?.data?.currentHuco
                                        ? storedObject['step40'].data.currentHuco
                                              .quantityToBePicked -
                                          storedObject['step40'].data.currentHuco.pickedQuantity -
                                          storedObject['step40'].data.currentHuco.missingQuantity
                                        : 0
                                }`
                            })}
                            initialValueType={quantityDefaultValue}
                            requiredMaxQuantity={
                                storedObject['step40']?.data?.currentHuco
                                    ? storedObject['step40'].data.currentHuco.quantityToBePicked -
                                      storedObject['step40'].data.currentHuco.pickedQuantity -
                                      storedObject['step40'].data.currentHuco.missingQuantity
                                    : 0
                            }
                            autoValidate1Quantity={autoValidate1Quantity}
                            formToUse={form}
                            checkComponent={(data: any) => (
                                <QuantityChecks dataToCheck={{ ...data }} />
                            )}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {isBoxReviewNeeded ? (
                        <ReviewHuModelWeightForm
                            processName={processName}
                            stepNumber={60}
                            currentHuo={currentHuo}
                            checkComponent={(data: any) => (
                                <ReviewHuModelWeightChecks
                                    dataToCheck={data}
                                    isToControl={{ isToControl, setIsToControl }}
                                />
                            )}
                            formToUse={form}
                        ></ReviewHuModelWeightForm>
                    ) : (
                        <></>
                    )}
                    {/* Never auto-validate in the finish position/box path: there the box is
                    closed by declare_missing_quantity_post_picking itself (auto-declare step
                    below), not by RF_pack_validate. Same in the waiting-label resume path,
                    where the box is closed by the box-closing function (auto-close step
                    below). */}
                    {((!isBoxReviewNeeded && storedObject['step50']?.data) ||
                        storedObject['step60']?.data) &&
                    !storedObject['step70']?.data &&
                    !storedObject['step40']?.data?.isFinishPosition &&
                    !isWaitingLabelHandling ? (
                        <AutoValidatePackForm
                            processName={processName}
                            stepNumber={70}
                            toBePalletized={false}
                            autoValidateLoading={{
                                isAutoValidateLoading: isLoading,
                                setIsAutoValidateLoading: setIsLoading
                            }}
                            controlManagement={{ isToControl, setIsToControl }}
                        ></AutoValidatePackForm>
                    ) : (
                        <></>
                    )}
                    {/* Waiting-label resume path: once the packaging/weight review is validated,
                    the box is closed (label printing, round status update, equipment HU deletion
                    when emptied) by the backend box-closing function instead of
                    RF_pack_validate. */}
                    {isWaitingLabelHandling &&
                    storedObject['step60']?.data &&
                    !storedObject['step70']?.data ? (
                        <AutoCloseBoxForm
                            processName={processName}
                            stepNumber={70}
                            closeLoading={{
                                isCloseLoading: isLoading,
                                setIsCloseLoading: setIsLoading
                            }}
                            controlManagement={{ isToControl, setIsToControl }}
                        ></AutoCloseBoxForm>
                    ) : (
                        <></>
                    )}
                    {/* Finish position/box path: once the packaging/weight review is validated
                    (or directly for the whole-round variant), the auto-declare step runs
                    declare_missing_quantity_post_picking and drives the next navigation. */}
                    {storedObject['step40']?.data?.isFinishPosition &&
                    (storedObject['step60']?.data || isWholeRoundFinish) &&
                    !storedObject['step70']?.data ? (
                        <AutoDeclareMissingQuantityForm
                            processName={processName}
                            stepNumber={70}
                            declareLoading={{
                                isDeclareLoading: finishPositionLoading,
                                setIsDeclareLoading: setFinishPositionLoading
                            }}
                            controlManagement={{ isToControl, setIsToControl }}
                        ></AutoDeclareMissingQuantityForm>
                    ) : (
                        <></>
                    )}
                </RadioButtonWrapper>
            )}
        </PageContentWrapper>
    );
};
//#endregion

Pack.layout = MainLayout;

export default Pack;
