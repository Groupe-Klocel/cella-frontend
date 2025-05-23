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
import { GraphQLResponseType, useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess } from '@helpers';
import { gql } from 'graphql-request';

export interface ISingleItemProps {
    rule: any;
    initialValues?: any;
    type: string;
    ruleVersionToUpdate: any;
}

export const ConfigRuleForm = (props: ISingleItemProps) => {
    const rule = props.rule;
    const initialValues = props.initialValues;
    const configType = props.type;
    const ruleVersionToUpdate = props?.ruleVersionToUpdate;
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    //const paramNames: any[] = [];
    const parameterName = t('d:parameterName');
    const description = t('d:description');
    const type = t('d:typeText');
    const validationRule = t('d:validationRule');
    const submit = t('actions:submit');
    let lastTransactionId: string | null = null;
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const updateRuleVersionQuery = gql`
        mutation updateRuleVersion($id: String!, $input: UpdateRuleVersionInput!) {
            updateRuleVersion(id: $id, input: $input) {
                id
                ruleConfigurationIn
                ruleConfigurationOut
                ruleVersionConfigs {
                    id
                    order
                }
            }
        }
    `;

    const onFinish = () => {
        form.validateFields()
            .then(async () => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                const generateTransactionId = gql`
                    mutation {
                        generateTransactionId
                    }
                `;
                const transactionIdResponse: GraphQLResponseType =
                    await graphqlRequestClient.request(generateTransactionId);

                lastTransactionId = transactionIdResponse.generateTransactionId;
                const prevConfig = ruleVersionToUpdate['ruleConfiguration' + configType] || {};
                // Create a shallow copy of prevConfig without the key initialValues.parameterName
                let filteredConfig = prevConfig;
                if (initialValues && initialValues.parameterName) {
                    const { [initialValues.parameterName]: _, ...rest } = prevConfig;
                    filteredConfig = rest;
                }
                const newConfig = {
                    ...filteredConfig,
                    [formData.parameterName]: {
                        description: formData.description,
                        type: formData.type,
                        validationRule: formData.validationRule
                    }
                };
                // to avoid back security
                if (initialValues && initialValues.parameterName !== formData.parameterName) {
                    await graphqlRequestClient.request(updateRuleVersionQuery, {
                        id: ruleVersionToUpdate.id,
                        input: {
                            ['ruleConfiguration' + configType]: null,
                            lastTransactionId
                        }
                    });
                }

                const updateRuleVersionVariables = {
                    id: ruleVersionToUpdate.id,
                    input: { ['ruleConfiguration' + configType]: newConfig, lastTransactionId }
                };

                return graphqlRequestClient
                    .request(updateRuleVersionQuery, updateRuleVersionVariables)
                    .then((res: any) => {
                        showSuccess(t('messages:success-creating-data'));
                        router.push('/rules/version/' + rule.id);
                    })
                    .catch((err: any) => {
                        throw err; // propagate to outer catch
                    });
            })
            .catch(async (err) => {
                showError(t('messages:error-creating-data'));
                console.log('err', err);
                console.log('lastTransactionId', lastTransactionId);
                if (lastTransactionId) {
                    const rollbackTransaction = gql`
                        mutation rollback($transactionId: String!) {
                            rollbackTransaction(transactionId: $transactionId)
                        }
                    `;
                    const rollbackVariable = {
                        transactionId: lastTransactionId
                    };
                    await graphqlRequestClient.request(rollbackTransaction, rollbackVariable);
                }
            });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                {
                    <Form.Item>
                        <Form.Item
                            label={parameterName}
                            name="parameterName"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                            initialValue={initialValues?.parameterName}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label={description}
                            name="description"
                            initialValue={initialValues?.description}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label={type}
                            name="type"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                            initialValue={initialValues?.type}
                        >
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:type')
                                })}`}
                            >
                                <option value="Text">Text</option>
                                <option value="Number">Number</option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label={validationRule}
                            name="validationRule"
                            initialValue={initialValues?.validationRule}
                        >
                            <Input />
                        </Form.Item>
                    </Form.Item>
                }
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
