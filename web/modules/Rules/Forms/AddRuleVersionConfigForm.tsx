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
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    CreateRuleVersionConfigMutation,
    CreateRuleVersionConfigMutationVariables,
    InputMaybe,
    Scalars,
    useCreateRuleVersionConfigMutation
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useRuleVersionIds,
    useRuleVersionConfigIds
} from '@helpers';

export interface ISingleItemProps {
    ruleVersionId: string | any;
    ruleVersion: number | any;
    ruleName: string | any;
}

export const AddRuleVersionConfigForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [currentOperator, setCurrentOperator] = useState<String>();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const submit = t('actions:submit');
    const input = t('d:input');
    const output = t('d:output');
    const signSup = '>';
    const signInf = '<';
    const signSupEqual = '>=';
    const signInfEqual = '<=';
    const signDifferentNumber = '<>';
    const signDifferenString = '!=';
    const operator = '_operator';
    const value = '_value';
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const ruleVersion = useRuleVersionIds({ id: props.ruleVersionId }, 1, 100, null);

    const ruleConfigIn = ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationIn;

    let ruleConfigInArray = [];
    if (ruleConfigIn) {
        ruleConfigInArray = Object.keys(ruleConfigIn).map((key) => ({
            name: key,
            ...ruleConfigIn[key]
        }));
    }

    const ruleConfigOut = ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationOut;

    let ruleConfigOutArray = [];
    if (ruleConfigOut) {
        ruleConfigOutArray = Object.keys(ruleConfigOut).map((key) => ({
            name: key,
            ...ruleConfigOut[key]
        }));
    }

    const ruleVersionConfigs = useRuleVersionConfigIds(
        { ruleVersionId: props.ruleVersionId },
        1,
        100,
        null
    );

    let currentOrder = 0;
    if (ruleVersionConfigs.data?.ruleVersionConfigs?.count) {
        currentOrder = ruleVersionConfigs.data?.ruleVersionConfigs?.count + 1;
    } else {
        currentOrder = 1;
    }

    //CREATE rule version
    const { mutate, isPending: createLoading } = useCreateRuleVersionConfigMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateRuleVersionConfigMutation,
                _variables: CreateRuleVersionConfigMutationVariables,
                _context: any
            ) => {
                router.push(`/rules/version/${props.ruleVersionId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );
    const createRuleVersionConfig = ({ input }: CreateRuleVersionConfigMutationVariables) => {
        mutate({
            input
        });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                const ruleLineConfiguration = formData;

                const input_tmp: any = {};
                const output_tmp: any = {};

                let new_element: any = {};
                let keyToSearch;

                Object.keys(ruleLineConfiguration).map((key: any) => {
                    const keyArray = key.split('_');

                    new_element = {};

                    new_element[keyArray[1]] = ruleLineConfiguration[key];

                    if (keyArray.length === 2) {
                        if (keyArray[1] === 'operator') {
                            if (ruleLineConfiguration[key] === '*') {
                                new_element['value'] = null;
                            } else {
                                keyToSearch = keyArray[0] + '_value';
                                new_element['value'] = ruleLineConfiguration[keyToSearch];
                            }
                        } else {
                            keyToSearch = keyArray[0] + '_operator';
                            if (ruleLineConfiguration[keyToSearch]) {
                                if (ruleLineConfiguration[keyToSearch] === '*') {
                                    new_element = {};
                                    new_element['value'] = null;
                                }
                                new_element['operator'] = ruleLineConfiguration[keyToSearch];
                            }
                        }

                        if (new_element['operator'] === undefined) {
                            output_tmp[keyArray[0]] = new_element;
                        } else {
                            input_tmp[keyArray[0]] = new_element;
                        }
                    }
                });

                formData['ruleLineConfigurationIn'] = input_tmp;
                formData['ruleLineConfigurationOut'] = output_tmp;

                Object.keys(formData).forEach((column_name: any) => {
                    if (
                        column_name !== 'ruleLineConfigurationIn' &&
                        column_name !== 'ruleLineConfigurationOut'
                    ) {
                        Reflect.deleteProperty(formData, column_name);
                    }
                });

                formData['ruleVersionId'] = props.ruleVersionId;

                formData['order'] = currentOrder;

                createRuleVersionConfig({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            id: props.ruleVersionId
        };

        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    const onOperatorChange = (data: string) => {
        setCurrentOperator(data);
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                {
                    <HeaderContent title={input}>
                        <Form.Item>
                            {ruleConfigInArray.map((item: any) => {
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
                                        >
                                            <Select
                                                placeholder={`${t('messages:please-select-a', {
                                                    name: t('d:operator')
                                                })}`}
                                                onChange={onOperatorChange}
                                            >
                                                <Select.Option value="=">=</Select.Option>

                                                {item.type.toUpperCase() === 'NUMBER' ? (
                                                    <>
                                                        <Select.Option value={signInf}>
                                                            {signInf}
                                                        </Select.Option>
                                                        <Select.Option value={signInfEqual}>
                                                            {signInfEqual}
                                                        </Select.Option>
                                                        <Select.Option value={signSup}>
                                                            {signSup}
                                                        </Select.Option>
                                                        <Select.Option value={signSupEqual}>
                                                            {signSupEqual}
                                                        </Select.Option>
                                                        <Select.Option value={signDifferentNumber}>
                                                            {signDifferentNumber}
                                                        </Select.Option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Select.Option value={signDifferenString}>
                                                            {signDifferenString}
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
                                        <Form.Item name={item.name + value} key={item.name + value}>
                                            {item.type.toUpperCase() === 'NUMBER' ? (
                                                <InputNumber disabled={currentOperator === '*'} />
                                            ) : (
                                                <Input disabled={currentOperator === '*'} />
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
                                return (
                                    <Form.Item
                                        name={item.name + value}
                                        label={
                                            item.description
                                                ? item.description
                                                : t(`d:${item.name}`)
                                        }
                                        key={item.name + value}
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
                <Button type="primary" loading={createLoading} onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
