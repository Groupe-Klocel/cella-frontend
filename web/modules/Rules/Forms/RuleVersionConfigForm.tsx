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
import { HeaderContent, WrapperForm } from '@components';
import { Button, Input, Form, Select, InputNumber } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { showError, showSuccess } from '@helpers';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';

export interface ISingleItemProps {
    ruleVersionId: string | any;
    ruleVersion: number | any;
    ruleName: string | any;
    data?: any;
}

export const RuleVersionConfigForm = (props: ISingleItemProps) => {
    const initialData = props.data ?? null;
    const router = useRouter();
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const [ruleVersion, setRuleVersion] = useState<any>();
    const [disabledInput, setDisabledInput] = useState<any>(
        initialData
            ? Object.entries(initialData?.ruleLineConfigurationIn)
                  ?.filter((item: any) => {
                      const [key, value] = item;
                      return value.operator === '*';
                  })
                  .map((item: any) => {
                      const [key, value] = item;
                      return key + '_value';
                  })
            : []
    );

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const submit = t('actions:submit');
    const input = t('d:input');
    const output = t('d:output');
    const operator = '_operator';
    const value = '_value';
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const ruleVersionQuery = gql`
        query ruleVersion($id: String!) {
            ruleVersion(id: $id) {
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

    const createRuleVersionConfigQuery = gql`
        mutation createRuleVersionConfig($input: CreateRuleVersionConfigInput!) {
            createRuleVersionConfig(input: $input) {
                id
                order
            }
        }
    `;

    const updateRuleVersionConfigQuery = gql`
        mutation updateRuleVersionConfig($id: String!, $input: UpdateRuleVersionConfigInput!) {
            updateRuleVersionConfig(id: $id, input: $input) {
                id
                order
            }
        }
    `;

    useEffect(() => {
        const fetchRuleVersion = async () => {
            const ruleVersionRVariable = {
                id: props.ruleVersionId
            };
            const result = await graphqlRequestClient.request(
                ruleVersionQuery,
                ruleVersionRVariable
            );

            setRuleVersion(result.ruleVersion);
        };

        fetchRuleVersion();
    }, []);

    const ruleConfigInArray = Object.entries(ruleVersion?.ruleConfigurationIn || {}).map(
        ([name, config]) => ({
            name,
            ...(typeof config === 'object' && config !== null ? config : {})
        })
    );

    const ruleConfigOutArray = Object.entries(ruleVersion?.ruleConfigurationOut || {}).map(
        ([name, config]) => ({
            name,
            ...(typeof config === 'object' && config !== null ? config : {})
        })
    );
    const onFinish = () => {
        form.validateFields()
            .then(async () => {
                const formData = form.getFieldsValue(true);

                const input_tmp: any = {};
                const output_tmp: any = {};

                Object.entries(formData).forEach(([key, value]: any) => {
                    const [field, type] = key.split('_');
                    if (!type) return;

                    if (type === 'operator') {
                        // Input config
                        try {
                            input_tmp[field] = {
                                operator: value,
                                value: value === '*' ? null : JSON.parse(formData[`${field}_value`])
                            };
                        } catch {
                            input_tmp[field] = {
                                operator: value,
                                value: value === '*' ? null : formData[`${field}_value`]
                            };
                        }
                    } else if (type === 'value' && !formData.hasOwnProperty(`${field}_operator`)) {
                        // Output config (no operator for this field)
                        try {
                            output_tmp[field] = { value: JSON.parse(value) };
                        } catch {
                            output_tmp[field] = { value };
                        }
                    }
                });

                const currentOrder = ruleVersion?.ruleVersionConfigs
                    ? ruleVersion?.ruleVersionConfigs.length + 1
                    : 1;

                const cleanedData: any = {
                    ruleLineConfigurationIn: input_tmp,
                    ruleLineConfigurationOut: output_tmp,
                    ruleVersionId: props.ruleVersionId,
                    order: initialData?.order ?? currentOrder
                };
                if (initialData) {
                    const updateRuleVersionConfigVariable = {
                        id: initialData.id,
                        input: cleanedData
                    };
                    const updateRuleVersionConfigResult = await graphqlRequestClient.request(
                        updateRuleVersionConfigQuery,
                        updateRuleVersionConfigVariable
                    );
                    if (updateRuleVersionConfigResult) {
                        showSuccess(
                            t('messages:success-updating-data', {
                                name: t('d:rule-version-config')
                            })
                        );
                    }
                } else {
                    const createRuleVersionConfigVariable = {
                        input: cleanedData
                    };
                    const createRuleVersionConfigResult = await graphqlRequestClient.request(
                        createRuleVersionConfigQuery,
                        createRuleVersionConfigVariable
                    );
                    if (createRuleVersionConfigResult) {
                        showSuccess(
                            t('messages:success-creating-data', {
                                name: t('d:rule-version-config')
                            })
                        );
                    }
                }
                router.back();
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
                console.error('Error creating data:', err);
            });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                {
                    <HeaderContent title={input}>
                        <Form.Item>
                            {ruleConfigInArray.map((item: any) => {
                                let initialValue = null;
                                let initialOperator = null;
                                if (
                                    initialData &&
                                    initialData.ruleLineConfigurationIn &&
                                    Object.entries(initialData.ruleLineConfigurationIn).find(
                                        ([key]) => key === item.name
                                    )
                                ) {
                                    initialValue =
                                        typeof initialData.ruleLineConfigurationIn[item.name]
                                            .value === 'string'
                                            ? initialData.ruleLineConfigurationIn[item.name].value
                                            : JSON.stringify(
                                                  initialData.ruleLineConfigurationIn[item.name]
                                                      .value
                                              );
                                    initialOperator =
                                        initialData.ruleLineConfigurationIn[item.name].operator;
                                }

                                return (
                                    <>
                                        <Form.Item
                                            name={item.name + operator}
                                            label={
                                                item.description
                                                    ? item.description
                                                    : t(`d:${item.name}`)
                                            }
                                            key={item.name + operator}
                                            initialValue={initialOperator}
                                        >
                                            <Select
                                                placeholder={`${t('messages:please-select-a', {
                                                    name: t('d:operator')
                                                })}`}
                                                onChange={(changeValue) => {
                                                    if (changeValue === '*') {
                                                        setDisabledInput((prev: any) => [
                                                            ...prev,
                                                            item.name + value
                                                        ]);
                                                        form.setFieldsValue({
                                                            [item.name + value]: null
                                                        });
                                                    } else {
                                                        setDisabledInput((prev: any) =>
                                                            prev.filter(
                                                                (input: any) =>
                                                                    input !== item.name + value
                                                            )
                                                        );
                                                    }
                                                }}
                                            >
                                                <Select.Option value="=">=</Select.Option>

                                                {item.type.toUpperCase() === 'NUMBER' ? (
                                                    <>
                                                        <Select.Option value={'<'}>
                                                            {'<'}
                                                        </Select.Option>
                                                        <Select.Option value={'<='}>
                                                            {'<='}
                                                        </Select.Option>
                                                        <Select.Option value={'>'}>
                                                            {'>'}
                                                        </Select.Option>
                                                        <Select.Option value={'>='}>
                                                            {'>='}
                                                        </Select.Option>
                                                        <Select.Option value={'<>'}>
                                                            {'<>'}
                                                        </Select.Option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Select.Option value={'!='}>
                                                            {'!='}
                                                        </Select.Option>
                                                        <Select.Option value="startswith">
                                                            startswith
                                                        </Select.Option>
                                                        <Select.Option value="endswith">
                                                            endswith
                                                        </Select.Option>
                                                        <Select.Option value="contains">
                                                            contains
                                                        </Select.Option>
                                                    </>
                                                )}

                                                <Select.Option value="*">*</Select.Option>
                                                <Select.Option value="in">in</Select.Option>
                                                <Select.Option value="not in">not in</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            name={item.name + value}
                                            key={item.name + value}
                                            initialValue={initialValue}
                                        >
                                            {item.type.toUpperCase() === 'NUMBER' ? (
                                                <InputNumber
                                                    disabled={disabledInput.includes(
                                                        item.name + value
                                                    )}
                                                />
                                            ) : (
                                                <Input
                                                    disabled={disabledInput.includes(
                                                        item.name + value
                                                    )}
                                                />
                                            )}
                                        </Form.Item>
                                    </>
                                );
                            })}
                        </Form.Item>
                    </HeaderContent>
                }
            </Form>

            <Form form={form} layout="vertical" scrollToFirstError>
                {
                    <HeaderContent title={output}>
                        <Form.Item>
                            {ruleConfigOutArray.map((item: any) => {
                                const initialValue =
                                    initialData &&
                                    initialData.ruleLineConfigurationOut &&
                                    Object.entries(initialData.ruleLineConfigurationOut).find(
                                        ([key]) => key === item.name
                                    )
                                        ? typeof initialData.ruleLineConfigurationOut[item.name]
                                              .value === 'string'
                                            ? initialData.ruleLineConfigurationOut[item.name].value
                                            : JSON.stringify(
                                                  initialData.ruleLineConfigurationOut[item.name]
                                                      .value
                                              )
                                        : null;
                                return (
                                    <Form.Item
                                        name={item.name + value}
                                        label={
                                            item.description
                                                ? item.description
                                                : t(`d:${item.name}`)
                                        }
                                        key={item.name + value}
                                        initialValue={initialValue}
                                    >
                                        {item.type.toUpperCase() === 'NUMBER' ? (
                                            <InputNumber />
                                        ) : (
                                            <Input />
                                        )}
                                    </Form.Item>
                                );
                            })}
                        </Form.Item>
                    </HeaderContent>
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
