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
//DESCRIPTION: select list of locations corresponding to a given barcode

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { showError, useLocationIds, LsIsSecured } from '@helpers';
import { Form, Input } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface IScanLocationFormProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent?: any;
    showSimilarLocations?: any;
    showEmptyLocations?: any;
    initValue?: string;
}

export const ScanLocationForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    headerContent,
    showSimilarLocations,
    showEmptyLocations,
    buttons,
    initValue
}: IScanLocationFormProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [form] = Form.useForm();
    const router = useRouter();

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

    //ScanLocation-1a: retrieve value from input and set values for display
    const [locationBarcode, setLocationBarcode] = useState<string>();
    const onFinish = (values: any) => {
        setLocationBarcode(values.barcode);
    };

    // ScanLocation-2: launch query
    const locationInfos = useLocationIds(
        { barcode: `${locationBarcode}` },
        1,
        100,
        null,
        router.locale
    );

    //ScanLocation-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (locationBarcode && locationInfos.data) {
            if (locationInfos.data.locations?.count !== 0) {
                const data: { [label: string]: any } = {};
                data['locations'] = locationInfos.data?.locations?.results.map(
                    ({ id, name, barcode, level }) => {
                        return { id, name, barcode, level };
                    }
                );
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
                headerContent?.setHeaderContent(true);
                showSimilarLocations?.setShowSimilarLocations(false);
                showEmptyLocations?.setShowEmptyLocations(false);
            } else {
                showError(t('messages:no-location'));
                form.resetFields();
                setLocationBarcode(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [locationInfos]);

    //ScanLocation-1b: handle back to previous step settings
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
                    label={label}
                    name="barcode"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                    initialValue={initValue ? initValue : undefined}
                >
                    <Input style={{ height: '20px', marginBottom: '5px' }} autoFocus />
                </StyledFormItem>
                <RadioButtons
                    input={{
                        ...buttons,
                        headerContent: headerContent?.headerContent,
                        showSimilarLocations: showSimilarLocations?.showSimilarLocations,
                        showEmptyLocations: showEmptyLocations?.showEmptyLocations
                    }}
                    output={{
                        setHeaderContent: headerContent?.setHeaderContent,
                        setShowSimilarLocations: showSimilarLocations?.setShowSimilarLocations,
                        setShowEmptyLocations: showEmptyLocations?.setShowEmptyLocations,
                        onBack
                    }}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
