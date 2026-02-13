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
import { useEffect, useRef, useState } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { ParametersQuery, useParametersQuery } from 'generated/graphql';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { EnterNumberForm } from 'modules/Common/EnterNumberForm_reducer';

export interface IReviewHuModelWeightProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    checkComponent: any;
    currentHuo: any;
    defaultValue?: any;
    initialControlState?: boolean | null;
    triggerAlternativeSubmit1?: any;
}

export const ReviewHuModelWeightForm = ({
    processName,
    stepNumber,
    buttons,
    checkComponent,
    currentHuo,
    defaultValue,
    initialControlState,
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 }
}: IReviewHuModelWeightProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const inputNumberRef: any = useRef(null);

    const [huModels, setHuModels] = useState<Array<any>>();
    const [form] = Form.useForm();
    const [enteredWeightInfo, setEnteredWeightInfo] = useState<number>();

    //query hums
    const getHUMs = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query handlingUnitModels($filters: HandlingUnitModelSearchFilters) {
                handlingUnitModels(filters: $filters) {
                    results {
                        id
                        name
                        description
                        default
                        dispatchable
                        status
                        statusText
                        weight
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
                status: [configs.HANDLING_UNIT_MODEL_STATUS_IN_PROGRESS],
                category: [
                    parameters['HANDLING_UNIT_MODEL_CATEGORY_OUTBOUND'],
                    parameters['HANDLING_UNIT_MODEL_CATEGORY_INBOUND/OUTBOUND'],
                    parameters['HANDLING_UNIT_MODEL_CATEGORY_OUTBOUND/STOCK'],
                    parameters['HANDLING_UNIT_MODEL_CATEGORY_INBOUND/STOCK/OUTBOUND']
                ]
            },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
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
                            (e: any) => e.type === parameters.HANDLING_UNIT_TYPE_PALLET
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

    const dataToCheck = {
        processName,
        stepNumber,
        huModel: huModelsList?.find((e: any) => {
            return e.id == form.getFieldValue('huModel');
        }),
        enteredInfo: { enteredWeightInfo, setEnteredWeightInfo },
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 }
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
                triggerAlternativeSubmit1={{
                    triggerAlternativeSubmit1,
                    setTriggerAlternativeSubmit1
                }}
                alternativeSubmitLabel1={t('actions:enforce-control')}
                autoFocus={false}
                inputNumberRef={inputNumberRef}
            ></EnterNumberForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
