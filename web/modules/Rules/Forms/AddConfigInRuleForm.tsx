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
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    InputMaybe,
    Scalars,
    UpdateRuleVersionMutation,
    UpdateRuleVersionMutationVariables,
    useUpdateRuleVersionMutation
} from 'generated/graphql';
import { showError, showSuccess, showInfo, useRuleVersionIds } from '@helpers';

export interface ISingleItemProps {
    ruleVersionId: string | any;
    ruleVersion: number | any;
    ruleName: string | any;
}

export const AddConfigInRuleForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const params: any[] = [];
    const paramFields: any[] = [];
    //const paramNames: any[] = [];
    const parameterName = t('d:parameterName');
    const description = t('d:description');
    const type = t('d:typeText');
    const validationRule = t('d:validationRule');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const ruleVersion = useRuleVersionIds({ id: props.ruleVersionId }, 1, 100, null);

    //UPDATE rule version
    const { mutate, isPending: updateLoading } = useUpdateRuleVersionMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateRuleVersionMutation,
                _variables: UpdateRuleVersionMutationVariables,
                _context: any
            ) => {
                router.push(`/rules/version/${props.ruleVersionId}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateRuleVersion = ({ id, input }: UpdateRuleVersionMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                const ruleConfigurationIn = formData;

                const input_tmp: any = {};

                const new_element: any = {};

                if (ruleConfigurationIn['description'] !== undefined) {
                    new_element['description'] = ruleConfigurationIn['description'];
                } else {
                    new_element['description'] = null;
                }
                new_element['type'] = ruleConfigurationIn['type'];

                if (ruleConfigurationIn['validationRule'] !== undefined) {
                    new_element['validationRule'] = ruleConfigurationIn['validationRule'];
                } else {
                    new_element['validationRule'] = null;
                }

                input_tmp[ruleConfigurationIn['parameterName']] = new_element;

                formData['ruleConfigurationIn'] = input_tmp;

                Object.keys(formData).forEach((column_name: any) => {
                    if (column_name !== 'ruleConfigurationIn') {
                        Reflect.deleteProperty(formData, column_name);
                    }
                });

                updateRuleVersion({ id: props.ruleVersionId, input: formData });
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
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading]);

    if (ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationIn) {
        Object.keys(ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationIn).forEach(
            (key: any) => {
                params.push(t('d:' + key));

                Object.keys(
                    ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationIn[key]
                ).forEach((keyConfIn: any) => {
                    paramFields.push(
                        ruleVersion.data?.ruleVersions?.results[0].ruleConfigurationIn[key][
                            keyConfIn
                        ]
                    );
                });
            }
        );
    }

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
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item label={description} name="description">
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

                        <Form.Item label={validationRule} name="validationRule">
                            <Input />
                        </Form.Item>
                    </Form.Item>
                }
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
