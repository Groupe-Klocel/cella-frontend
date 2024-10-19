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
import { Button, Col, Form, Input, InputNumber, Row, Typography } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    CreateParameterMutation,
    CreateParameterMutationVariables,
    useCreateParameterMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const { Title } = Typography;

export const AddActionCodeForm = () => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const { mutate, isPending: createLoading } = useCreateParameterMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateParameterMutation,
                _variables: CreateParameterMutationVariables,
                _context: any
            ) => {
                router.push(`/action-codes/${data.createParameter.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: () => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createActionCode = ({ input }: CreateParameterMutationVariables) => {
        mutate({ input });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                const translation = { en: formData.en, fr: formData.fr };
                formData['translation'] = translation;
                formData['scope'] = 'action_code';
                formData.code = String(formData.code);
                delete formData['en'];
                delete formData['fr'];
                createActionCode({ input: formData });
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

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row>
                    <Col xs={1} xl={4}>
                        <Form.Item
                            label={t('d:code')}
                            name="code"
                            initialValue={40001}
                            rules={[
                                { required: true, message: `${t('error-message-empty-input')}` }
                            ]}
                        >
                            <InputNumber min={40000} max={49999} />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={20}>
                        <Form.Item
                            label={t('d:value')}
                            name="value"
                            rules={[
                                { required: true, message: `${t('error-message-empty-input')}` }
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>

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
