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
import { showError, LsIsSecured, useHandlingUnits } from '@helpers';
import { Form, Input } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';

export interface IScanPalletProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const ScanPalletForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: IScanPalletProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [form] = Form.useForm();

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

    //ScanPallet-1a: retrieve value from input and set values for display
    const [handlingUnitBarcode, setHandlingUnitBarcode] = useState<string>();
    const onFinish = (values: any) => {
        setHandlingUnitBarcode(values.barcode);
    };

    // ScanPallet-2: launch query
    const handlingUnitInfos = useHandlingUnits({ name: `${handlingUnitBarcode}` }, 1, 100, null);
    

    //ScanPallet-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (handlingUnitBarcode && handlingUnitInfos.data) {
            if (
                handlingUnitInfos.data.handlingUnits?.count !== 0 &&
                handlingUnitInfos.data.handlingUnits?.results[0].type ===
                    parameters.HANDLING_UNIT_TYPE_PALLET &&
                handlingUnitInfos.data.handlingUnits.results[0].handlingUnitContents.length !== 0
            ) {
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = handlingUnitInfos.data?.handlingUnits?.results[0];
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
            } else {
                showError(t('messages:no-pallet-or-empty'));
                form.resetFields();
                setHandlingUnitBarcode(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitInfos]);

    //ScanPallet-1b: handle back to previous step settings
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
