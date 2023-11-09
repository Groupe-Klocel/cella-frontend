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
import {
    LsIsSecured,
    extractGivenConfigsParams,
    removeDuplicatesAndSort,
    showError
} from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    useGetRoundsQuery,
    GetRoundsQuery,
    useGetHandlingUnitContentFeaturesQuery,
    GetHandlingUnitContentFeaturesQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
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
    const [husWhereFeature, setHusWhereFeature] = useState<Array<any>>();

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (rounds?.some((option) => option.text === camData)) {
                form.setFieldsValue({ scannedRound: camData });
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

    //SelectRound1: retrieve handlingUnits where some features are NOK
    const featuresList = useGetHandlingUnitContentFeaturesQuery<
        Partial<GetHandlingUnitContentFeaturesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: null,
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (featuresList) {
            const HUnames: Array<any> = [];
            const cData = featuresList?.data?.handlingUnitContentFeatures?.results;
            if (cData) {
                cData.forEach((item) => {
                    HUnames.push(item.handlingUnitContent.handlingUnit.name);
                });
                setHusWhereFeature(removeDuplicatesAndSort(HUnames));
            }
        }
    }, [featuresList.data]);

    const roundConfigsToFilterOn = extractGivenConfigsParams(configs, 'round_status', {
        include: ['to_be_verified', 'to_be_packed']
    });

    const roundsList = useGetRoundsQuery<Partial<GetRoundsQuery>, Error>(graphqlRequestClient, {
        filters: { name: husWhereFeature, status: roundConfigsToFilterOn },
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

    //SelectRound-3a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedRound = roundsList?.data?.rounds?.results.find((e: any) => {
            return e.id == values.rounds;
        });
        data['round'] = selectedRound;
        const features = featuresList?.data?.handlingUnitContentFeatures?.results.filter(
            (e: any) => {
                return e.handlingUnitContent.handlingUnit.name == selectedRound?.name;
            }
        );

        data['substitutableFeatures'] = features;
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
                    label={t('common:rounds')}
                    name="rounds"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.text === form.getFieldValue('scannedRound') ||
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
