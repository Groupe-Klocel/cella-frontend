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
//DESCRIPTION: enter a quantity lower than the available quantity

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { showError, LsIsSecured } from '@helpers';
import { Form, InputNumber } from 'antd';
import { RadioButtons } from 'components/common/dumb/Buttons/RadioButtons';
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';

export interface IEnterQuantityFormProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    availableQuantity: number;
}

export const EnterQuantityForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    availableQuantity
}: IEnterQuantityFormProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const [form] = Form.useForm();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //EnterQuantity-1a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        if (values.quantity <= availableQuantity!) {
            const data: { [label: string]: any } = {};
            data['movingQuantity'] = values.quantity;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:erroneous-quantity'));
            form.resetFields();
        }
    };

    //EnterQuantity-1b: handle back to previous step settings
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
                    label={t('common:quantity')}
                    name="quantity"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <InputNumber
                        min={1}
                        style={{ height: '20px', marginBottom: '5px' }}
                        autoFocus
                    />
                </StyledFormItem>
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
