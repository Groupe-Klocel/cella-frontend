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
import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { Form, InputNumber } from 'antd';
import { RadioButtons } from 'components/common/dumb/Buttons/RadioButtons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import TextArea from 'antd/es/input/TextArea';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IEnterNumberFormProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    setEnteredInfo: (value: number) => void;
    label?: string;
    rules?: Array<any>;
    availableQuantity?: number;
    min?: number;
    max?: number;
    initialValue?: number;
    isSelected?: boolean;
    isCommentDisplayed?: boolean;
    alternativeSubmitLabel1?: any;
    triggerAlternativeSubmit1?: any;
    style?: any;
}

export const EnterNumberForm = ({
    processName,
    stepNumber,
    buttons,
    setEnteredInfo,
    label,
    rules,
    min,
    max,
    initialValue,
    isSelected,
    isCommentDisplayed,
    alternativeSubmitLabel1,
    triggerAlternativeSubmit1,
    style
}: IEnterNumberFormProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [form] = Form.useForm();

    // TYPED SAFE ALL
    //EnterNumberForm-1a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        setEnteredInfo(values.number);
        if (isCommentDisplayed) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                customFields: [
                    {
                        key: 'comment',
                        value: values.comment?.length ? values.comment : undefined
                    }
                ]
            });
        }
    };

    //EnterNumberForm-1b: handle back to previous step settings
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
                style={style}
            >
                <StyledFormItem
                    label={label ? label : t('common:number')}
                    name="number"
                    rules={rules}
                    initialValue={initialValue}
                >
                    <InputNumber
                        min={min}
                        max={max}
                        style={{ height: '25px', marginBottom: '5px' }}
                        onFocus={isSelected ? (e) => e.target.select() : undefined}
                        // @ts-expect-error: this is to avoid scan on non numeric values but as TS expect number, we need to ignore it.
                        parser={(value) => {
                            if (!value) return '';
                            if (!/^(-?[\d]+([.,]\d*)?)?$/.test(value)) return '';
                            return value.replace(',', '.');
                        }}
                        autoFocus
                    />
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
                <RadioButtons
                    input={{
                        ...buttons,
                        triggerAlternativeSubmit1:
                            triggerAlternativeSubmit1?.triggerAlternativeSubmit1
                    }}
                    alternativeSubmitLabel1={alternativeSubmitLabel1}
                    output={{
                        setTriggerAlternativeSubmit1:
                            triggerAlternativeSubmit1?.setTriggerAlternativeSubmit1,
                        onBack
                    }}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
