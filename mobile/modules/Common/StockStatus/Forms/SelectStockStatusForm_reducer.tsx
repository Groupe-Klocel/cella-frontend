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

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';
import CameraScanner from 'modules/Common/CameraScanner';
import TextArea from 'antd/es/input/TextArea';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectStockStatusReducerProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    defaultValue?: any;
    initialValue?: any;
    isCommentDisplayed?: boolean;
}

export const SelectStockStatusForm_reducer = ({
    processName,
    stepNumber,
    defaultValue,
    initialValue,
    buttons,
    isCommentDisplayed
}: ISelectStockStatusReducerProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const router = useRouter();
    const { locale } = router;

    // TYPED SAFE ALL
    const [stockStatuses, setStockStatuses] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (stockStatuses?.some((option) => option.text === camData)) {
                const stockStatusToFind = stockStatuses?.find((option) => option.text === camData);
                form.setFieldsValue({ stockStatus: stockStatusToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, stockStatuses]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            currentStep: undefined
        };
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            objectUpdate.object = {
                ...storedObject[`step${stepNumber}`],
                data: { stockStatus: defaultValue }
            };
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.currentStep = stepNumber;
        }
        dispatch(objectUpdate);
    }, []);

    //SelectStockStatus-1: retrieve stock statuses choices for select
    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: locale === 'en-US' ? 'en' : locale
    });

    useEffect(() => {
        if (stockStatusList) {
            const newTypeTexts: Array<any> = [];
            const cData = stockStatusList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStockStatuses(newTypeTexts);
            }
        }
    }, [stockStatusList.data]);

    //SelectStockStatus-2a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        data['stockStatus'] = stockStatuses?.find((e: any) => {
            return e.key == values.stockStatus;
        });

        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { ...storedObject[`step${stepNumber}`], data },
            customFields: [
                { key: 'currentStep', value: stepNumber },
                {
                    key: 'comment',
                    value: isCommentDisplayed && values.comment?.length ? values.comment : undefined
                }
            ]
        });
    };

    //SelectStockStatus-2b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    return (
        <WrapperForm>
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                size="small"
                form={form}
            >
                <StyledFormItem
                    label={t('common:stock-status')}
                    name="stockStatus"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                    initialValue={initialValue ?? parameters.STOCK_STATUSES_SALE}
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
                    >
                        {stockStatuses?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                {isCommentDisplayed && (
                    <StyledFormItem
                        label={t('common:comment')}
                        name="comment"
                        initialValue={storedObject['comment'] ?? undefined}
                    >
                        <TextArea allowClear></TextArea>
                    </StyledFormItem>
                )}
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
