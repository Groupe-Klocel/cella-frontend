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
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { SelectPrinter } from 'modules/Preparation/Pack/Forms/SelectPrinter_Reducer';
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

type PageComponent = FC & { layout: typeof MainLayout };

const Pack: PageComponent = () => {
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

    console.log(`${processName}`, storedObject);

    const round = storedObject?.step20?.data?.round;
    const equipmentHu = storedObject?.step20?.data?.equipmentHu;
    const step20Position = storedObject?.step20?.data?.position;
    const step30Position = storedObject?.step30?.data?.position;
    const destinationHuos = round?.handlingUnitOutbounds?.filter(
        (item: any) => item.handlingUnit?.type !== equipmentHuType
    );
    //box currently in progress of packing if any
    const inProgressHuo = storedObject?.step20?.data?.inProgressHuo;
    //selected box (in progress or new one)
    const currentHuo = round?.equipment?.checkPosition
        ? storedObject?.step30?.data?.currentHuos?.[0]
        : storedObject?.step40?.data?.currentHuo;

    //function to retrieve information to display in RadioInfosHeader
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
    if (storedObject['step40']?.data?.currentHuco) {
        headerDisplay[t('common:article_abbr')] =
            storedObject['step40']?.data?.currentHuco.article.name;
    }
    if (storedObject['step50']?.data?.movingQuantity && storedObject['step40']?.data?.currentHuco) {
        const currentHuco = storedObject['step40'].data.currentHuco;
        headerDisplay[t('common:quantity')] =
            storedObject['step50'].data.movingQuantity +
            '/' +
            (currentHuco.quantityToBePicked -
                currentHuco.pickedQuantity -
                currentHuco.missingQuantity);
    }

    headerDisplay = getMoreInfos(headerDisplay, storedObject, processName, t);

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
            if (round.equipment?.checkPosition && isToControl === null) {
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

    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
    };

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
                <>
                    {!storedObject['step10']?.data ? (
                        <SelectPrinter
                            processName={processName}
                            ruleName="pack"
                            stepNumber={10}
                            buttons={{ submitButton: true, backButton: false }}
                        ></SelectPrinter>
                    ) : (
                        <></>
                    )}
                    {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                        <ScanRoundOrHuOrPosition
                            processName={processName}
                            stepNumber={20}
                            label={t('d:round-or-equipment-or-position')}
                            buttons={{ submitButton: true, backButton: true }}
                            checkComponent={(data: any) => (
                                <RoundOrHuOrPositionCheck dataToCheck={data} />
                            )}
                        ></ScanRoundOrHuOrPosition>
                    ) : (
                        <></>
                    )}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <ScanPosition
                            processName={processName}
                            stepNumber={30}
                            label={t('common:pack_position')}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
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
                            triggerAlternativeSubmit1={{
                                triggerAlternativeSubmit1: closeBox,
                                setTriggerAlternativeSubmit1: setCloseBox
                            }}
                            buttons={{
                                submitButton: true,
                                backButton: true,
                                alternativeSubmitButton1: !!inProgressHuo
                            }}
                            proposedHuos={storedObject['step30']?.data?.currentHuos}
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
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
                            initialValueType={quantityDefaultValue}
                            availableQuantity={
                                storedObject['step40']?.data?.currentHuco
                                    ? storedObject['step40'].data.currentHuco.quantityToBePicked -
                                      storedObject['step40'].data.currentHuco.pickedQuantity -
                                      storedObject['step40'].data.currentHuco.missingQuantity
                                    : 0
                            }
                            autoValidate1Quantity={autoValidate1Quantity}
                            checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {((!isToControl && isToControl !== null && storedObject['step30']?.data) ||
                        (isToControl && isToControl !== null && storedObject['step50']?.data)) &&
                    !storedObject['step60']?.data ? (
                        <ReviewHuModelWeightForm
                            processName={processName}
                            stepNumber={60}
                            buttons={{
                                submitButton: true,
                                alternativeSubmitButton1: !isToControl,
                                backButton: true
                            }}
                            currentHuo={currentHuo}
                            triggerAlternativeSubmit1={{
                                triggerAlternativeSubmit1: triggerEnforcedControl,
                                setTriggerAlternativeSubmit1: setTriggerEnforcedControl
                            }}
                            checkComponent={(data: any) => (
                                <ReviewHuModelWeightChecks
                                    dataToCheck={data}
                                    isToControl={{ isToControl, setIsToControl }}
                                />
                            )}
                        ></ReviewHuModelWeightForm>
                    ) : (
                        <></>
                    )}
                    {storedObject['step60']?.data && !storedObject['step70']?.data ? (
                        <AutoValidatePackForm
                            processName={processName}
                            stepNumber={70}
                            buttons={{
                                submitButton: true,
                                backButton: true
                            }}
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
                </>
            )}
        </PageContentWrapper>
    );
};

Pack.layout = MainLayout;

export default Pack;
