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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAppDispatch } from 'context/AppContext';

export interface ISelectPrinterProps {
    processName: string;
    ruleName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
}

export const SelectPrinter = ({
    processName,
    ruleName,
    stepNumber,
    buttons
}: ISelectPrinterProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(processName) || '{}');

    // TYPED SAFE ALL
    const [printerList, setPrinterList] = useState<any[]>([]);

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
            const ruleVariables = { context: { module: ruleName } };
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
            setPrinterList(printerCodeListFiltered);
        };

        fetchData();
    }, []);

    //Pre-requisite: initialize current step
    useEffect(() => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
    }, []);

    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};

        data['printers'] = printerList?.find((option) => option.code === values.printers);

        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { ...storedObject[`step${stepNumber}`], data },
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
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
