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
import { LsIsSecured } from '@helpers';
import { Form, Input } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../common/configs.json';
import CameraScanner from './CameraScanner';

export interface IScanProps {
    process: string;
    stepNumber: number;
    label: string | undefined;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    setScannedInfo: (value: string) => void;
    showEmptyLocations?: any;
    resetForm: { [label: string]: any };
}

export const ScanForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    setScannedInfo,
    showEmptyLocations,
    resetForm: { resetForm, setResetForm }
}: IScanProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    // TYPED SAFE ALL
    //Scan-1a: retrieve value from input and set values for display
    const onFinish = (values: any) => {
        setScannedInfo(values.scannedItem);
    };

    // Scan-2: manage form reset in case of error
    useEffect(() => {
        if (resetForm) {
            form.resetFields();
            setResetForm(false);
            setCamData(undefined);
        }
    }, [resetForm]);

    //Scan-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //optional: when camera is set to on
    useEffect(() => {
        form.setFieldsValue({ scannedItem: camData });
    }, [camData]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
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
                    name="scannedItem"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Input style={{ height: '20px', marginBottom: '5px' }} autoFocus />
                </StyledFormItem>
                {configs.SCAN_CAMERA_ACTIVATED === 1 ? (
                    <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                ) : (
                    <></>
                )}
                <RadioButtons
                    input={{
                        ...buttons,
                        showEmptyLocations: showEmptyLocations?.showEmptyLocations
                    }}
                    output={{
                        setShowEmptyLocations: showEmptyLocations?.setShowEmptyLocations,
                        onBack
                    }}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
