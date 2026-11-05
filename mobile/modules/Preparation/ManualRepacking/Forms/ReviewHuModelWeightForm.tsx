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
//DESCRIPTION: packaging (handling unit model) + actual weight of a box being repacked, prefilled
// with its theoretical weight (recomputed over every absorbed box for a consolidation)

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    // Consolidation: boxes whose content is absorbed by currentHuo, to be weighed with it
    consolidatedHuos?: Array<any>;
}

export const ReviewHuModelWeightForm = ({
    processName,
    stepNumber,
    buttons,
    checkComponent,
    currentHuo,
    defaultValue,
    formToUse,
    consolidatedHuos
}: IReviewHuModelWeightProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const inputNumberRef: any = useRef(null);
    const { parameters, configs } = useAppState();

    const [huModels, setHuModels] = useState<Array<any>>();
    const [ownForm] = Form.useForm();
    const form = formToUse ?? ownForm;
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

    // Consolidation: the box keeps its own theoretical weight until the back end recomputes it,
    // at validation only - i.e. after this step. Prefilling `currentHuo.theoriticalWeight` would
    // propose the weight of the original box alone, while it is about to absorb the content of
    // every scanned box. Recomputed here with the same formula as the cubing/closeBox one -
    // packaging (selected model weight + closure weight) + Σ content quantity × article base unit
    // weight - over the original box and the absorbed ones, whose own packaging disappears.
    // Split (steps 60/70) is not concerned: `finishBox` / `closeNewBox` return both boxes with
    // their recomputed theoretical weight.
    const isConsolidation = Boolean(consolidatedHuos?.length);

    // The packaging part follows the model the operator selects, which is not necessarily the one
    // the box already carries.
    const selectedHuModelId = Form.useWatch('huModel', form);

    const consolidatedWeight = useMemo(() => {
        if (!isConsolidation) return undefined;

        const contentWeight = [currentHuo, ...(consolidatedHuos ?? [])].reduce(
            (total: number, huo: any) =>
                total +
                (huo?.handlingUnitContentOutbounds ?? []).reduce(
                    (huoTotal: number, huco: any) =>
                        huoTotal +
                        (huco?.handlingUnitContent?.quantity ?? 0) *
                            (huco?.handlingUnitContent?.article?.baseUnitWeight ?? 0),
                    0
                ),
            0
        );

        const selectedHuModel = huModelsList?.find((e: any) => e.id === selectedHuModelId);
        const packagingWeight =
            (selectedHuModel?.weight ?? 0) + (selectedHuModel?.closureWeight ?? 0);

        return Math.round(contentWeight + packagingWeight);
    }, [isConsolidation, currentHuo, consolidatedHuos, huModelsList, selectedHuModelId]);

    useEffect(() => {
        if (consolidatedWeight === undefined) return;
        form.setFieldsValue({ number: consolidatedWeight });
    }, [consolidatedWeight]);

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
                initialValue={consolidatedWeight ?? currentHuo?.theoriticalWeight ?? undefined}
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
