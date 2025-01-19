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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, InputNumber, Modal } from 'antd';
import { useState } from 'react';
import { showError } from '@helpers';

export interface INumberOfPrintsModalProps {
    id: string | undefined;
    showModal: any;
    path: string;
}

const NumberOfPrintsModal = ({ showModal, id, path }: INumberOfPrintsModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageUpdateData = t('messages:error-update-data');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    const printData = async (id: string, copies: number) => {
        const res = await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id,
                copies
            })
        });
        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
            showModal.setShowNumberOfPrintsModal(false);
        } else {
            showError(t('messages:error-print-data'));
            showModal.setShowNumberOfPrintsModal(false);
        }
    };

    const handleCancel = () => {
        showModal.setShowNumberOfPrintsModal(false);
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                printData(id!, formData.copies);
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
    };

    return (
        <Modal
            title={t('actions:number-of-copies')}
            open={showModal.showNumberOfPrintsModal}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={300}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <Form.Item
                        label={t('d:number-of-copies')}
                        name="copies"
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                        initialValue={1}
                    >
                        <InputNumber min={1} precision={0} />
                    </Form.Item>
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { NumberOfPrintsModal };
