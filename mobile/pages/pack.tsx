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
    applyRfActionButtonsConfig,
    getMoreInfos,
    useTranslationWithFallback as useTranslation
} from '@helpers';
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
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';

type PageComponent = FC & { layout: typeof MainLayout };

const Pack: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const { graphqlRequestClient, user } = useAuth();
    const router = useRouter();
    const { parameters, configs } = useAppState();
    const [isLoading, setIsLoading] = useState<boolean>(false);
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
        return {
            defaultQuantity,
            autoValidate1Quantity,
            equipmentHuType,
            packingWithControlInprogressHuoStatus
        };
    }, [parameters, configs]);

    const processName = 'pack';

    const quantityDefaultValue = configsParamsCodes.defaultQuantity;
    const autoValidate1Quantity = configsParamsCodes.autoValidate1Quantity;
    const equipmentHuType = parseInt(configsParamsCodes.equipmentHuType);
    const packingWithControlInprogressHuoStatus = parseInt(
        configsParamsCodes.packingWithControlInprogressHuoStatus
    );

    // 10 -> scan printer
    // 20 -> scan round/equipment/position
    // 30 -> scan position (optional if not scanned in previous step and scanPosition true in equipment)
    // 40 -> scan article (optional from rules named "force_checking_in_pack")
    // 50 -> scan quantity (optional from rules named "force_checking_in_pack")
    // 60 -> ReviewHuModelWeightForm
    // 70 -> autovalidate
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

    // Check if box closure is allowed
    const isBoxClosureAllowed = useMemo(() => {
        return (
            inProgressHuo &&
            !inProgressHuo.handlingUnitContentOutbounds?.every(
                (huco: any) => huco.pickedQuantity === 0
            )
        );
    }, [inProgressHuo]);

    //selected box (in progress or new one)
    const currentHuo = round?.equipment?.checkPosition
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

    // this to check if we need to display step 60 (ReviewHuModelWeightForm) or if we can directly go to autovalidate (step 70) after quantity entering (step 50)
    const isBoxReviewNeeded =
        (storedObject['step40']?.data?.isBoxForcedClosed ||
            (!hasOtherIncompleteHucos && !isCurrentHucoIncomplete) ||
            (!isToControl && isToControl !== null && storedObject['step30']?.data) ||
            (isToControl &&
                typeof storedObject['step50']?.data !== 'object' &&
                storedObject['step50']?.data)) &&
        !storedObject['step60']?.data;
    //#endregion

    //#region RadioInfosHeader settings
    let headerDisplay: { [k: string]: any } = {};

    if (storedObject['step10']?.data?.printers) {
        headerDisplay[t('common:printer')] = storedObject['step10']?.data?.printers.value;
    }

    if (round) {
        headerDisplay[t('common:round')] = round.name;
    }
    if (equipmentHu) {
        headerDisplay[t('common:equipment')] = equipmentHu.name;
    }
    if (step30Position && round?.equipment?.checkPosition) {
        headerDisplay[t('common:pack_position')] = step30Position;
    }
    if (inProgressHuo && !round?.equipment?.checkPosition) {
        headerDisplay[t('common:huo-in-progress')] = inProgressHuo.name;
        headerDisplay[t('common:expected-article_abbr')] =
            inProgressHuo.handlingUnitContentOutbounds[0].article.name;
        headerDisplay[t('common:expected-quantity_abbr')] =
            inProgressHuo.handlingUnitContentOutbounds[0].quantityToBePicked -
            inProgressHuo.handlingUnitContentOutbounds[0].pickedQuantity -
            inProgressHuo.handlingUnitContentOutbounds[0].missingQuantity;
    }
    if (
        storedObject['step30']?.data?.currentHuos?.length > 0 &&
        !isToControl &&
        isToControl !== null
    ) {
        const currentHuo = storedObject['step30'].data.currentHuos[0];
        let quantityDisplay = 0;
        currentHuo?.handlingUnitContentOutbounds.forEach((hu: any, index: number) => {
            quantityDisplay += hu.quantityToBePicked - hu.pickedQuantity - hu.missingQuantity;
        });
        headerDisplay[t('common:quantity')] = {
            value: quantityDisplay,
            highlight: true
        };
    }
    if (storedObject['step40']?.data?.currentHuco) {
        headerDisplay[t('common:article_abbr')] =
            storedObject['step40']?.data?.currentHuco.article.name;
    }
    if (storedObject['step50']?.data?.movingQuantity && currentHuco) {
        headerDisplay[t('common:quantity')] =
            storedObject['step50'].data.movingQuantity +
            '/' +
            (currentHuco.quantityToBePicked -
                currentHuco.pickedQuantity -
                currentHuco.missingQuantity);
    }

    headerDisplay = getMoreInfos(headerDisplay, storedObject, processName, t);
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
        if (inProgressHuo) {
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
            key: 'enforce-control',
            label: t('actions:enforce-control'),
            visibleOnSteps: [60],
            permissionsToSeeTheButton: !isToControl && isToControl !== null ? true : false,
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
            {isLoading ? (
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
                                    handlingUnitOutboundInfos={destinationHuos}
                                />
                            )}
                            enforcedValue={step20Position ?? undefined}
                            defaultValue={
                                inProgressHuo
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
                    {((!isBoxReviewNeeded && storedObject['step50']?.data) ||
                        storedObject['step60']?.data) &&
                    !storedObject['step70']?.data ? (
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
                </RadioButtonWrapper>
            )}
        </PageContentWrapper>
    );
};
//#endregion

Pack.layout = MainLayout;

export default Pack;
