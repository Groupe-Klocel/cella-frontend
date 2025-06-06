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
import { Button, Input, Form, InputNumber, Select } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateRuleMutation,
    CreateRuleMutationVariables,
    CreateRuleMutation
} from 'generated/graphql';
import { showError, showSuccess } from '@helpers';
import configs from '../../../../common/configs.json';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';

export const AddRuleForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [stockOwnerList, setStockOwnerList] = useState<any[]>([]);

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const name = t('common:name');
    const status = t('d:status');
    const description = t('d:description');
    const stockOwner = t('common:stock-owner');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //CREATE rule version
    const { mutate, isPending: createLoading } = useCreateRuleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateRuleMutation,
                _variables: CreateRuleMutationVariables,
                _context: any
            ) => {
                router.push(`/rules`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
                console.error('Error creating rule:', err);
            }
        }
    );

    const createRule = ({ input }: CreateRuleMutationVariables) => {
        mutate({ input });
    };

    useEffect(() => {
        const fetchStockOwners = async () => {
            const query = gql`
                query {
                    stockOwners(filters: {}) {
                        results {
                            id
                            name
                        }
                    }
                }
            `;
            const queryInfo: any = await graphqlRequestClient.request(query);
            setStockOwnerList(queryInfo.stockOwners.results);
        };
        fetchStockOwners();
    }, []);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else

                form.setFieldsValue({ status: configs.RULE_STATUS_IN_PROGRESS });
                const formData = form.getFieldsValue(true);

                createRule({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={name} name="name">
                    <Input />
                </Form.Item>
                <Form.Item label={description} name="description">
                    <Input />
                </Form.Item>
                <Form.Item label={stockOwner} name="stockOwnerId">
                    <Select allowClear>
                        {stockOwnerList?.map((item: any) => (
                            <Select.Option key={item.id} value={item.id}>
                                {item.name}
                            </Select.Option>
                        ))}
                    </Select>
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
