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

// DESCRIPTION: no-show reason modal - the reason list comes from the
// appointment_no_show_reason parameter scope (its own scope, distinct from the
// refusal one) and the chosen label is stored in the appointment's denyReason,
// the same field a cancellation/refusal reason goes to.

import { Form, Input, Modal, Select } from 'antd';
import { FC, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';

export const NO_SHOW_REASON_SCOPE = 'appointment_no_show_reason';

export interface INoShowReasonModalProps {
    open: boolean;
    confirmLoading?: boolean;
    t: (key: string, vars?: Record<string, any>) => string;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
}

export const NoShowReasonModal: FC<INoShowReasonModalProps> = ({
    open,
    confirmLoading,
    t,
    onCancel,
    onConfirm
}) => {
    const [form] = Form.useForm();
    const { parameters } = useAppState();
    const router = useRouter();
    const locale = router.locale ?? 'en-US';

    const reasonOptions = useMemo(
        () =>
            ((parameters as any[]) ?? [])
                .filter((p) => p.scope === NO_SHOW_REASON_SCOPE)
                .map((p) => ({
                    value: String(p.code),
                    label: p.translation?.[locale] ?? p.value
                })),
        [parameters, locale]
    );

    const confirm = () => {
        form.validateFields().then((values) => {
            const reason =
                reasonOptions.find((o) => o.value === values.reasonCode)?.label ??
                values.freeReason;
            const message = values.message?.trim();
            // same concatenated format as a gate-validation refusal
            onConfirm(message ? `${reason} — ${message}` : reason);
            form.resetFields();
        });
    };

    const close = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={t('d:reason')}
            open={open}
            onOk={confirm}
            onCancel={close}
            okText={t('messages:confirm')}
            cancelText={t('messages:cancel')}
            confirmLoading={confirmLoading}
        >
            <Form form={form} layout="vertical">
                {reasonOptions.length > 0 ? (
                    <>
                        <Form.Item
                            name="reasonCode"
                            label={t('d:reason')}
                            rules={[{ required: true, message: t('common:required') }]}
                        >
                            <Select placeholder={t('d:reason')} options={reasonOptions} />
                        </Form.Item>
                        {/* optional free text, concatenated after the selected reason
                            in denyReason */}
                        <Form.Item name="message" label={t('d:comment')}>
                            <Input.TextArea rows={3} allowClear />
                        </Form.Item>
                    </>
                ) : (
                    // no appointment_no_show_reason parameter configured on this
                    // warehouse: fall back to a mandatory free-text reason
                    <Form.Item
                        name="freeReason"
                        label={t('d:reason')}
                        rules={[{ required: true, message: t('common:required') }]}
                    >
                        <Input.TextArea rows={3} allowClear />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

NoShowReasonModal.displayName = 'NoShowReasonModal';
