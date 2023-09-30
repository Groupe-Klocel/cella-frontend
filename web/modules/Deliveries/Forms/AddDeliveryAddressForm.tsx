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
import { Button, Input, Form, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import { FormOptionType } from 'models/Models';
import {
    CreateDeliveryAddressMutation,
    CreateDeliveryAddressMutationVariables,
    useCreateDeliveryAddressMutation,
    useListConfigsForAScopeQuery
} from 'generated/graphql';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export interface ISingleItemProps {
    deliveryId: string | any;
    deliveryName: string | any;
}

export const AddDeliveryAddressForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [category, setCategory] = useState<Array<FormOptionType>>();

    // PARAMETER : category
    const categoryList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'third_party_address_category'
    });
    useEffect(() => {
        if (categoryList) {
            const newCategory: Array<FormOptionType> = [];

            const parameters = categoryList?.data?.listConfigsForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newCategory.push({ key: parseInt(item.code), text: item.text });
                });
                setCategory(newCategory);
            }
        }
    }, [categoryList.data]);

    const submit = t('actions:submit');

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //CREATE delivery address
    const { mutate, isLoading: createLoading } = useCreateDeliveryAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateDeliveryAddressMutation,
                _variables: CreateDeliveryAddressMutationVariables,
                _context: any
            ) => {
                router.push(`/deliveries/${props.deliveryId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createDeliveryAddress = ({ input }: CreateDeliveryAddressMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.deliveryName;
                createDeliveryAddress({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            deliveryName: props.deliveryName,
            deliveryId: props.deliveryId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:deliveryName')} name="deliveryName">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:category')}
                    name="category"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:category')
                        })}`}
                    >
                        {category?.map((ss: any) => (
                            <Option key={ss.key} value={ss.key}>
                                {ss.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:contactName')} name="contactName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactCivility')} name="contactCivility">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactFirstName')} name="contactFirstName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactLastName')} name="contactLastName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactPhone')} name="contactPhone">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactMobile')} name="contactMobile">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactEmail')} name="contactEmail">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityName')} name="entityName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityAddress1')} name="entityAddress1">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityAddress2')} name="entityAddress2">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityAddress3')} name="entityAddress3">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityStreetNumber')} name="entityStreetNumber">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityPostCode')} name="entityPostCode">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityCity')} name="entityCity">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityState')} name="entityState">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityDistrict')} name="entityDistrict">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityCountry')} name="entityCountry">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityCountryCode')} name="entityCountryCode">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityVatCode')} name="entityVatCode">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityEoriCode')} name="entityEoriCode">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityAccountingCode')} name="entityAccountingCode">
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:entityIdentificationNumber')}
                    name="entityIdentificationNumber"
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityLanguage')} name="entityLanguage">
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:entityDeliveryPointNumber')}
                    name="entityDeliveryPointNumber"
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:reference1')} name="reference1">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:reference2')} name="reference2">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:reference3')} name="reference3">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={createLoading} onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
