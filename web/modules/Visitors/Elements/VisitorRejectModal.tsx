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

// DESCRIPTION: visitor refusal modal - predefined reason (+ free text when
// "other") and an optional message. Refusing always cancels the visit; the
// visitor can restart a new tablet check-in if needed.

import { Button, Form, Input, Modal, Select } from 'antd';
import { FC } from 'react';

const REASON_CODES = [
    'identity-mismatch',
    'referent-unreachable',
    'requirements-not-met',
    'safety-issue',
    'other'
];

export interface IVisitorRejectModalProps {
    open: boolean;
    confirmLoading?: boolean;
    t: (key: string, vars?: Record<string, any>) => string;
    onCancel: () => void;
    onConfirm: (reason: string, message: string | undefined) => void;
}

export const VisitorRejectModal: FC<IVisitorRejectModalProps> = ({
    open,
    confirmLoading,
    t,
    onCancel,
    onConfirm
}) => {
    const [form] = Form.useForm();
    const reasonCode = Form.useWatch('reasonCode', form);

    const confirm = () => {
        form.validateFields().then((values) => {
            const reasonLabel =
                values.reasonCode === 'other'
                    ? values.otherReason
                    : t(`common:reason-${values.reasonCode}`);
            onConfirm(reasonLabel, values.message);
            form.resetFields();
        });
    };

    const close = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={t('common:reason-label')}
            open={open}
            onCancel={close}
            footer={[
                <Button key="close" onClick={close}>
                    {t('actions:cancel')}
                </Button>,
                <Button
                    key="refuse"
                    danger
                    type="primary"
                    onClick={confirm}
                    loading={confirmLoading}
                >
                    {t('common:refuse')}
                </Button>
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="reasonCode"
                    label={t('common:reason-label')}
                    rules={[{ required: true, message: t('common:required') }]}
                >
                    <Select placeholder={t('common:reason-label')}>
                        {REASON_CODES.map((code) => (
                            <Select.Option key={code} value={code}>
                                {t(`common:reason-${code}`)}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                {reasonCode === 'other' && (
                    <Form.Item
                        name="otherReason"
                        label={t('common:reason-other')}
                        rules={[{ required: true, message: t('common:required') }]}
                    >
                        <Input allowClear />
                    </Form.Item>
                )}

                <Form.Item name="message" label={t('common:message-label')}>
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

VisitorRejectModal.displayName = 'VisitorRejectModal';
