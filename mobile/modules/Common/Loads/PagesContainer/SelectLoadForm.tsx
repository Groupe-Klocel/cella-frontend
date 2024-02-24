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
import { ScanForm } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { showError, useLoadIds } from '@helpers';
import { LsIsSecured } from '@helpers';
import { RadioButtons, StyledForm, StyledFormItem, WrapperForm } from '@components';
import { Form, Select } from 'antd';
import CameraScanner from 'modules/Common/CameraScanner';
import useTranslation from 'next-translate/useTranslation';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../../common/configs.json';

export interface ISelectLoadProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const SelectLoadForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectLoadProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [loads, setLoads] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (loads?.some((option) => option.text === camData)) {
                const roundToFind = loads?.find((option) => option.text === camData);
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

    //Pre-requisite: initialize current step
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
                    newTypeTexts.push({ key: item.id, text: item.name });
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
            // Save data in Local Storage
            const data: { [label: string]: any } = {};
            data['load'] = selectedLoad;
            setTriggerRender(!triggerRender);
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
        } else {
            if (!selectedLoad) {
                showError(t('messages:no-load'));
            } else {
                showError(t('messages:load-dispatched'));
            }
            setResetForm(true);
            setScannedInfo(undefined);
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    };

    //SelectRound-2b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        delete storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].data;
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
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
