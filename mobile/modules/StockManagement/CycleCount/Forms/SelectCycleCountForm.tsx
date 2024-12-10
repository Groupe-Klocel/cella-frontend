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

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons, ContentSpin } from '@components';
import { LsIsSecured, extractGivenConfigsParams, showError, showSuccess } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';
import { SimpleGetCycleCountsQuery, useSimpleGetCycleCountsQuery } from 'generated/graphql';
import { useRouter } from 'next/router';
import { createCycleCountError } from 'helpers/utils/crudFunctions/cycleCount';

export interface ISelectCycleCountProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    customer?: any;
}

export const SelectCycleCountForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    customer,
    buttons
}: ISelectCycleCountProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const router = useRouter();

    // TYPED SAFE ALL
    const [cycleCounts, setCycleCounts] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (cycleCounts?.some((option) => option.text === camData)) {
                const ccToFind = cycleCounts?.find((option) => option.text === camData);
                form.setFieldsValue({ cycleCounts: ccToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, cycleCounts]);

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

    //SelectCycleCount-2: retrieve purchase orders choices for select
    const configsToFilterOn = extractGivenConfigsParams(configs, 'cycle_count_status', {
        min: 0,
        max: configs.CYCLE_COUNT_STATUS_VALIDATED
    });
    const cycleCountsList = useSimpleGetCycleCountsQuery<Partial<SimpleGetCycleCountsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {
                status: configsToFilterOn
            },
            orderBy: null,
            page: 1,
            itemsPerPage: 200,
            language: router.locale
        }
    );

    useEffect(() => {
        if (cycleCountsList) {
            const newTypeTexts: Array<any> = [];
            const tmp = cycleCountsList?.data?.cycleCounts?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    const displayedText = `${item.name} - ${item.statusText}`;
                    newTypeTexts.push({ key: item.id, text: displayedText });
                });
                newTypeTexts?.sort((a, b) => b.text.localeCompare(a.text));
                setCycleCounts(newTypeTexts);
            }
        }
    }, [cycleCountsList.data]);

    //SelectCycleCount-2a: retrieve chosen level from select and set information
    const [CCIsLoading, setCCIsLoading] = useState(false);
    const onFinish = async (values: any) => {
        setCCIsLoading(true);
        const data: { [label: string]: any } = {};

        const query = gql`
            query return($id: String!) {
                cycleCount(id: $id) {
                    id
                    name
                    status
                    statusText
                    type
                    cycleCountLines(orderBy: { fieldName: "order", ascending: true }) {
                        id
                        status
                        statusText
                        order
                        articleId
                        articleNameStr
                        stockOwnerId
                        stockOwnerNameStr
                        locationId
                        locationNameStr
                        handlingUnitId
                        handlingUnitNameStr
                        parentHandlingUnitNameStr
                        handlingUnitContentId
                        cycleCountId
                    }
                }
            }
        `;

        const variables = {
            id: values.cycleCounts
        };
        const selectedCycleCount = await graphqlRequestClient.request(query, variables);

        if (
            selectedCycleCount.cycleCount.status < configs.CYCLE_COUNT_STATUS_CREATED &&
            selectedCycleCount.cycleCount.status > configs.CYCLE_COUNT_STATUS_VALIDATED
        ) {
            await createCycleCountError(
                selectedCycleCount.cycleCount.id,
                `Step ${stepNumber} - ${t('messages:unexpected-scanned-item')} - ${
                    values.cycleCounts
                }`
            ).then((res) => {
                form.resetFields();
                showError(t('messages:unexpected-scanned-item'));
                setCamData(undefined);
            });
        } else {
            //Transaction management
            const generateTransactionId = gql`
                mutation {
                    generateTransactionId
                }
            `;
            const transactionIdResponse = await graphqlRequestClient.request(generateTransactionId);
            const lastTransactionId = transactionIdResponse.generateTransactionId;

            const rollbackTransaction = gql`
                mutation rollback($transactionId: String!) {
                    rollbackTransaction(transactionId: $transactionId)
                }
            `;
            const rollbackVariable = {
                transactionId: lastTransactionId
            };
            try {
                // Determine next status of CC
                let newCCStatus: number;
                switch (selectedCycleCount.cycleCount.status) {
                    case configs.CYCLE_COUNT_STATUS_CREATED:
                        newCCStatus = configs.CYCLE_COUNT_STATUS_PASS_1_IN_PROGRESS;
                        break;
                    case configs.CYCLE_COUNT_STATUS_PASS_1_VALIDATED:
                        newCCStatus = configs.CYCLE_COUNT_STATUS_PASS_2_IN_PROGRESS;
                        break;
                    case configs.CYCLE_COUNT_STATUS_PASS_2_VALIDATED:
                        newCCStatus = configs.CYCLE_COUNT_STATUS_PASS_3_IN_PROGRESS;
                        break;
                    default:
                        newCCStatus = selectedCycleCount.cycleCount.status;
                        break;
                }

                let processedCycleCount: any;

                if (selectedCycleCount.cycleCount.status != newCCStatus) {
                    // Begin Update CC status
                    const updateCycleCountMutation = gql`
                        mutation updateCycleCount($id: String!, $input: UpdateCycleCountInput!) {
                            updateCycleCount(id: $id, input: $input) {
                                id
                                name
                                status
                                statusText
                                type
                                cycleCountLines(orderBy: { fieldName: "order", ascending: true }) {
                                    id
                                    status
                                    statusText
                                    order
                                    articleId
                                    articleNameStr
                                    stockOwnerId
                                    stockOwnerNameStr
                                    locationId
                                    locationNameStr
                                    handlingUnitId
                                    handlingUnitNameStr
                                    parentHandlingUnitNameStr
                                    handlingUnitContentId
                                    cycleCountId
                                }
                            }
                        }
                    `;
                    const updateCycleCountVariables = {
                        id: selectedCycleCount?.cycleCount.id,
                        input: {
                            status: newCCStatus,
                            lastTransactionId
                        }
                    };
                    const updateCycleCountResponse = await graphqlRequestClient.request(
                        updateCycleCountMutation,
                        updateCycleCountVariables
                    );
                    // End Update CC status
                    processedCycleCount = updateCycleCountResponse.updateCycleCount;
                } else {
                    processedCycleCount = selectedCycleCount.cycleCount;
                }

                // Keep only CCL with status <= newCCStatus
                processedCycleCount.cycleCountLines = processedCycleCount.cycleCountLines.filter(
                    (ccl: any) => ccl.status <= newCCStatus
                );

                let processedCycleCountLine: any;

                if (processedCycleCount.cycleCountLines[0].status != newCCStatus) {
                    // Begin Update CCL status
                    const updateCycleCountLineMutation = gql`
                        mutation updateCycleCountLine(
                            $id: String!
                            $input: UpdateCycleCountLineInput!
                        ) {
                            updateCycleCountLine(id: $id, input: $input) {
                                id
                                status
                                statusText
                                order
                                articleId
                                articleNameStr
                                stockOwnerId
                                stockOwnerNameStr
                                locationId
                                locationNameStr
                                handlingUnitId
                                handlingUnitNameStr
                                parentHandlingUnitNameStr
                                handlingUnitContentId
                                cycleCountId
                            }
                        }
                    `;
                    const updateCycleCountLineVariables = {
                        id: processedCycleCount.cycleCountLines[0].id,
                        input: {
                            status: newCCStatus,
                            lastTransactionId
                        }
                    };
                    const updateCycleCountLineResponse = await graphqlRequestClient.request(
                        updateCycleCountLineMutation,
                        updateCycleCountLineVariables
                    );
                    // End Update CCL status
                    processedCycleCountLine = updateCycleCountLineResponse.updateCycleCountLine;
                } else {
                    processedCycleCountLine = processedCycleCount.cycleCountLines[0];
                }

                // Store data in LS
                data['cycleCount'] = processedCycleCount;
                data['currentCycleCountLine'] = processedCycleCountLine;
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                storage.set(process, JSON.stringify(storedObject));
                setTriggerRender(!triggerRender);
                setCCIsLoading(false);
            } catch (error) {
                console.log(error);
                await graphqlRequestClient.request(rollbackTransaction, rollbackVariable);
                showError(t('messages:cycle-count-update-failed'));
                setCCIsLoading(false);
            }
        }
    };

    //SelectCycleCount-2b: handle back to previous step settings
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
                    label={t('common:cycle-count')}
                    name="cycleCounts"
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
                        {cycleCounts?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
            {CCIsLoading ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
