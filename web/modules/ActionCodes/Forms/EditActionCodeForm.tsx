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
import { Button, Input, Form, Typography, InputNumber, Row, Col } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdateParameterMutation,
    UpdateParameterMutation,
    UpdateParameterMutationVariables
} from 'generated/graphql';
import { checkUndefinedValues, showError, showSuccess, showInfo } from '@helpers';

const { Title } = Typography;

export type EditActionCodeFormProps = {
    actionCodeId: string;
    details: any;
};

export const EditActionCodeForm: FC<EditActionCodeFormProps> = ({
    actionCodeId,
    details
}: EditActionCodeFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const { mutate, isPending: updateLoading } = useUpdateParameterMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateParameterMutation,
                _variables: UpdateParameterMutationVariables,
                _context: any
            ) => {
                router.push(`/action-codes/${data.updateParameter?.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateActionCode = ({ id, input }: UpdateParameterMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                let translation: any = { en: formData.en, fr: formData.fr };

                if (Object.keys(translation).length === 0) {
                    translation = null;
                }
                const emptyTranslation = Object.fromEntries(
                    Object.entries(translation).filter(([_, value]) => value !== undefined)
                );

                formData['translation'] =
                    Object.keys(emptyTranslation).length === 0 ? null : translation;
                formData.code = String(formData.code);
                delete formData['en'];
                delete formData['fr'];
                delete formData['system'];
                updateActionCode({ id: actionCodeId, input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            ...details.translation
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        delete tmp_details['translation'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading, details]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32, xl: 40 }}>
                    <Col className="gutter-row" span={6}>
                        <Form.Item
                            label={t('d:code')}
                            name="code"
                            rules={[
                                { required: true, message: `${t('error-message-empty-input')}` }
                            ]}
                        >
                            <InputNumber min={40000} max={49999} />
                        </Form.Item>
                    </Col>
                    <Col className="gutter-row" span={20}>
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
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            </div>
        </WrapperForm>
    );
};
