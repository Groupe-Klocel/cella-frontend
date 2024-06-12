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
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdateParameterMutation,
    UpdateParameterMutation,
    UpdateParameterMutationVariables
} from 'generated/graphql';
import { showError, showSuccess, showInfo } from '@helpers';

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

    const { mutate, isLoading: updateLoading } = useUpdateParameterMutation<Error>(
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

    //check fields if contain undefined value and set field to null
    const checkUndefinedValues = () => {
        const tmpFieldsValues = { ...form.getFieldsValue(true) };

        for (const [key, value] of Object.entries(tmpFieldsValues)) {
            if (value === undefined) {
                tmpFieldsValues[key] = null;
            }
        }
        form.setFieldsValue(tmpFieldsValues);
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues();
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                const translation = { en: formData.en, fr: formData.fr };
                formData['translation'] = translation;
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
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row>
                    <Col xs={1} xl={4}>
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
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            </div>
        </WrapperForm>
    );
};
