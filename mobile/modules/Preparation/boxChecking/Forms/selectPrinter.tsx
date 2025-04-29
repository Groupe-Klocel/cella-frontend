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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectPrinterProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const SelectPrinter = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectPrinterProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    const [printerList, setPrinterList] = useState<any[]>([]);

    console.log('printerList', printerList);

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (printerList?.some((option) => option.code === camData)) {
                const roundToFind = printerList?.find((option) => option.code === camData);
                form.setFieldsValue({ rounds: roundToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, printerList]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //retrieve printer list
    useEffect(() => {
        const fetchRuleResult = async () => {
            const ruleVariables = { context: { module: 'box_checking' } };
            const ruleQuery = gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "PRINTER_LIST", context: $context)
                }
            `;
            const ruleResult = await graphqlRequestClient.request(ruleQuery, ruleVariables);
            return ruleResult.executeRule.printerList.value;
        };

        const fetchData = async () => {
            const printerCodeList = await fetchRuleResult();
            //get printer list from parameters
            const query = gql`
                query parameters($filters: ParameterSearchFilters!) {
                    parameters(filters: $filters) {
                        results {
                            value
                            code
                            value
                        }
                    }
                }
            `;
            const variables = {
                filters: { scope: 'printer' }
            };
            const printerInfos = await graphqlRequestClient.request(query, variables);
            const printerList = printerInfos.parameters.results.map((printer: any) => ({
                value: printer.value,
                code: printer.code
            }));
            const printerCodeListFiltered = printerList.filter((printer: any) =>
                printerCodeList.includes(printer.code)
            );
            console.log('printerCodeListFiltered', printerCodeListFiltered);
            setPrinterList(printerCodeListFiltered);
        };

        fetchData();
    }, []);

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};

        data['printers'] = printerList?.find((option) => option.code === values.printers);

        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectRound-2b: handle back to previous step settings
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
                    label={t('common:printers')}
                    name="printers"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
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
                        {printerList?.map((option: any) => (
                            <Select.Option key={option.code} value={option.code}>
                                {option.value}
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
