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

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { EnterNumberForm } from 'modules/Common/EnterNumberForm_reducer';
import { showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import TextArea from 'antd/es/input/TextArea';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectStockStatusAndQuantityFormReducerProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    defaultValue?: any;
    StockStatusInitialValue?: any;
    QuantityDefaultValue?: number;
    availableQuantity?: number;
    isCommentDisplayed?: boolean;
    checkComponent: any;
    QuantityInitialValueType?: number;
}

export const SelectStockStatusAndQuantityForm_reducer = ({
    processName,
    stepNumber,
    defaultValue,
    StockStatusInitialValue,
    QuantityDefaultValue,
    availableQuantity,
    buttons,
    isCommentDisplayed,
    checkComponent,
    QuantityInitialValueType
}: ISelectStockStatusAndQuantityFormReducerProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const { configs, parameters } = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const router = useRouter();
    const { locale } = router;
    const language = (locale === 'en-US' ? 'en' : locale) ?? 'en';

    const [enteredQuantityInfo, setEnteredQuantityInfo] = useState<number>();

    // Define initial value according to prioritized parameters sent
    const tmpInitialValue = (() => {
        return QuantityInitialValueType == 1
            ? 1
            : QuantityInitialValueType == 2
              ? availableQuantity
              : undefined;
    })();

    const configsParamsCodes = useMemo(() => {
        const findAllByScope = (items: any[], scope: string) => {
            return items
                .filter((item: any) => item.scope === scope)
                .sort((a, b) => a.code - b.code)
                .map((item: any) => {
                    return {
                        ...item,
                        code: parseInt(item.code),
                        value: item.translation?.[language] || item.value
                    };
                });
        };
        const stockStatuses = findAllByScope(parameters, 'stock_statuses');
        const salesStatus = stockStatuses.find((status: any) => status.value === 'Sale');
        return {
            stockStatuses,
            salesStatus
        };
    }, [configs, parameters]);

    // #region camera scanner
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (configsParamsCodes.stockStatuses?.some((option) => option.value === camData)) {
                const stockStatusToFind = configsParamsCodes.stockStatuses?.find(
                    (option) => option.value === camData
                );
                form.setFieldsValue({ stockStatus: stockStatusToFind.code });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // #endregion camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            currentStep: undefined
        };
        //automatically set movingQuantity when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            objectUpdate.object = {
                ...storedObject[`step${stepNumber}`],
                data: { movingQuantity: defaultValue }
            };
            const originalPoLines = storedObject[`step40`]?.data?.currentPurchaseOrderLine || [];
            let movingQuantity = defaultValue;

            // check every original PoLine and set the received quantity to match the quantity first and then the quantity max
            const updatedPoLinesFirstPass = originalPoLines.map((line: any) => {
                if (line.receivedQuantity === line.quantityMax) {
                    return line; // already fully received, skip
                }
                const receivedQuantity = line.receivedQuantity || 0;
                const quantity = line.quantity || 0;
                const quantityNeeded = quantity - receivedQuantity;
                console.log(
                    receivedQuantity,
                    quantity,
                    quantityNeeded,
                    'Quantities: received, expected, needed'
                );

                if (quantityNeeded > 0) {
                    if (movingQuantity >= quantityNeeded) {
                        movingQuantity -= quantityNeeded;
                        return {
                            ...line,
                            receivedQuantity: quantity
                        };
                    } else {
                        const newQuantity = receivedQuantity + movingQuantity;
                        movingQuantity = 0; // reset movingQuantity to 0
                        return {
                            ...line,
                            receivedQuantity: newQuantity
                        };
                    }
                }
            });
            let updatedPoLinesSecondPass = null;
            if (movingQuantity > 0) {
                updatedPoLinesSecondPass = updatedPoLinesFirstPass.map((line: any) => {
                    if (line.receivedQuantity === line.quantityMax) {
                        return line; // already fully received, skip
                    }
                    const receivedQuantity = line.receivedQuantity || 0;
                    const quantityMax = line.quantityMax || 0;
                    const quantityNeeded = quantityMax - receivedQuantity;
                    if (quantityNeeded > 0) {
                        if (movingQuantity >= quantityNeeded) {
                            movingQuantity -= quantityNeeded;
                            return {
                                ...line,
                                receivedQuantity: quantityMax
                            };
                        } else {
                            const newQuantity = receivedQuantity + movingQuantity;
                            movingQuantity = 0; // reset movingQuantity to 0
                            return {
                                ...line,
                                receivedQuantity: newQuantity
                            };
                        }
                    }
                });
            }
            const newPOLines = updatedPoLinesSecondPass ?? updatedPoLinesFirstPass;
            objectUpdate.object.data.updatePoLines = newPOLines.filter(
                (newPoline: any) =>
                    newPoline.receivedQuantity !==
                    originalPoLines.find((oldPoline: any) => oldPoline.id === newPoline.id)
                        ?.receivedQuantity
            );
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.currentStep = stepNumber;
        }
        dispatch(objectUpdate);
    }, []);

    const dataToCheck = {
        processName,
        stepNumber,
        stockStatuses: configsParamsCodes.stockStatuses?.find((e: any) => {
            return e.code == form.getFieldValue('stockStatus');
        }),
        enteredInfo: { enteredQuantityInfo, setEnteredQuantityInfo }
    };

    let rules: Array<any> = [{ required: true, message: t('messages:error-message-empty-input') }];
    if (availableQuantity !== undefined && availableQuantity !== null) {
        rules.push({
            type: 'number',
            max: availableQuantity,
            message: t('messages:erroneous-quantity')
        });
    }

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
                        label={t('common:stock-status')}
                        name="stockStatus"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
                        initialValue={
                            StockStatusInitialValue ?? configsParamsCodes.salesStatus?.code
                        }
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
                            {configsParamsCodes.stockStatuses?.map((option: any) => (
                                <Select.Option key={option.code} value={option.code}>
                                    {option.value}
                                </Select.Option>
                            ))}
                        </Select>
                    </StyledFormItem>
                    <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                </StyledForm>
            </WrapperForm>
            <EnterNumberForm
                processName={processName}
                stepNumber={stepNumber}
                buttons={{ ...buttons }}
                setEnteredInfo={setEnteredQuantityInfo}
                rules={rules}
                min={1}
                initialValue={tmpInitialValue}
                isSelected={true}
                isCommentDisplayed={isCommentDisplayed}
            ></EnterNumberForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
