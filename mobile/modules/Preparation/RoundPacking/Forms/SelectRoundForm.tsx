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
import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { LsIsSecured, extractGivenConfigsParams, showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import {
    GetAllBoxesQuery,
    GetHandlingUnitsQuery,
    ParametersQuery,
    SimpleGetRoundsQuery,
    useGetAllBoxesQuery,
    useGetHandlingUnitsQuery,
    useParametersQuery,
    useSimpleGetRoundsQuery
} from 'generated/graphql';
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
        min: configs.ROUND_STATUS_TO_BE_VERIFIED,
        max: configs.ROUND_STATUS_TO_BE_CHECKED
    });

    const roundsList = useSimpleGetRoundsQuery<Partial<SimpleGetRoundsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { status: configsToFilterOn },
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

    //SelectRound-1b: Retrieve HU from round
    const [huName, setHuName] = useState<any>();
    const [proposedHU, setProposedHU] = useState<any>();

    const roundHU = useGetHandlingUnitsQuery<Partial<GetHandlingUnitsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { name: huName },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (roundHU) {
            // Filter handlingUnitContents with quantity > 0
            const filteredContents =
                roundHU?.data?.handlingUnits?.results[0].handlingUnitContents.filter(
                    (huc: any) => huc.quantity > 0
                );

            // Create a new roundHU object with the filtered contents
            const roundHUWithFilteredContents = {
                ...roundHU?.data?.handlingUnits?.results[0],
                handlingUnitContents: filteredContents
            };
            setProposedHU(roundHUWithFilteredContents);
        }
    }, [roundHU.data]);

    //SelectRound-2: retrieve DEFAULT_DECLARATIVE_LU parameter
    const [packagingToExclude, setPackagingToExclude] = useState<any>();
    const defaultDeclarativeParameter = useParametersQuery<Partial<ParametersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { scope: ['cubing'], code: ['DEFAULT_DECLARATIVE_LU'] }
        }
    );

    useEffect(() => {
        if (defaultDeclarativeParameter) {
            const defaultDeclarativeData =
                defaultDeclarativeParameter?.data?.parameters?.results[0];
            setPackagingToExclude(defaultDeclarativeData);
        }
    }, [defaultDeclarativeParameter.data]);

    //SelectRound-3: retrieve related handlingUnitOutbound if any
    const [roundId, setRoundId] = useState<any>();
    const [existingHUO, setExistingHUO] = useState<any>();

    const HUOconfigsToFilterOn = extractGivenConfigsParams(
        configs,
        'handling_unit_outbound_status',
        {
            min: 480,
            max: 500
        }
    );

    const finalHUO = useGetAllBoxesQuery<Partial<GetAllBoxesQuery>, Error>(graphqlRequestClient, {
        filters: { status: HUOconfigsToFilterOn, roundId: roundId },
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (finalHUO) {
            const huData = finalHUO?.data?.handlingUnitOutbounds?.results.filter(
                (item) => item?.handlingUnitModel?.name !== packagingToExclude?.value
            )[0];

            setExistingHUO(huData);
        }
    }, [finalHUO.data]);

    //SelectRound-4a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const query = gql`
            query return($id: String!) {
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
                            quantity
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
                                stockOwnerId
                                deliveryId
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
        data['roundHU'] = proposedHU;
        data['existingFinalHUO'] = existingHUO;
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
        if (selectedRound?.round?.status !== configs.ROUND_STATUS_PACKING_IN_PROGRESS) {
            try {
                const updateRoundMutation = gql`
                    mutation updateRound($id: String!, $input: UpdateRoundInput!) {
                        updateRound(id: $id, input: $input) {
                            id
                            status
                            statusText
                        }
                    }
                `;
                const updateRoundVariables = {
                    id: selectedRound?.round?.id,
                    input: {
                        status: configs.ROUND_STATUS_PACKING_IN_PROGRESS
                    }
                };
                const updateRoundResponse = await graphqlRequestClient.request(
                    updateRoundMutation,
                    updateRoundVariables
                );
            } catch (error) {
                console.log(error);
                showError(t('messages:round-update-failed'));
            }
        }
    };

    //SelectRound-4b: handle back to previous step settings
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
                        onChange={(e: any) => {
                            const selectedOption = rounds?.find((option: any) => option.key === e);
                            if (selectedOption) {
                                setHuName(selectedOption.text);
                                setRoundId(selectedOption.key);
                            }
                        }}
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
