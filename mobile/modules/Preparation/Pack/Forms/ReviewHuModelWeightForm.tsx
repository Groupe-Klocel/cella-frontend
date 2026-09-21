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
//DESCRIPTION: select manually or automatically one location in a list of locations according to their level

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useRef, useState } from 'react';
// import configs from '../../../../../common/configs.json';
// import parameters from '../../../../../common/parameters.json';
import { ParametersQuery, useParametersQuery } from 'generated/graphql';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { EnterNumberForm } from 'modules/Common/EnterNumberForm_reducer';

export interface IReviewHuModelWeightProps {
    processName: string;
    stepNumber: number;
    buttons?: { [label: string]: any };
    checkComponent: any;
    currentHuo: any;
    defaultValue?: any;
    initialControlState?: boolean | null;
    formToUse?: any;
    // whether the box content is controlled (scanned) at packing: drives the weight recomputation
    isToControl?: boolean | null;
}

export const ReviewHuModelWeightForm = ({
    processName,
    stepNumber,
    buttons,
    checkComponent,
    currentHuo,
    defaultValue,
    formToUse,
    isToControl
}: IReviewHuModelWeightProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const inputNumberRef: any = useRef(null);
    const { parameters, configs } = useAppState();

    const [huModels, setHuModels] = useState<Array<any>>();
    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [enteredWeightInfo, setEnteredWeightInfo] = useState<number>();

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const inProgressHuModelStatus = parseInt(
            findCodeByScopeAndValue(configs, 'handling_unit_model_status', 'In progress')
        );

        const equipmentHuType = parseInt(
            findCodeByScopeAndValue(parameters, 'handling_unit_type', 'EQUIPMENT')
        );

        const palletHuType = parseInt(
            findCodeByScopeAndValue(parameters, 'handling_unit_type', 'PALLET')
        );

        const inboundOutboundHuModelCategory = parseInt(
            findCodeByScopeAndValue(parameters, 'handling_unit_model_category', 'Inbound/Outbound')
        );

        const outboundHuModelCategory = parseInt(
            findCodeByScopeAndValue(parameters, 'handling_unit_model_category', 'Outbound')
        );

        const outboundStockHuModelCategory = parseInt(
            findCodeByScopeAndValue(parameters, 'handling_unit_model_category', 'Outbound/Stock')
        );

        const InboundOutBoundStockModelCategory = parseInt(
            findCodeByScopeAndValue(
                parameters,
                'handling_unit_model_category',
                'Inbound/Stock/Outbound'
            )
        );

        return {
            inProgressHuModelStatus,
            equipmentHuType,
            palletHuType,
            inboundOutboundHuModelCategory,
            outboundHuModelCategory,
            outboundStockHuModelCategory,
            InboundOutBoundStockModelCategory
        };
    }, [parameters, configs]);

    //query hums
    const getHUMs = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query handlingUnitModels(
                $filters: HandlingUnitModelSearchFilters
                $advancedFilters: [HandlingUnitModelAdvancedSearchFilters!]
                $itemsPerPage: Int!
            ) {
                handlingUnitModels(
                    filters: $filters
                    advancedFilters: $advancedFilters
                    itemsPerPage: $itemsPerPage
                ) {
                    results {
                        id
                        name
                        description
                        default
                        dispatchable
                        status
                        statusText
                        weight
                        closureWeight
                        length
                        height
                        width
                        system
                        type
                        typeText
                        category
                        categoryText
                        preparationMode
                        preparationModeText
                    }
                }
            }
        `;

        const variables = {
            filters: {
                status: [configsParamsCodes.inProgressHuModelStatus],
                category: [
                    configsParamsCodes.inboundOutboundHuModelCategory,
                    configsParamsCodes.outboundHuModelCategory,
                    configsParamsCodes.outboundStockHuModelCategory,
                    configsParamsCodes.InboundOutBoundStockModelCategory
                ]
            },
            advancedFilters: {
                filter: [
                    { searchType: 'DIFFERENT', field: { type: configsParamsCodes.equipmentHuType } }
                ]
            },
            itemsPerPage: 10000
        };
        const huModelInfos = await graphqlRequestClient.request(query, variables);
        return huModelInfos;
    };

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName: processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
        const initialize = async () => {
            if (defaultValue) {
                let data: { [label: string]: any } = {};
                let defaultValueToSend;
                if (defaultValue === 'defaultModel') {
                    const huModels = await getHUMs();
                    if (huModels) {
                        defaultValueToSend = huModels.handlingUnitModels.results.find(
                            (e: any) => e.type === configsParamsCodes.palletHuType
                        );
                    }
                } else {
                    defaultValueToSend = defaultValue;
                }

                data['handlingUnitModel'] = defaultValueToSend;
                objectUpdate.object = { data };
            } else if (storedObject.currentStep < stepNumber) {
                objectUpdate.object = { previousStep: storedObject.currentStep };
                objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
            }
            dispatch(objectUpdate);
        };

        initialize();
    }, []);

    const [packagingToExclude, setPackagingToExclude] = useState<any>();
    const defaultDeclarativeParameter = useParametersQuery<Partial<ParametersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { scope: ['cubing'], code: ['DEFAULT_DECLARATIVE_LU'] }
        }
    );

    useEffect(() => {
        if (defaultDeclarativeParameter) {
            const defaultDeclarativeData =
                defaultDeclarativeParameter?.data?.parameters?.results[0];
            setPackagingToExclude(defaultDeclarativeData);
        }
    }, [defaultDeclarativeParameter.data]);

    const [huModelsList, setHuModelsList] = useState<Array<any>>();

    useEffect(() => {
        const fetchHuModels = async () => {
            const hums = await getHUMs();
            if (hums) {
                const newTypeTexts: Array<any> = [];
                const cData = hums?.handlingUnitModels?.results.filter(
                    (item: any) => item?.name !== packagingToExclude?.value
                );
                setHuModelsList(cData);
                if (cData) {
                    cData.forEach((item: any) => {
                        newTypeTexts.push({
                            key: item.id,
                            text: `${item.name} - ${item.description}`
                        });
                    });
                    setHuModels(newTypeTexts);
                }
            }
        };
        fetchHuModels();
    }, [packagingToExclude]);

    // Theoretical weight of what this box actually holds. `currentHuo.theoriticalWeight` is the
    // cubing one, computed for the whole content planned on the box: it is too heavy as soon as
    // the box is closed before the end (forced closure, finish position), the remainder leaving
    // for another box. Recomputed here with the same formula as the cubing/closeBox one -
    // packaging (selected model weight + closure weight) + Σ packed quantity × article base unit
    // weight - but on the quantities that end up in the box.
    // `undefined` = not resolved yet, `null` = not computable (contents unreadable).
    const [boxContents, setBoxContents] = useState<Array<any> | null>();

    useEffect(() => {
        const fetchBoxContents = async () => {
            if (!currentHuo?.id) return;
            const query = gql`
                query handlingUnitContentOutbounds(
                    $filters: HandlingUnitContentOutboundSearchFilters
                    $itemsPerPage: Int!
                ) {
                    handlingUnitContentOutbounds(filters: $filters, itemsPerPage: $itemsPerPage) {
                        results {
                            id
                            quantityToBePicked
                            pickedQuantity
                            missingQuantity
                            article {
                                id
                                baseUnitWeight
                            }
                        }
                    }
                }
            `;
            try {
                const result = await graphqlRequestClient.request(query, {
                    filters: { handlingUnitOutboundId: currentHuo.id },
                    itemsPerPage: 1000
                });
                setBoxContents(result?.handlingUnitContentOutbounds?.results ?? null);
            } catch (error) {
                // Contents not readable: the cubing weight stays the prefilled value.
                console.warn('box contents not resolved, cubing weight kept', error);
                setBoxContents(null);
            }
        };
        fetchBoxContents();
    }, [currentHuo?.id]);

    // The packaging part follows the model the operator selects, which is not necessarily the one
    // proposed by cubing.
    const selectedHuModelId = Form.useWatch('huModel', form);

    const prefilledWeight = useMemo(() => {
        if (boxContents === undefined) return undefined;
        if (boxContents === null) return currentHuo?.theoriticalWeight ?? undefined;

        // Quantity entered at step 50, already counted as packed although the backend has not
        // validated it yet (that happens after this step).
        const pendingHucoId = storedObject?.step40?.data?.currentHuco?.id;
        const pendingQuantity =
            typeof storedObject?.step50?.data?.movingQuantity === 'number'
                ? storedObject.step50.data.movingQuantity
                : 0;

        const contentWeight = boxContents.reduce((total: number, huco: any) => {
            // While controlling, the box only holds what has been scanned; without control
            // nothing is scanned and the whole remainder is packed at validation.
            const packedQuantity = isToControl
                ? (huco.pickedQuantity ?? 0) + (huco.id === pendingHucoId ? pendingQuantity : 0)
                : Math.max((huco.quantityToBePicked ?? 0) - (huco.missingQuantity ?? 0), 0);
            return total + packedQuantity * (huco.article?.baseUnitWeight ?? 0);
        }, 0);

        const selectedHuModel = huModelsList?.find((e: any) => e.id === selectedHuModelId);
        const packagingWeight =
            (selectedHuModel?.weight ?? 0) + (selectedHuModel?.closureWeight ?? 0);

        return Math.round(contentWeight + packagingWeight);
    }, [
        boxContents,
        isToControl,
        storedObject,
        huModelsList,
        selectedHuModelId,
        currentHuo?.theoriticalWeight
    ]);

    // The weight input is shared with the quantity step (same `number` field on the same form),
    // so its value is set explicitly rather than through the form item's initial value, which
    // antd ignores once the field holds a value.
    useEffect(() => {
        if (prefilledWeight === undefined) return;
        form.setFieldsValue({ number: prefilledWeight });
    }, [prefilledWeight]);

    const dataToCheck = {
        processName,
        stepNumber,
        huModel: huModelsList?.find((e: any) => {
            return e.id == form.getFieldValue('huModel');
        }),
        enteredInfo: { enteredWeightInfo, setEnteredWeightInfo }
    };

    return (
        <>
            <WrapperForm>
                <StyledForm
                    name="basic"
                    layout="vertical"
                    autoComplete="off"
                    scrollToFirstError
                    size="small"
                    form={form}
                >
                    <StyledFormItem
                        label={t('common:handling-unit-model')}
                        name="huModel"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
                        initialValue={currentHuo?.handlingUnitModelId}
                    >
                        <Select
                            style={{ height: '20px', marginBottom: '5px' }}
                            showSearch
                            filterOption={(inputValue, option) =>
                                option!.props.children
                                    .toUpperCase()
                                    .indexOf(inputValue.toUpperCase()) !== -1
                            }
                            allowClear
                            autoFocus
                            onSelect={() => inputNumberRef.current?.focus()}
                        >
                            {huModels?.map((option: any) => (
                                <Select.Option key={option.key} value={option.key}>
                                    {option.text}
                                </Select.Option>
                            ))}
                        </Select>
                    </StyledFormItem>
                </StyledForm>
            </WrapperForm>
            <EnterNumberForm
                processName={processName}
                stepNumber={stepNumber}
                buttons={{ ...buttons }}
                label={t('common:box-weight_unit')}
                setEnteredInfo={setEnteredWeightInfo}
                rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                min={1}
                initialValue={currentHuo?.theoriticalWeight ?? undefined}
                isSelected={true}
                isCommentDisplayed={false}
                autoFocus={false}
                inputNumberRef={inputNumberRef}
                formToUse={form}
            ></EnterNumberForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
