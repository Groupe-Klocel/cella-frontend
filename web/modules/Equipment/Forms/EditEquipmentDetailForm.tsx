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
    useListParametersForAScopeQuery,
    useGetEquipmentDetailByIdQuery,
    GetEquipmentDetailByIdQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useHandlingUnitModels,
    useGetCarrierShippingModes,
    checkUndefinedValues
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
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');
    const carrierShippingMode = t('common:carrier-shipping-mode');

    const [form] = Form.useForm();

    const [handlingUnitModelId, setStatusHandlingUnitModel] = useState<Array<FormOptionType>>();
    const [preparationMode, setModePreparation] = useState<Array<FormOptionType>>();
    const [carrierShippingModes, setCarrierShippingModes] = useState<any>();
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const [carrierShippingModeIds, setcarrierShippingMode] = useState<Array<FormOptionType>>();
    const carrierShippingModeData = useGetCarrierShippingModes({}, 1, 100, null, router.locale);

    const modePreparationList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'preparation_mode'
    });

    const { isLoading, data, error } = useGetEquipmentDetailByIdQuery<
        GetEquipmentDetailByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: props.details.id
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

    useEffect(() => {
        if (carrierShippingModeData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            carrierShippingModeData.data.carrierShippingModes?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setcarrierShippingMode(newIdOpts);
        }
    }, [carrierShippingModeData.data]);

    const { mutate, isPending: updateLoading } = useUpdateEquipmentDetailMutation<Error>(
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
                checkUndefinedValues(form);
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
            equipmentId: props.details.equipmentId,
            equipmentName: props.details.equipment.name,
            stockOwnerId: props.details.stockOwnerId,
            carrierShippingModeId: props.details.carrierShippingModeId
        };

        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        delete tmp_details['carrierShippingMode'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [updateLoading, props.details]);

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
                            allowClear
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
                            allowClear
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
                    <Form.Item
                        label={carrierShippingMode}
                        name="carrierShippingModeId"
                        rules={[{ required: false, message: errorMessageEmptyInput }]}
                    >
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:shippingMode')
                            })}`}
                            allowClear
                        >
                            {carrierShippingModeIds?.map((ed: any) => (
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
