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

export interface ISelectEquipementProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const SelectEquipmentForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectEquipementProps) => {
    const { graphqlRequestClient, user } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    const [equipments, setEquipments] = useState<any[]>([]);

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (equipments?.some((option) => option.text === camData)) {
                const roundToFind = equipments?.find((option) => option.text === camData);
                form.setFieldsValue({ rounds: roundToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, equipments]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        storedObject[`step${stepNumber}`] = { previousStep: 0 };
        storedObject.currentStep = stepNumber;
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    useEffect(() => {
        const fetchEquipmentsList = async () => {
            const equipmentsListFromGQL = gql`
                query rounds(
                    $itemsPerPage: Int
                    $filters: RoundSearchFilters
                    $advancedFilters: [RoundAdvancedSearchFilters!]
                    $functions: [JSON!]
                ) {
                    rounds(
                        itemsPerPage: $itemsPerPage
                        filters: $filters
                        advancedFilters: $advancedFilters
                        functions: $functions
                    ) {
                        count
                        results {
                            id
                            assignedUser
                            equipmentId
                            equipment {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            const equipmentsListVariables = {
                filters: { status: [400, 455] },
                advancedFilters: [
                    {
                        filter: [
                            { field: { assignedUser: ['**null**'] }, searchType: 'EQUAL' },
                            { field: { assignedUser: [user.username] }, searchType: 'EQUAL' }
                        ]
                    }
                ],
                itemsPerPage: 100
                // functions: [{ function: 'count', fields: ['equipmentId'] }]
            };

            const equipmentsList_result = await graphqlRequestClient.request(
                equipmentsListFromGQL,
                equipmentsListVariables
            );
            let equipmentsList: any[] = [];
            equipmentsList_result?.rounds?.results.forEach((item: any) => {
                if (
                    item.equipment &&
                    equipmentsList.filter((e) => e.id === item.equipmentId).length > 0
                ) {
                    equipmentsList.forEach((equipment) => {
                        if (equipment.id === item.equipmentId) {
                            equipment.count += 1;
                        }
                    });
                    return;
                }
                equipmentsList.push({
                    id: item.equipmentId,
                    name: item.equipment.name,
                    count: 1
                });
            });
            setEquipments(
                equipmentsList.map((item: any) => ({
                    key: item.id,
                    text: item.name + ' (' + item.count + ')',
                    value: item.id
                }))
            );
        };
        fetchEquipmentsList();
    }, []);

    console.log('equipments', equipments);

    //SelectRound-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const equipmentId = values.equipment;

        //check if equipment is selected
        if (!equipmentId) {
            showError(t('messages:error-message-empty-input'));
            return;
        }

        data['equipmentId'] = equipmentId;
        data['equipmentName'] = equipments.find((item) => item.key === equipmentId)?.text;

        storedObject[`step${stepNumber}`] = {
            ...storedObject[`step${stepNumber}`],
            data
        };

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
                    label={t('common:equipment')}
                    name="equipment"
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
                        {equipments?.map((option: any) => (
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
