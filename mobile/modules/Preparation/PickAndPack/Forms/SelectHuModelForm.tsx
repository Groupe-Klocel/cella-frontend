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
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import {
    GetHandlingUnitModelsQuery,
    GetRoundsQuery,
    ParametersQuery,
    useGetHandlingUnitModelsQuery,
    useGetRoundsQuery,
    useParametersQuery
} from 'generated/graphql';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectHuModelProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    defaultValue?: any;
}

export const SelectHuModelForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    defaultValue
}: ISelectHuModelProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const router = useRouter();
    const { locale } = router;
    // TYPED SAFE ALL
    const [huModels, setHuModels] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (huModels?.some((option) => option.text.startsWith(camData))) {
                const humToFind = huModels?.find((option) => option.text.startsWith(camData));
                form.setFieldsValue({ huModel: humToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, huModels]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['handlingUnitModel'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectHuModel-1: retrieve DEFAULT_DECLARATIVE_LU parameter
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

    //SelectHuModel-2: retrieve huModel choices for select
    const huModelList = useGetHandlingUnitModelsQuery<Partial<GetHandlingUnitModelsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { status: [configs.HANDLING_UNIT_MODEL_STATUS_IN_PROGRESS] },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (huModelList) {
            const newTypeTexts: Array<any> = [];
            const cData = huModelList?.data?.handlingUnitModels?.results.filter(
                (item) => item?.name !== packagingToExclude?.value
            );
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: `${item.name} - ${item.description}` });
                });
                setHuModels(newTypeTexts);
            }
        }
    }, [huModelList.data, packagingToExclude]);

    //SelectHuModel-2a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedHuModel = huModelList?.data?.handlingUnitModels?.results.find((e: any) => {
            return e.id == values.huModel;
        });
        data['handlingUnitModel'] = selectedHuModel;
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectHuModel-2b: handle back to previous step settings
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
                    label={t('common:handling-unit-model')}
                    name="huModel"
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
                        {huModels?.map((option: any) => (
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
