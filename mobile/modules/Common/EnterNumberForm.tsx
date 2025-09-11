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
import { LsIsSecured } from '@helpers';
import { Form, InputNumber } from 'antd';
import { RadioButtons } from 'components/common/dumb/Buttons/RadioButtons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import TextArea from 'antd/es/input/TextArea';

export interface IEnterNumberFormProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
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
}

export const EnterNumberForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    setEnteredInfo,
    label,
    rules,
    min,
    max,
    initialValue,
    isSelected,
    isCommentDisplayed
}: IEnterNumberFormProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const [form] = Form.useForm();

    // TYPED SAFE ALL
    //EnterNumberForm-1a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        setEnteredInfo(values.number);
        if (isCommentDisplayed) {
            if (values.comment && values.comment.length > 0) {
                storedObject['comment'] = values.comment;
            } else {
                if (storedObject['comment']) {
                    delete storedObject['comment'];
                }
            }
            storage.set(process, JSON.stringify(storedObject));
        }
    };

    //EnterNumberForm-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
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
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
