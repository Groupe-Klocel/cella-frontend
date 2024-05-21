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
import { WrapperForm } from '@components';
import { Button, Col, Input, Row, Form, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdateEquipmentDetailMutation,
    UpdateEquipmentDetailMutationVariables,
    UpdateEquipmentDetailMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useHandlingUnitModels,
    useCarrierShippingModeIds
} from '@helpers';

import { FormOptionType } from 'models/Models';

const { Option } = Select;

export interface ISingleItemProps {
    id: string | any;
    details: string | any;
}

export const EditEquipmentDetailForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const equipment = t('common:equipment');
    const handlingUnitModel = t('common:handling-unit-model');
    const modePreparations = t('d:preparationMode');
    const carrierShippingMode = t('d:carrierShippingMode');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');

    const [form] = Form.useForm();

    const [handlingUnitModelId, setStatusHandlingUnitModel] = useState<Array<FormOptionType>>();
    const [preparationMode, setModePreparation] = useState<Array<FormOptionType>>();
    const [carrierShippingModes, setCarrierShippingModes] = useState<any>();
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);

    const modePreparationList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'preparation_mode'
    });

    useEffect(() => {
        if (modePreparationList) {
            const newModePreparation: Array<FormOptionType> = [];

            const cData = modePreparationList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newModePreparation.push({ key: parseInt(item.code), text: item.text });
                });
                setModePreparation(newModePreparation);
            }
        }
    }, [modePreparationList.data]);

    useEffect(() => {
        if (handlingUnitModelData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            handlingUnitModelData.data.handlingUnitModels?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setStatusHandlingUnitModel(newIdOpts);
        }
    }, [handlingUnitModelData.data]);

    const carrierShippingModeData = useCarrierShippingModeIds({}, 1, 100, null);

    useEffect(() => {
        if (carrierShippingModeData) {
            const newIdOpts: { text: string; key: string }[] = [];
            carrierShippingModeData.data?.carrierShippingModes?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setCarrierShippingModes(newIdOpts);
        }
    }, [carrierShippingModeData.data]);

    const { mutate, isLoading: updateLoading } = useUpdateEquipmentDetailMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateEquipmentDetailMutation,
                _variables: UpdateEquipmentDetailMutationVariables,
                _context: any
            ) => {
                router.push(`/equipment/details/${props.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const updateEquipmentDetail = ({ id, input }: UpdateEquipmentDetailMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.equipmentName;
                delete formData.preparationModeText;
                delete formData['equipment'];
                delete formData['handlingUnitModel'];
                delete formData['stockOwner'];
                delete formData['carrierShippingMode'];
                updateEquipmentDetail({ id: props.id, input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...props.details,
            equipmentId: props.details.equipment.id,
            equipmentName: props.details.equipment.name,
            stockOwnerId: props.details.stockOwner.id
        };

        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Col>
                    <Form.Item
                        name="equipmentName"
                        label={equipment}
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item
                        label={handlingUnitModel}
                        name="handlingUnitModelId"
                        rules={[{ required: false, message: errorMessageEmptyInput }]}
                    >
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:handlingUnitModel')
                            })}`}
                        >
                            {handlingUnitModelId?.map((ed: any) => (
                                <Option key={ed.key} value={ed.key}>
                                    {ed.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item
                        label={modePreparations}
                        name="preparationMode"
                        rules={[{ required: false, message: errorMessageEmptyInput }]}
                    >
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:preparationMode')
                            })}`}
                        >
                            {preparationMode?.map((ed: any) => (
                                <Option key={ed.key} value={ed.key}>
                                    {ed.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item label={carrierShippingMode} name="carrierShippingModeId">
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:carrierShippingMode')
                            })}`}
                        >
                            {carrierShippingModes?.map((ed: any) => (
                                <Option key={ed.key} value={ed.key}>
                                    {ed.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={() => router.back()}>
                            {cancel}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={updateLoading} onClick={onFinish}>
                            {submit}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
