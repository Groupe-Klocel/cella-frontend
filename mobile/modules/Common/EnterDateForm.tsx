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
import { DatePicker, Form, InputNumber } from 'antd';
import { RadioButtons } from 'components/common/dumb/Buttons/RadioButtons';
import moment from 'moment';
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';

export interface IEnterDateFormProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    enteredInfo: { [label: string]: any };
    resetForm: { [label: string]: any };
    label?: string;
    rules?: Array<any>;
    availableQuantity?: number;
    min?: number;
    max?: number;
    isSelected?: boolean;
}

export const EnterDateForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    enteredInfo: { enteredInfo, setEnteredInfo },
    resetForm: { resetForm, setResetForm },
    label,
    rules,
    isSelected
}: IEnterDateFormProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const [form] = Form.useForm();

    // TYPED SAFE ALL
    //EnterDateForm-1a: retrieve chosen level from select and set information
    const onFinish = (dateString: any) => {
        setEnteredInfo(dateString);
    };

    //EnterDateForm-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    // Scan-2: manage form reset in case of error
    useEffect(() => {
        if (resetForm) {
            form.resetFields();
            setResetForm(false);
        }
    }, [resetForm]);

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
                    label={label ? label : t('common:date')}
                    name="date"
                    rules={rules}
                    initialValue={moment()}
                >
                    <DatePicker
                        format="YYYY-MM-DD"
                        // defaultValue={moment()}
                        style={{ height: '25px', marginBottom: '5px' }}
                        onFocus={isSelected ? (e) => e.target.select() : undefined}
                        autoFocus
                    />
                </StyledFormItem>
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
