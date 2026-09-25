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
import { showError, useLoadIds } from '@helpers';
import { RadioButtons, StyledForm, StyledFormItem, WrapperForm } from '@components';
import { Form, Select } from 'antd';
import CameraScanner from 'modules/Common/CameraScanner';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import configs from '../../../../../common/configs.json';

export interface ISelectLoadProps {
    processName: string;
    stepNumber: number;
    buttons?: { [label: string]: any };
    formToUse?: any;
}

export const SelectLoadForm = ({
    processName,
    stepNumber,
    buttons,
    formToUse
}: ISelectLoadProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [loads, setLoads] = useState<Array<any>>();

    //camera scanner section
    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (loads?.some((option) => option.name === camData || option.text === camData)) {
                const roundToFind = loads?.find(
                    (option) => option.name === camData || option.text === camData
                );
                form.setFieldsValue({ loads: roundToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, loads]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step - this is the entry step of the flow, so it
    //is set unconditionally on mount (no previousStep, like pack's SelectPrinter_Reducer step 10).
    useEffect(() => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
    }, []);

    // SelectLoad-2: launch query
    const loadsList = useLoadIds(
        { status: [configs.LOAD_STATUS_CREATED, configs.LOAD_STATUS_LOAD_IN_PROGRESS] },
        1,
        100,
        null
    );

    useEffect(() => {
        if (loadsList) {
            const newTypeTexts: Array<any> = [];
            const cData = loadsList?.data?.loads?.results;
            if (cData) {
                cData.forEach((item) => {
                    //display "<load name> - <carrier shipping mode>", falling back on the carrier
                    const suffix = item.carrierShippingMode?.name ?? item.carrier?.name;
                    newTypeTexts.push({
                        key: item.id,
                        name: item.name,
                        text: suffix ? `${item.name} - ${suffix}` : item.name
                    });
                });
                setLoads(newTypeTexts);
            }
        }
    }, [loadsList.data]);

    //SelectRound-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const query = gql`
            query load($id: String!) {
                load(id: $id) {
                    id
                    name
                    status
                    weight
                    stockOwnerId
                    carrierId
                    carrier {
                        name
                    }
                    weight
                    numberHuLoaded
                }
            }
        `;

        const variables = {
            id: values.loads
        };

        const results = await graphqlRequestClient.request(query, variables);
        const selectedLoad = results.load;

        if (
            // Condition
            selectedLoad &&
            (selectedLoad.status === configs.LOAD_STATUS_CREATED ||
                selectedLoad.status === configs.LOAD_STATUS_LOAD_IN_PROGRESS)
        ) {
            // Save data in context
            const data: { [label: string]: any } = {};
            data['load'] = selectedLoad;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        } else {
            if (!selectedLoad) {
                showError(t('messages:no-load'));
            } else {
                showError(t('messages:load-dispatched'));
            }
            setResetForm(true);
            setScannedInfo(undefined);
        }
    };

    //SelectRound-2b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    return (
        <>
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
                        label={t('common:load-number')}
                        name="loads"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
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
                            {loads?.map((option: any) => (
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
        </>
    );
};
