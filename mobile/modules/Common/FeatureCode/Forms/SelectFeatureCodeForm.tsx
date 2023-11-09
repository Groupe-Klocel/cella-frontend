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
//DESCRIPTION: select manually or automatically one location in a list of locations according to their level

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { LsIsSecured } from '@helpers';
import { Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { GetAllFeatureCodesQuery, useGetAllFeatureCodesQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface ISelectFeatureCodeProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    defaultValue?: any;
}

export const SelectFeatureCodeForm = ({
    process,
    stepNumber,
    defaultValue,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectFeatureCodeProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    const [featureCodes, setFeatureCodes] = useState<Array<any>>();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set returnDate when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['featureCode'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectFeatureCode-1: retrieve featureCodes
    const featureCodesList = useGetAllFeatureCodesQuery<Partial<GetAllFeatureCodesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {},
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (featureCodesList) {
            const newFeatureCodeTexts: Array<any> = [];
            const tmp = featureCodesList?.data?.featureCodes?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    newFeatureCodeTexts.push({ key: item.id, text: item.name });
                });
                setFeatureCodes(newFeatureCodeTexts);
            }
        }
    }, [featureCodesList.data]);

    //SelectFeatureCode-2a: retrieve chosen featureCode from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedFeatureCode = featureCodesList?.data?.featureCodes?.results.find((e: any) => {
            return e.id == values.featureCode;
        });
        data['featureCode'] = selectedFeatureCode;
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectFeatureCode-2b: handle back to previous step settings
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
            >
                <StyledFormItem
                    label={t('common:feature-code')}
                    name="featureCode"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select style={{ height: '20px', marginBottom: '5px' }}>
                        {featureCodes?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <RadioButtons
                    input={{ ...buttons }}
                    output={{ onBack }}
                    action1Label={t('actions:back')}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
