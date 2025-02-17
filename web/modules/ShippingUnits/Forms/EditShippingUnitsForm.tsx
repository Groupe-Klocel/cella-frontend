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
import { checkUndefinedValues, showError, showInfo, showSuccess } from '@helpers';
import { Form, Input, Select, InputNumber, Button, Checkbox } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    SimpleGetAllHandlingUnitModelsListQuery,
    UpdateHandlingUnitOutboundByIdMutation,
    UpdateHandlingUnitOutboundByIdMutationVariables,
    useSimpleGetAllHandlingUnitModelsListQuery,
    useUpdateHandlingUnitOutboundByIdMutation
} from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { gql } from 'graphql-request';

export type EditShippingUnitsFormProps = {
    shippingUnitId: string;
    details: any;
    reload: any;
};
export const EditShippingUnitsForm: FC<EditShippingUnitsFormProps> = ({
    shippingUnitId,
    details,
    reload
}: EditShippingUnitsFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();
    const [handlingUnitModel, setHandlingUnitModel] = useState<any>([]);
    let oldTheoriticalWeight: number = details?.theoriticalWeight;

    async function getHandlingUnitModelsWithoutFinished() {
        const query = gql`
            query handlingUnitModelsWithoutFinished(
                $advancedFilters: [HandlingUnitModelAdvancedSearchFilters!]
                $itemsPerPage: Int!
            ) {
                handlingUnitModels(advancedFilters: $advancedFilters, itemsPerPage: $itemsPerPage) {
                    count
                    results {
                        id
                        status
                        name
                        weight
                    }
                }
            }
        `;

        const variables = {
            advancedFilters: [
                { filter: [{ searchType: 'DIFFERENT', field: { status: 2000 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { status: 1005 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { category: 71210 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { category: 71205 } }] },
                { filter: [{ searchType: 'DIFFERENT', field: { category: 71200 } }] }
            ],
            itemsPerPage: 100000
        };

        const result = await graphqlRequestClient.request(query, variables);

        setHandlingUnitModel(result.handlingUnitModels.results);
    }

    useEffect(() => {
        getHandlingUnitModelsWithoutFinished();
    }, []);

    const { mutate, isPending: updateLoading } = useUpdateHandlingUnitOutboundByIdMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateHandlingUnitOutboundByIdMutation,
                _variables: UpdateHandlingUnitOutboundByIdMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-updated'));
                router.push(`/shipping-units/${shippingUnitId}`);
            },
            onError: (err) => {
                console.log(err);
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateHUO = ({ id, input }: UpdateHandlingUnitOutboundByIdMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                //Delete CarrierBox if packaging or theoritical Weight is updated
                if (
                    details.handlingUnitModel != formData.handlingUnitModel ||
                    details.theoriticalWeight != formData.theoriticalWeight
                ) {
                    formData.carrierBox = null;
                }

                //end part to update priorities on foreigners
                delete formData['stockOwner'];
                delete formData['handlingUnitModel'];
                delete formData['handlingUnit'];
                delete formData['carrier'];
                delete formData['preparationModeText'];
                delete formData['load'];
                delete formData['delivery'];
                delete formData['statusText'];
                delete formData['round'];

                updateHUO({ id: shippingUnitId, input: formData });
                reload();
            })
            .catch((err) => {
                console.log(err);
                showError(t('error-update-data'));
            });
    };

    const updateTheoriticalWeight = () => {
        if (handlingUnitModel && Array.isArray(handlingUnitModel)) {
            const formData = form.getFieldsValue(true);
            const oldWeight = handlingUnitModel.find(
                (obj: any) => obj.id === details.handlingUnitModelId
            )?.weight;
            const newWeight = handlingUnitModel.find(
                (obj: any) => obj.id === formData.handlingUnitModelId
            )?.weight;
            if (oldWeight && newWeight) {
                form.setFieldsValue({
                    theoriticalWeight: oldTheoriticalWeight - oldWeight + newWeight
                });
            } else {
                showError(t('messages:error-update-theoriticalWeight'));
            }
        }
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwner: details?.stockOwner?.name,
            delivery: details?.delivery?.name,
            carrier: details?.carrier?.name,
            load: details?.load?.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
    }, [details]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('common:name')} name="name">
                    <Input disabled />
                </Form.Item>
                <Form.Item name="stockOwner" label={t('common:stock-owner')}>
                    <Select disabled></Select>
                </Form.Item>
                <Form.Item name="delivery" label={t('common:delivery')}>
                    <Select disabled></Select>
                </Form.Item>
                <Form.Item name="carrier" label={t('d:carrier')}>
                    <Select disabled></Select>
                </Form.Item>
                <Form.Item name="carrierService" label={t('d:carrierService')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="preparationModeText" label={t('d:preparationMode')}>
                    <Select disabled></Select>
                </Form.Item>
                <Form.Item name="handlingUnitModelId" label={t('d:handlingUnitModel')}>
                    <Select onChange={(value) => updateTheoriticalWeight()}>
                        {handlingUnitModel?.map((hum: any) => (
                            <Select.Option key={hum.id} value={hum.id}>
                                {hum.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="carrierBox" label={t('d:carrierBox')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="load" label={t('d:load')}>
                    <Select disabled></Select>
                </Form.Item>
                <Form.Item label={t('d:theoriticalWeight')} name="theoriticalWeight">
                    <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
                <Form.Item name="intermediateWeight1" label={t('d:intermediateWeight1')}>
                    <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
                <Form.Item name="intermediateWeight2" label={t('d:intermediateWeight2')}>
                    <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
                <Form.Item name="finalWeight" label={t('d:finalWeight')}>
                    <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
                <Form.Item name="toBeChecked">
                    <Checkbox checked={details?.toBeChecked} disabled>
                        {t('d:toBeChecked')}
                    </Checkbox>
                </Form.Item>
                <Form.Item label={t('common:comment')} name="comment">
                    <TextArea></TextArea>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            </div>
        </WrapperForm>
    );
};
