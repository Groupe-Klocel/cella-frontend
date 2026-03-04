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
import { showError, showSuccess, useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, Modal, InputNumber } from 'antd';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useState } from 'react';

export interface MissingModalProps {
    showModal: any;
    inputToValidate: any;
    additionalInfos?: any;
    setRefetchTrigger?: (arg0: any) => void;
}

const MissingModal = ({
    showModal,
    inputToValidate,
    additionalInfos,
    setRefetchTrigger
}: MissingModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [isEditLoading, setIsEditLoading] = useState(false);
    const { maxQuantity } = additionalInfos || {};

    const { graphqlRequestClient } = useAuth();

    const setFieldsValue = () => {
        form.setFieldsValue({});
    };

    const handleCancel = () => {
        setIsEditLoading(false);
        showModal.setShowMissingModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const handleSubmit = async () => {
        try {
            setIsEditLoading(true);
            const formData = await form.validateFields();
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                functionName: 'declare_missing_quantity',
                event: {
                    input: { ...inputToValidate, missingQuantity: formData.missingQuantity }
                }
            };
            const validateFullBoxResult = await graphqlRequestClient.request(query, variables);
            if (validateFullBoxResult.executeFunction.status === 'ERROR') {
                showError(validateFullBoxResult.executeFunction.output);
            } else if (
                validateFullBoxResult.executeFunction.status === 'OK' &&
                validateFullBoxResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${validateFullBoxResult.executeFunction.output.output.code}`));
                console.log('Backend_message', validateFullBoxResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:missing-quantity-declared-successfully'));
                if (setRefetchTrigger) {
                    setRefetchTrigger((prev: any) => !prev);
                }
            }

            showModal.setShowMissingModal(false);
            form.resetFields();
            setIsEditLoading(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsEditLoading(false);
        }
    };

    return (
        <Modal
            title={t('common:missing-quantity')}
            centered
            open={showModal.showMissingModal}
            onCancel={handleCancel}
            onOk={handleSubmit}
            width={800}
            okText={t('actions:submit')}
            cancelText={t('actions:cancel')}
            confirmLoading={isEditLoading}
        >
            <Form form={form} layout="vertical" scrollToFirstError size="small">
                {additionalInfos && (
                    <div style={{ marginTop: '20px' }}>
                        {Object.entries(additionalInfos)
                            .filter(([key]) => !['maxQuantity', 'id'].includes(key))
                            .map(([key, value]) => (
                                <p key={key}>
                                    <strong>{t(`common:${key}`)}:</strong> {String(value)}
                                </p>
                            ))}
                    </div>
                )}
                <Form.Item
                    label={t('common:quantity')}
                    name="missingQuantity"
                    rules={[
                        { required: true, message: t('messages:error-message-empty-input') },
                        {
                            type: 'number',
                            min: 1,
                            message: t('messages:select-number-min', {
                                min: 1
                            })
                        },
                        {
                            type: 'number',
                            max: maxQuantity,
                            message: t('messages:select-number-max', {
                                max: maxQuantity
                            })
                        }
                    ]}
                >
                    <InputNumber min={1} max={maxQuantity} style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export { MissingModal };
