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
import { useEffect, useState } from 'react';
import { LsIsSecured } from '@helpers';
import { Form, Space, Typography } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import styled from 'styled-components';
import {
    StyledForm,
    WrapperFeature,
    StyledFeaturesInput,
    StyledFeaturesDatePicker,
    StyledFeaturesFormItem,
    StyledRadioSwitch,
    RadioButtons
} from '@components';
import dayjs from 'dayjs';

export interface IReviewFeaturesProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    expectedFeatures?: any;
}
const { Title } = Typography;

const StyledTitle = styled(Title)`
    margin: 0 !important;
`;

export const ReviewFeatures = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    expectedFeatures
}: IReviewFeaturesProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const { t } = useTranslation();
    const [buttonsState] = useState<any>({ ...buttons });
    const [form] = Form.useForm();
    const [isEditable, setIsEditable] = useState(false);
    const isHuToCreate: boolean = storedObject.step30?.data?.isHuToCreate;

    //Pre-requisite: initialize current step
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (!expectedFeatures || expectedFeatures === null || expectedFeatures.length <= 0) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['reviewedFeatures'] = undefined;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const [showSwitch, setShowSwitch] = useState(true);

    useEffect(() => {
        if (isHuToCreate) {
            setIsEditable(true);
            setShowSwitch(false);
        }
    }, [isHuToCreate]);

    useEffect(() => {
        const initialValues = expectedFeatures?.reduce((acc: any, feature: any) => {
            acc[feature.featureCode.name] = feature?.featureCode.dateType
                ? dayjs(feature.value)
                : feature.value;
            return acc;
        }, {});

        form.setFieldsValue(initialValues);
    }, [expectedFeatures, form]);

    const onFinish = () => {
        const formData = form.getFieldsValue(true);
        const newFormData = { ...formData };

        for (const key in formData) {
            if (formData.hasOwnProperty(key)) {
                const value = formData[key];
                if (!/^\d+$/.test(value)) {
                    const date = dayjs(value);
                    if (date.isValid()) {
                        newFormData[key] = date.format('YYYY-MM-DD');
                        continue;
                    }
                } else {
                    newFormData[key] = value;
                }
            }
        }

        const reviewedFeatures = expectedFeatures.map((feature: any) => {
            const key = feature.featureCode.name;
            if (newFormData[key] !== feature.value) {
                return {
                    ...feature,
                    value: newFormData[key]
                };
            }
            return feature;
        });

        const hasModifications = reviewedFeatures.some(
            (feature: any, index: number) => feature.value !== expectedFeatures[index].value
        );

        const data: { [label: string]: any } = {};
        data['reviewedFeatures'] = hasModifications ? reviewedFeatures : 'none';
        setTriggerRender(!triggerRender);
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
    };

    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    const handleSwitchChange = (checked: boolean) => {
        setIsEditable(checked);
    };

    //Sort only for display purposes
    const sortedFeatures = expectedFeatures
        ? [...expectedFeatures].sort((a, b) => {
              if (a.featureCode.name < b.featureCode.name) return 1;
              if (a.featureCode.name > b.featureCode.name) return -1;
              return 0;
          })
        : undefined;

    return (
        <WrapperFeature>
            <StyledTitle level={5}>{t('common:feature-codes-entry')}</StyledTitle>
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                size="small"
                form={form}
            >
                {showSwitch && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Space style={{ alignItems: 'center' }}>
                            <span>{t('actions:edit')}</span>
                            <StyledRadioSwitch onChange={handleSwitchChange} />
                        </Space>
                    </div>
                )}
                {sortedFeatures?.map((feature: any) => {
                    return !feature?.featureCode.dateType ? (
                        <StyledFeaturesFormItem
                            label={feature.featureCode.name}
                            name={feature.featureCode.name}
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <StyledFeaturesInput
                                value={feature.value}
                                disabled={!isEditable}
                                isEditable={isEditable}
                            />
                        </StyledFeaturesFormItem>
                    ) : (
                        <StyledFeaturesFormItem
                            label={feature.featureCode.name}
                            name={feature.featureCode.name}
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <StyledFeaturesDatePicker
                                format="YYYY-MM-DD"
                                picker="date"
                                disabled={!isEditable}
                            />
                        </StyledFeaturesFormItem>
                    );
                })}
                <RadioButtons
                    input={{
                        ...buttonsState
                    }}
                    output={{ trigger: { triggerRender, setTriggerRender }, onBack }}
                ></RadioButtons>
            </StyledForm>
        </WrapperFeature>
    );
};
