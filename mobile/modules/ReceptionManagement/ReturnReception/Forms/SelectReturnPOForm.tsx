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
import { LsIsSecured, extractGivenConfigsParams, showError, showSuccess } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    useSimpleGetAllPurchaseOrdersQuery,
    SimpleGetAllPurchaseOrdersQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectReturnPOProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    customer?: any;
    action1Trigger?: any;
}

export const SelectReturnPOForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    action1Trigger: { action1Trigger, setAction1Trigger },
    customer,
    buttons
}: ISelectReturnPOProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    const [purchaseOrders, setPurchaseOrders] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (purchaseOrders?.some((option) => option.text === camData)) {
                form.setFieldsValue({ returns: camData });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, purchaseOrders]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectReturnPO-2: retrieve purchase orders choices for select
    const returnsList = useSimpleGetAllPurchaseOrdersQuery<
        Partial<SimpleGetAllPurchaseOrdersQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            type: [configs.PURCHASE_ORDER_TYPE_L2_RETURN],
            status: [configs.PURCHASE_ORDER_STATUS_IN_PROGRESS],
            supplier: [customer]
        },
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (returnsList) {
            const newTypeTexts: Array<any> = [];
            const tmp = returnsList?.data?.purchaseOrders?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                setPurchaseOrders(newTypeTexts);
            }
        }
    }, [returnsList.data]);

    //SelectReturnPO-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const query = gql`
            query return($id: String!) {
                purchaseOrder(id: $id) {
                    id
                    name
                    orderDate
                    purchaseOrderLines {
                        id
                        lineNumber
                    }
                }
            }
        `;

        const variables = {
            id: values.returns
        };
        const selectedReturnPO = await graphqlRequestClient.request(query, variables);
        data['purchaseOrder'] = selectedReturnPO.purchaseOrder;
        storedObject[`step${stepNumber}`] = {
            ...storedObject[`step${stepNumber}`],
            data
        };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    useEffect(() => {
        if (action1Trigger) {
            const data: { [label: string]: any } = {};
            data['purchaseOrder'] = 'new';
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            setAction1Trigger(false);
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [action1Trigger]);

    //SelectReturnPO-2b: handle back to previous step settings
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
                    label={t('common:return')}
                    name="returns"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.text === form.getFieldValue('returns') ||
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                    >
                        {purchaseOrders?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons
                    input={{ ...buttons, action1Trigger }}
                    output={{ setAction1Trigger, onBack }}
                    action1Label={t('common:new-return')}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
