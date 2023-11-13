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
//DESCRIPTION: select list handling unit type = pallet corresponding to a given barcode

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { showError, LsIsSecured, useBoxes } from '@helpers';
import { Form, Input } from 'antd';
import CameraScanner from 'modules/Common/CameraScanner';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IScanBoxFormProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const ScanBoxForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: IScanBoxFormProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [form] = Form.useForm();

    //camera scanner section
    const [camData, setCamData] = useState();

    useEffect(() => {
        form.setFieldsValue({ barcode: camData });
    }, [camData]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    // TYPED SAFE ALL
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //ScanBox: retrieve value from input and set values for display
    const [handlingUnitOutboundName, setHandlingUnitOutboundName] = useState<string>();
    const onFinish = (values: any) => {
        setHandlingUnitOutboundName(values.barcode);
    };

    // ScanBox-2: launch query
    const { data: handlingUnitOutboundInfos, error } = useBoxes(
        { name: `${handlingUnitOutboundName}` },
        1,
        100,
        null
    );

    //ScanBox-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (handlingUnitOutboundName && handlingUnitOutboundInfos) {
            if (handlingUnitOutboundInfos.handlingUnitOutbounds?.results.length !== 0) {
                const data: { [label: string]: any } = {};
                data['handlingUnitOutbound'] =
                    handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0];
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                showError(t('messages:no-box-or-empty'));
                form.resetFields();
                setHandlingUnitOutboundName(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitOutboundInfos]);

    //ScanBox-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        delete storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].data;
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
                    label={label}
                    name="barcode"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Input style={{ height: '20px', marginBottom: '5px' }} autoFocus />
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons
                    input={{
                        ...buttons
                    }}
                    output={{
                        onBack
                    }}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
