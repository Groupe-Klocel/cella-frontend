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
import { showError, showInfo, showSuccess } from '@helpers';
import { Button, Col, Form, Input, InputNumber, Row, Select, Typography } from 'antd';
const { Option } = Select;
import {
    CreateConfigMutation,
    CreateConfigMutationVariables,
    useCreateConfigMutation,
    useGetConfigScopesQuery
} from 'generated/graphql';

import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FormOptionType } from 'models/Models';

const { Title } = Typography;

export const AddConfigurationForm = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [scopeListConfig, setScopeList] = useState<any>();

    const { mutate, isLoading: createLoading } = useCreateConfigMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateConfigMutation,
                _variables: CreateConfigMutationVariables,
                _context: any
            ) => {
                router.push(`/configurations/${data.createConfig.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: () => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createConfig = ({ input }: CreateConfigMutationVariables) => {
        mutate({ input });
    };
    // liste scope
    const listScopeConfig = useGetConfigScopesQuery(graphqlRequestClient);
    useEffect(() => {
        if (listScopeConfig) {
            // données
            const cData = listScopeConfig?.data?.configScopes;
            if (cData) {
                setScopeList(cData);
            }
        }
    }, [listScopeConfig.data]);

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                const translation = { en: formData.en, fr: formData.fr };
                formData['translation'] = translation;
                formData['scope'];
                formData.code = String(formData.code);
                delete formData['en'];
                delete formData['fr'];
                createConfig({ input: formData });
            })
            .catch((err) => {
                showError(t('error-creating-data'));
            });
    };

    useEffect(() => {
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    // A revoir Affichage de la liste de scope .

    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row>
                    <Col xs={1} xl={7}>
                        <Form.Item
                            name="scope"
                            label={t('d:scope')}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            {
                                <Select>
                                    {scopeListConfig?.map((config: any) => (
                                        <Option key={config.id} value={config.scope}>
                                            {config.scope}
                                        </Option>
                                    ))}
                                </Select>
                            }
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    label={t('d:code')}
                    name="code"
                    rules={[{ required: true, message: `${t('error-message-empty-input')}` }]}
                >
                    <InputNumber />
                </Form.Item>

                <Form.Item
                    label={t('d:value')}
                    name="value"
                    rules={[{ required: true, message: `${t('error-message-empty-input')}` }]}
                >
                    <Input />
                </Form.Item>

                <Title level={5}>{t('common:translation')}</Title>
                <Form.Item label={t('EN')} name="en">
                    <Input />
                </Form.Item>
                <Form.Item label={t('FR')} name="fr">
                    <Input />
                </Form.Item>
                <Row>
                    <Col span={24} style={{ textAlign: 'center' }}>
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
                            {t('actions:submit')}
                        </Button>
                    </Col>
                </Row>
            </Form>
        </WrapperForm>
    );
};
