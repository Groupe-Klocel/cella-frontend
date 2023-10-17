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
import { Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useGetRoundsQuery, GetRoundsQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
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
    const router = useRouter();
    const { locale } = router;

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
        min: configs.ROUND_STATUS_ESTIMATED,
        max: configs.ROUND_STATUS_TO_BE_PACKED
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

    //SelectRound-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedRound = roundsList?.data?.rounds?.results.find((e: any) => {
            return e.id == values.rounds;
        });
        data['round'] = selectedRound;
        const roundAdvisedAddresses = selectedRound?.roundAdvisedAddresses?.sort(
            (a: any, b: any) => {
                return a.roundOrderId - b.roundOrderId;
            }
        );

        if (roundAdvisedAddresses) {
            data['proposedRoundAdvisedAddress'] = roundAdvisedAddresses[0];
        }

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: 'K_updateRoundsStatus',
            event: { input: { rounds: rounds, status: configs.ROUND_STATUS_IN_PREPARATION } }
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
                console.log('Backend_message', launchRoundsResult.executeFunction.output.output);
            } else {
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
                storage.set(process, JSON.stringify(storedObject));
                setTriggerRender(!triggerRender);
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
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
            >
                <StyledFormItem
                    label={t('common:rounds')}
                    name="rounds"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select style={{ height: '20px', marginBottom: '5px' }}>
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
