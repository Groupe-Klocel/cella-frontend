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
import { Button, Input, Form, InputNumber } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateRuleVersionMutation,
    CreateRuleVersionMutation,
    CreateRuleVersionMutationVariables
} from 'generated/graphql';
import { showError, showSuccess, showInfo, useRuleVersionIds } from '@helpers';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    ruleId: string | any;
    ruleName: string | any;
}

export const AddRuleVersionForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const rule = t('common:rule');
    const version = t('d:version');
    const description = t('d:description');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    let newestRuleVersion: any = {};
    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const ruleVersions: any = useRuleVersionIds({ ruleId: `${props.ruleId}%` }, 1, 100, null);

    //Version/status assignement
    useEffect(() => {
        const receivedList = ruleVersions?.data?.ruleVersions?.results.map((e: any) => e.version);

        if (receivedList && receivedList?.length != 0) {
            form.setFieldsValue({ version: Math.max(...receivedList) + 1 });
            const newestVersion = Math.max(...receivedList);

            newestRuleVersion = ruleVersions?.data?.ruleVersions?.results.find(
                (element: any) => element.version == newestVersion
            );
        } else {
            form.setFieldsValue({ version: 1 });
        }
        form.setFieldsValue({ rule: props.ruleName });
        form.setFieldsValue({ status: configs.RULE_STATUS_IN_PROGRESS });
    }, [ruleVersions]);

    //CREATE rule version
    const { mutate, isPending: createLoading } = useCreateRuleVersionMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateRuleVersionMutation,
                _variables: CreateRuleVersionMutationVariables,
                _context: any
            ) => {
                router.push(`/rules/${props.ruleId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createRuleVersion = ({ input }: CreateRuleVersionMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                delete formData.rule;

                createRuleVersion({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ruleId: props.ruleId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={rule} name="rule">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={version} name="version">
                    <InputNumber disabled />
                </Form.Item>
                <Form.Item label={description} name="description">
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
