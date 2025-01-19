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
import { useSimpleGetRoundsQuery, SimpleGetRoundsQuery } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectRoundProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const SelectRoundForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectRoundProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    const [rounds, setRounds] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (rounds?.some((option) => option.text === camData)) {
                const roundToFind = rounds?.find((option) => option.text === camData);
                form.setFieldsValue({ rounds: roundToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, rounds]);

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

    //SelectRound-1: retrieve rounds choices for select
    const configsToFilterOn = extractGivenConfigsParams(configs, 'round_status', {
        min: configs.ROUND_STATUS_ESTIMATED,
        max: configs.ROUND_STATUS_TO_BE_VERIFIED
    });

    const roundsList = useSimpleGetRoundsQuery<Partial<SimpleGetRoundsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { status: configsToFilterOn, category: [configs.ROUND_CATEGORY_OUTBOUND] },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (roundsList) {
            const newTypeTexts: Array<any> = [];
            const cData = roundsList?.data?.rounds?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                setRounds(newTypeTexts);
            }
        }
    }, [roundsList.data]);

    //SelectRound-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const query = gql`
            query round($id: String!) {
                round(id: $id) {
                    id
                    name
                    status
                    statusText
                    priority
                    priorityText
                    nbPickArticle
                    nbBox
                    nbRoundLine
                    pickingTime
                    productivity
                    expectedDeliveryDate
                    handlingUnitOutbounds {
                        id
                        name
                        status
                        statusText
                        roundId
                        handlingUnitModelId
                    }
                    roundAdvisedAddresses {
                        id
                        roundOrderId
                        quantity
                        status
                        statusText
                        locationId
                        location {
                            name
                        }
                        handlingUnitContentId
                        handlingUnitContent {
                            id
                            quantity
                            stockStatus
                            stockStatusText
                            reservation
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                baseUnitWeight
                            }
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            handlingUnitContentFeatures {
                                featureCode {
                                    name
                                    unique
                                }
                                value
                            }
                            handlingUnitId
                            handlingUnit {
                                id
                                name
                                barcode
                                status
                                statusText
                                type
                                typeText
                                category
                                categoryText
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                            }
                        }
                        roundLineDetailId
                        roundLineDetail {
                            status
                            statusText
                            quantityToBeProcessed
                            processedQuantity
                            roundLineId
                            roundLine {
                                lineNumber
                                articleId
                                status
                                statusText
                            }
                            deliveryLineId
                            deliveryLine {
                                id
                                articleId
                                stockOwnerId
                                deliveryId
                                stockStatus
                                stockStatusText
                                reservation
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            id: values.rounds
        };

        const selectedRound = await graphqlRequestClient.request(query, variables);

        data['round'] = selectedRound.round;
        const roundAdvisedAddresses = selectedRound?.round?.roundAdvisedAddresses
            ?.filter((raa: any) => raa.quantity != 0)
            .sort((a: any, b: any) => {
                return a.roundOrderId - b.roundOrderId;
            });

        if (roundAdvisedAddresses) {
            data['proposedRoundAdvisedAddress'] = roundAdvisedAddresses[0];
        }

        if (selectedRound?.status == configs.ROUND_STATUS_STARTED) {
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            let roundIds = rounds?.map((item) => ({ id: item.key }));

            const variables = {
                functionName: 'K_updateRoundsStatus',
                event: { input: { rounds: roundIds, status: configs.ROUND_STATUS_IN_PREPARATION } }
            };
            try {
                const launchRoundsResult = await graphqlRequestClient.request(query, variables);
                if (launchRoundsResult.executeFunction.status === 'ERROR') {
                    showError(launchRoundsResult.executeFunction.output);
                } else if (
                    launchRoundsResult.executeFunction.status === 'OK' &&
                    launchRoundsResult.executeFunction.output.status === 'KO'
                ) {
                    showError(t(`errors:${launchRoundsResult.executeFunction.output.output.code}`));
                    console.log(
                        'Backend_message',
                        launchRoundsResult.executeFunction.output.output
                    );
                } else {
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storage.set(process, JSON.stringify(storedObject));
                    setTriggerRender(!triggerRender);
                }
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
            }
        } else {
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
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
                    label={t('common:rounds')}
                    name="rounds"
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
                        {rounds?.map((option: any) => (
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
