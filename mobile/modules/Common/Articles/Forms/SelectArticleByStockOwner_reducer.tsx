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
//DESCRIPTION: select an article among a list of stock owners corresponding to a given article

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { showError, getStockOwnerIdFromArticleLuBarcode } from '@helpers';
import { Select, Form } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectArticleByStockOwnerReducerProps {
    processName: string;
    stepNumber: number;
    buttons?: { [label: string]: any };
    articleLuBarcodes: Array<Object>;
    formToUse?: any;
}

export const SelectArticleByStockOwnerForm_reducer = ({
    processName,
    stepNumber,
    buttons,
    articleLuBarcodes,
    formToUse
}: ISelectArticleByStockOwnerReducerProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    const [stockOwnerChoice, setStockOwnerChoice] = useState<Array<any>>();

    //camera scanner section
    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (stockOwnerChoice?.some((option) => option.text === camData)) {
                const stockOwnerToFind = stockOwnerChoice?.find(
                    (option) => option.text === camData
                );
                form.setFieldsValue({ stockOwnerId: stockOwnerToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, stockOwnerChoice]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (articleLuBarcodes) {
            let objectUpdate: any = {
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: undefined,
                customFields: undefined
            };
            //automatically set chosenArticleLuBarcode when single article
            if (articleLuBarcodes.length === 1) {
                // N.B.: in this case previous step is kept at its previous value
                objectUpdate.object = {
                    ...storedObject[`step${stepNumber}`],
                    data: { chosenArticleLuBarcode: articleLuBarcodes[0] }
                };
            } else if (storedObject.currentStep < stepNumber) {
                //check workflow direction and assign current step accordingly
                objectUpdate.object = { previousStep: storedObject.currentStep };
                objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
            }
            dispatch(objectUpdate);
        }
    }, [articleLuBarcodes]);

    //SelectArticleByStockOwner-1: retrieve stock owner choices for select
    useEffect(() => {
        const newIdOpts: Array<any> = [];
        articleLuBarcodes?.forEach((e: any) => {
            if (e.stockOwner) {
                newIdOpts.push({
                    text: e.stockOwner.name!,
                    key: getStockOwnerIdFromArticleLuBarcode(e)!
                });
            }
        });
        function compare(a: any, b: any) {
            if (a.text < b.text) {
                return -1;
            }
            if (a.text > b.text) {
                return 1;
            }
            return 0;
        }
        newIdOpts.sort(compare);
        setStockOwnerChoice(newIdOpts);
    }, [articleLuBarcodes]);

    //SelectArticleByStockOwner-2a: retrieve chosen stock owner from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        data['chosenArticleLuBarcode'] = articleLuBarcodes?.find((e: any) => {
            return getStockOwnerIdFromArticleLuBarcode(e) == values.stockOwnerId;
        });
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { ...storedObject[`step${stepNumber}`], data },
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
    };

    //SelectArticleByStockOwner-2b: handle back to previous step settings
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
                    label={t('common:stock-owner')}
                    name="stockOwnerId"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
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
                        {stockOwnerChoice?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
