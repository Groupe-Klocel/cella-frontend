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
import { LsIsSecured, extractGivenConfigsParams, showError } from '@helpers';
import { Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import {
    GetAllBoxesQuery,
    GetHandlingUnitsQuery,
    GetRoundsQuery,
    ParametersQuery,
    useGetAllBoxesQuery,
    useGetHandlingUnitsQuery,
    useGetRoundsQuery,
    useParametersQuery
} from 'generated/graphql';
import { gql } from 'graphql-request';

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

    const roundsList = useGetRoundsQuery<Partial<GetRoundsQuery>, Error>(graphqlRequestClient, {
        filters: { status: configsToFilterOn },
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

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
        const selectedRound = roundsList?.data?.rounds?.results.find((e: any) => {
            return e.id == values.rounds;
        });
        data['round'] = selectedRound;
        data['roundHU'] = proposedHU;
        data['existingFinalHUO'] = existingHUO;
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
        if (selectedRound?.status !== configs.ROUND_STATUS_PACKING_IN_PROGRESS) {
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
                    id: selectedRound?.id,
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
                    >
                        {rounds?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
