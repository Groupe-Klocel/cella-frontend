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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { use, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateEquipmentDetailMutation,
    CreateEquipmentDetailMutationVariables,
    CreateEquipmentDetailMutation,
    useListParametersForAScopeQuery,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useHandlingUnitModels,
    useGetCarrierShippingModes
} from '@helpers';

import { FormOptionType } from 'models/Models';

const { Option } = Select;

export interface ISingleItemProps {
    equipmentId: string | any;
    equipmentName: string | any;
    stockOwnerId: string | any;
    carrierShippingModeId: string | any;
    carrierShippingModeName: string | any;
}

export const AddEquipmentDetailForm = (props: ISingleItemProps) => {
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
    const [locationCategory, setLocationCategory] = useState<Array<FormOptionType>>();
    const [carrierShippingModes, setCarrierShippingModes] = useState<any>();
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const [carrierShippingModeIds, setcarrierShippingMode] = useState<Array<FormOptionType>>();
    const carrierShippingModeData = useGetCarrierShippingModes({}, 1, 100, null);

    const modePreparationList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'preparation_mode'
    });

    const locationCategoryList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'location_category'
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
        if (locationCategoryList.data) {
            const newLocationCategory: Array<FormOptionType> = [];
            locationCategoryList.data.listConfigsForAScope?.forEach(({ code, text }) => {
                newLocationCategory.push({ key: parseInt(code), text });
            });
            setLocationCategory(newLocationCategory);
        }
    }, [locationCategoryList.data]);

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

    const { mutate, isPending: createLoading } = useCreateEquipmentDetailMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateEquipmentDetailMutation,
                _variables: CreateEquipmentDetailMutationVariables,
                _context: any
            ) => {
                router.push(`/equipment/details/${data.createEquipmentDetail.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createEquipmentDetail = ({ input }: CreateEquipmentDetailMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.equipmentName;
                delete formData.carrierShippingModeName;
                createEquipmentDetail({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            equipmentId: props.equipmentId,
            equipmentName: props.equipmentName,
            stockOwnerId: props.stockOwnerId,
            carrierShippingModeId: props.carrierShippingModeId,
            carrierShippingModeName: props.carrierShippingModeName
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

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
                    <Form.Item label={t('d:locationCategoryText')} name="locationCategory">
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:locationCategory')
                            })}`}
                        >
                            {locationCategory?.map((ed: any) => (
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
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
                            {submit}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
