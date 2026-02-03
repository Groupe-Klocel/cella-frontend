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
import moment from 'moment';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectRoundProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
}

export const SelectRoundForm = ({ processName, stepNumber, buttons }: ISelectRoundProps) => {
    const { graphqlRequestClient, user } = useAuth();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    const [rounds, setRounds] = useState<Array<any>>([]);

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
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    //SelectRound-1: retrieve rounds choices for select
    const configsToFilterOn = extractGivenConfigsParams(configs, 'round_status', {
        min: configs.ROUND_STATUS_ESTIMATED,
        max: configs.ROUND_STATUS_TO_BE_VERIFIED
    });

    const fetchRoundsList = async () => {
        const equipmentId = storedObject[`step5`]?.data?.equipmentId;
        const roundsListFromGQL = gql`
            query rounds(
                $filters: RoundSearchFilters
                $orderBy: [RoundOrderByCriterion!]
                $advancedFilters: [RoundAdvancedSearchFilters!]
                $page: Int
                $itemsPerPage: Int
            ) {
                rounds(
                    filters: $filters
                    orderBy: $orderBy
                    advancedFilters: $advancedFilters
                    page: $page
                    itemsPerPage: $itemsPerPage
                ) {
                    results {
                        id
                        name
                        equipment {
                            id
                            name
                        }
                        expectedDeliveryDate
                        assignedUser
                    }
                }
            }
        `;

        const roundsListVariables = {
            filters: { status: configsToFilterOn, equipment_Id: equipmentId },
            advancedFilters: [
                {
                    filter: [
                        { field: { assignedUser: ['**null**'] }, searchType: 'EQUAL' },
                        { field: { assignedUser: [user.username] }, searchType: 'EQUAL' }
                    ]
                }
            ],
            orderBy: [
                { field: 'assignedUser', ascending: true },
                { field: 'priority', ascending: false },
                { field: 'expectedDeliveryDate', ascending: false }
            ],
            page: 1,
            itemsPerPage: 100
        };

        const roundsList_result = await graphqlRequestClient.request(
            roundsListFromGQL,
            roundsListVariables
        );

        return roundsList_result;
    };

    useEffect(() => {
        const fetchAndSetRounds = async () => {
            try {
                const roundsList = await fetchRoundsList();
                const cData = roundsList?.rounds?.results;
                if (cData) {
                    const assignedToUser: Array<any> = [];
                    const notAssignedToUser: Array<any> = [];

                    cData.forEach((item: any) => {
                        const displayedText = `${item.name}${
                            item.equipment?.name ? ` - ${item.equipment.name}` : ''
                        }${
                            item.expectedDeliveryDate
                                ? ` - ${moment(item.expectedDeliveryDate).format('DD/MM/YYYY')}`
                                : ''
                        }`;
                        if (item.assignedUser === user.username) {
                            assignedToUser.push({ key: item.id, text: displayedText });
                        } else if (!item.assignedUser) {
                            notAssignedToUser.push({ key: item.id, text: displayedText });
                        }
                    });

                    setRounds([...assignedToUser, ...notAssignedToUser]);
                }
            } catch (error) {
                console.error('Error fetching rounds list:', error);
            }
        };

        fetchAndSetRounds();
    }, []);

    console.log('rounds', rounds);

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
                    extraText1
                    assignedUser
                    equipment {
                        id
                        name
                        checkPosition
                        forcePickingCheck
                    }
                    handlingUnitOutbounds {
                        id
                        name
                        status
                        statusText
                        roundId
                        handlingUnitModelId
                    }
                    roundAdvisedAddresses(
                        orderBy: [{ fieldName: "roundOrderId", ascending: true }]
                    ) {
                        id
                        roundOrderId
                        quantity
                        status
                        statusText
                        locationId
                        location {
                            id
                            name
                            barcode
                            level
                            category
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
                                description
                                genericArticleComment
                                baseUnitWeight
                                featureType
                            }
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            handlingUnitContentFeatures {
                                id
                                featureCodeId
                                featureCode {
                                    dateType
                                    id
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
                            handlingUnitContentOutbounds {
                                id
                                handlingUnitOutbound {
                                    id
                                    name
                                    carrierShippingMode {
                                        id
                                        toBePalletized
                                    }
                                }
                            }
                            roundLineId
                            roundLine {
                                lineNumber
                                articleId
                                article {
                                    id
                                    name
                                    description
                                }
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

        if (
            selectedRound?.round?.assignedUser &&
            selectedRound?.round?.assignedUser !== user.username
        ) {
            showError(
                t('messages:round-already-assigned-to', {
                    name: selectedRound?.round?.assignedUser
                })
            );
            return;
        }
        if (!selectedRound?.round?.assignedUser) {
            // if the round is not assigned, we assign it to the current user
            const updateRoundMutation = gql`
                mutation updateRound($id: String!, $input: UpdateRoundInput!) {
                    updateRound(id: $id, input: $input) {
                        id
                        status
                        assignedUser
                    }
                }
            `;
            const updateRoundVariables = {
                id: selectedRound?.round?.id,
                input: {
                    assignedUser: user.username
                }
            };

            const updateRoundResult = await graphqlRequestClient.request(
                updateRoundMutation,
                updateRoundVariables
            );
            selectedRound.round.assignedUser = updateRoundResult.updateRound.assignedUser;
            console.log('updateRoundResult', updateRoundResult);
        }

        data['round'] = selectedRound.round;

        const roundAdvisedAddresses = selectedRound?.round?.roundAdvisedAddresses?.filter(
            (raa: any) => raa.quantity != 0
        );

        if (roundAdvisedAddresses) {
            //retrieve list of proposedRoundAdvisedAddresses for a given huc
            const raaForHUC = roundAdvisedAddresses.filter(
                (raa: any) =>
                    raa.handlingUnitContentId == roundAdvisedAddresses[0].handlingUnitContentId
            );
            // if checkPosition is true, it is detail, otherwise full box
            data['proposedRoundAdvisedAddresses'] = selectedRound.round.equipment.checkPosition
                ? [raaForHUC[0]]
                : raaForHUC;
            data['pickAndPackType'] = selectedRound.round.equipment.checkPosition
                ? 'detail'
                : 'fullBox';
        }

        if (selectedRound?.round?.status == configs.ROUND_STATUS_STARTED) {
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            let roundIds = [{ id: selectedRound?.round?.id }];

            const variables = {
                functionName: 'update_rounds_status',
                event: {
                    input: {
                        rounds: roundIds,
                        status: configs.ROUND_STATUS_IN_PREPARATION
                    }
                }
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
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: { ...storedObject[`step${stepNumber}`], data },
                        customFields: [
                            { key: 'currentStep', value: stepNumber },
                            { key: 'roundNumber', value: rounds.length }
                        ]
                    });
                }
            } catch (error) {
                showError(t('messages:error-executing-function'));
                console.log('executeFunctionError', error);
            }
        } else {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [
                    { key: 'currentStep', value: stepNumber },
                    { key: 'roundNumber', value: rounds.length }
                ]
            });
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
