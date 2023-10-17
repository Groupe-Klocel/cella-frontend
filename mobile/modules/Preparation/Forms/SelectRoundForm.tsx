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
import { LsIsSecured, extractGivenConfigsParams } from '@helpers';
import { Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useGetRoundsQuery, GetRoundsQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';

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
        min: 60,
        max: 460
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
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedRound = roundsList?.data?.rounds?.results.find((e: any) => {
            return e.id == values.rounds;
        });
        data['round'] = selectedRound;
        const roundAdvisedAddresses = selectedRound?.roundAdvisedAddresses
            ?.sort((a: any, b: any) => {
                return a.roundOrder - b.roundOrder;
            })
            .filter(
                (roundAdvisedAddress: any) =>
                    roundAdvisedAddress.roundLineDetail.processedQuantity === null ||
                    roundAdvisedAddress.roundLineDetail.processedQuantity <
                        roundAdvisedAddress.roundLineDetail.quantityToBeProcessed
            )
            .sort((a: any, b: any) => {
                return a.roundLineDetail.processedQuantity === null &&
                    b.roundLineDetail.processedQuantity === null
                    ? a.roundLineDetail.lineNumber - b.roundLineDetail.lineNumber
                    : a.roundLineDetail.processedQuantity === null
                    ? -1
                    : b.roundLineDetail.processedQuantity === null
                    ? 1
                    : a.roundLineDetail.processedQuantity - b.roundLineDetail.processedQuantity;
            });
        if (roundAdvisedAddresses) {
            data['proposedRoundAdvisedAddress'] = roundAdvisedAddresses[0];
        }
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
