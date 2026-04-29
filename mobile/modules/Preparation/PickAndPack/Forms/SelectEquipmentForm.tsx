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
import { showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectEquipementProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
}

export const SelectEquipmentForm = ({
    processName,
    stepNumber,
    buttons
}: ISelectEquipementProps) => {
    const { graphqlRequestClient, user } = useAuth();
    const { configs } = useAppState();
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

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

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const roundStatusStarted = parseInt(findCodeByScope(configs, 'round_status', 'Started'));
        const roundStatusInPreparation = parseInt(
            findCodeByScope(configs, 'round_status', 'In preparation')
        );

        const pickAndPackType = parseInt(findCodeByScope(configs, 'round_type', 'Pick And Pack'));

        return {
            roundStatusStarted,
            roundStatusInPreparation,
            pickAndPackType
        };
    }, [configs]);

    //Pre-requisite: initialize current step
    useEffect(() => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
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
                filters: {
                    status: [
                        configsParamsCodes.roundStatusStarted,
                        configsParamsCodes.roundStatusInPreparation
                    ],
                    type: configsParamsCodes.pickAndPackType
                },
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
