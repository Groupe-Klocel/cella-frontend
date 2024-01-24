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
import { LsIsSecured, showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectStockStatusProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    defaultValue?: any;
}

export const SelectStockStatusForm = ({
    process,
    stepNumber,
    defaultValue,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectStockStatusProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const router = useRouter();
    const { locale } = router;

    // TYPED SAFE ALL
    const [stockStatuses, setStockStatuses] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (stockStatuses?.some((option) => option.text === camData)) {
                const stockStatusToFind = stockStatuses?.find((option) => option.text === camData);
                form.setFieldsValue({ stockStatus: stockStatusToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, stockStatuses]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['stockStatus'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectStockStatus-1: retrieve stock statuses choices for select
    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: locale === 'en-US' ? 'en' : locale
    });

    useEffect(() => {
        if (stockStatusList) {
            const newTypeTexts: Array<any> = [];
            const cData = stockStatusList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStockStatuses(newTypeTexts);
            }
        }
    }, [stockStatusList.data]);

    //SelectStockStatus-2a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        data['stockStatus'] = stockStatuses?.find((e: any) => {
            return e.key == values.stockStatus;
        });
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectStockStatus-2b: handle back to previous step settings
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
                    label={t('common:stock-status')}
                    name="stockStatus"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                    initialValue={parameters.STOCK_STATUSES_SALE}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                    >
                        {stockStatuses?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
