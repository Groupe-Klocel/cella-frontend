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
import { Select, Form } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import configs from '../../../../../common/configs.json';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectLocationByLevelReducerProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    locations: Array<any>;
    expectedLocationId?: string;
    isOriginLocation?: boolean;
    originLocationId?: any;
    defaultValue?: any;
}

export const SelectLocationByLevelForm_reducer = ({
    processName,
    stepNumber,
    buttons,
    locations,
    expectedLocationId,
    isOriginLocation,
    originLocationId
}: ISelectLocationByLevelReducerProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    const [levelsChoices, setLevelsChoices] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

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
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${enforcedPreviousStep ?? storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
        //automatically set chosenLocation when single location
        if (locations) {
            if (locations.length === 1) {
                // N.B.: in this case previous step is kept at its previous value
                if (originLocationId) {
                    if (!locations[0]?.huManagement && locations[0]?.id === originLocationId) {
                        showError(t('messages:location-origin-final-identical'));
                        onBack(storedObject.currentStep);
                        return;
                    }
                }
                if (!isOriginLocation && locations[0].status === configs.LOCATION_STATUS_DISABLED) {
                    showError(t('messages:location-disabled'));
                    onBack(storedObject.currentStep);
                    return;
                }
                if (expectedLocationId && expectedLocationId !== locations[0].id) {
                    showError(t('messages:unexpected-location'));
                    onBack(storedObject.currentStep);
                    return;
                }
                objectUpdate.object = {
                    ...storedObject[`step${stepNumber}`],
                    data: { chosenLocation: locations[0] }
                };
                const data = objectUpdate.object.data;
                if (data['chosenLocation']?.handlingUnits?.length === 1) {
                    objectUpdate.object.data.handlingUnit =
                        data['chosenLocation']?.handlingUnits[0];
                }
            } else if (storedObject.currentStep < stepNumber) {
                //check workflow direction and assign current step accordingly
                objectUpdate.object = { previousStep: storedObject.currentStep };
                objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
            }
            dispatch(objectUpdate);
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
        if (originLocationId) {
            if (
                !data['chosenLocation']?.huManagement &&
                data['chosenLocation']?.id === originLocationId
            ) {
                showError(t('messages:location-origin-final-identical'));
                onBack();
                return;
            }
        }
        if (data['chosenLocation']?.status === configs.LOCATION_STATUS_DISABLED) {
            showError(t('messages:location-disabled'));
            onBack(storedObject.currentStep);
            return;
        }
        if (expectedLocationId && expectedLocationId !== locations[0].id) {
            showError(t('messages:unexpected-scanned-item'));
            onBack(storedObject.currentStep);
            return;
        }
        if (data['chosenLocation']?.handlingUnits?.length === 1) {
            data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
        }
        storedObject[`step${stepNumber}`] = {
            ...storedObject[`step${stepNumber}`],
            data
        };
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { ...storedObject[`step${stepNumber}`], data },
            customFields: [{ key: 'currentStep', value: stepNumber }]
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
