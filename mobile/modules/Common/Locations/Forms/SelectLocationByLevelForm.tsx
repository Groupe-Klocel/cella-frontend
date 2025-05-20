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
import { LsIsSecured, showError } from '@helpers';
import { Select, Form, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../../common/configs.json';

export interface ISelectLocationByLevelProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    locations: Array<any>;
    roundsCheck?: boolean;
    isOriginLocation?: boolean;
    originLocationId?: any;
}

export const SelectLocationByLevelForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    locations,
    roundsCheck,
    isOriginLocation,
    originLocationId
}: ISelectLocationByLevelProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [levelsChoices, setLevelsChoices] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();
    const [popModal, setPopModal] = useState(0);

    const query = gql`
        query roundAdvisedAddresses($locationId: String!) {
            roundAdvisedAddresses(
                filters: {
                    location_id: $locationId
                    round_Status: [400, 450, 455]
                    round_Category: 71210
                }
            ) {
                count
                results {
                    id
                }
            }
        }
    `;

    useEffect(() => {
        if (camData) {
            if (levelsChoices?.some((option) => option.text === camData)) {
                const levelToFind = levelsChoices?.find((option) => option.text === camData);
                form.setFieldsValue({ level: levelToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, levelsChoices]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //SelectLocationByLevel-2b: handle back to previous step settings
    const onBack = (enforcedPreviousStep?: number) => {
        setTriggerRender(!triggerRender);
        const previousStep =
            enforcedPreviousStep ?? storedObject[`step${stepNumber}`]?.previousStep ?? 0;
        for (let i = previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }

        storedObject.currentStep = previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set chosenLocation when single location
        if (locations) {
            if (locations.length === 1) {
                // N.B.: in this case previous step is kept at its previous value
                const data: { [label: string]: any } = {};
                data['chosenLocation'] = locations[0];
                const variables = {
                    locationId: data['chosenLocation'].id
                };
                const nextStep = () => {
                    if (data['chosenLocation']?.handlingUnits?.length === 1) {
                        data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
                    }
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storage.set(process, JSON.stringify(storedObject));
                    setTriggerRender(!triggerRender);
                };
                if (!roundsCheck) {
                    nextStep();
                }
                if (popModal === 2 && roundsCheck) {
                    graphqlRequestClient.request(query, variables).then((result: any) => {
                        if (result.roundAdvisedAddresses.count > 0) {
                            Modal.confirm({
                                title: t('messages:round-planned-for-location'),
                                onOk: () => nextStep(),
                                onCancel: () => onBack(),
                                okText: t('messages:confirm'),
                                cancelText: t('messages:cancel')
                            });
                        } else {
                            nextStep();
                        }
                    });
                }
                setPopModal((prev) => prev + 1);
                if (originLocationId) {
                    if (!locations[0]?.huManagement && locations[0]?.id === originLocationId) {
                        showError(t('messages:location-origin-final-identical'));
                        onBack(storedObject.currentStep);
                    }
                }
                if (!isOriginLocation && locations[0].status === configs.LOCATION_STATUS_DISABLED) {
                    showError(t('messages:location-disabled'));
                    onBack(storedObject.currentStep);
                }
            } else if (storedObject.currentStep < stepNumber) {
                //check workflow direction and assign current step accordingly
                storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
                storedObject.currentStep = stepNumber;
            }
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [locations]);

    //SelectLocationByLevel-1: retrieve levels choices for select
    useEffect(() => {
        const newIdOpts: Array<any> = [];
        locations?.forEach((e: any) => {
            newIdOpts.push({ text: e.level!, key: e.level! });
        });
        function compare(a: any, b: any) {
            if (a.key < b.key) {
                return -1;
            }
            if (a.key > b.key) {
                return 1;
            }
            return 0;
        }
        newIdOpts.sort(compare);
        setLevelsChoices(newIdOpts);
    }, [locations]);

    //SelectLocationByLevel-2a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        data['chosenLocation'] = locations?.find((e: any) => {
            return e.level == values.level;
        });
        const variables = {
            locationId: data['chosenLocation'].id
        };
        const nextStep = () => {
            if (data['chosenLocation']?.handlingUnits?.length === 1) {
                data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
            }
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        };
        if (!roundsCheck) {
            nextStep();
        } else {
            graphqlRequestClient.request(query, variables).then((result: any) => {
                if (result.roundAdvisedAddresses.count > 0) {
                    Modal.confirm({
                        title: t('messages:round-planned-for-location'),
                        onOk: () => nextStep(),
                        onCancel: () => onBack(),
                        okText: t('messages:confirm'),
                        cancelText: t('messages:cancel')
                    });
                } else {
                    nextStep();
                }
            });
        }
        if (originLocationId) {
            if (
                !data['chosenLocation']?.huManagement &&
                data['chosenLocation']?.id === originLocationId
            ) {
                showError(t('messages:location-origin-final-identical'));
                onBack();
            }
        }
        if (data['chosenLocation']?.status === configs.LOCATION_STATUS_DISABLED) {
            showError(t('messages:location-disabled'));
            onBack(storedObject.currentStep);
        }
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
                    label={t('common:level')}
                    name="level"
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
                        {levelsChoices?.map((option: any) => (
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
