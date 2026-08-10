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

// DESCRIPTION: "on site (waiting)" modal - the guard sends the truck to the waiting area
// instead of straight to a dock, optionally handing over a pager. Both fields are optional:
// the decision itself is the point, the pager is a convenience for calling the driver back.

import { Form, Input, Modal } from 'antd';
import { FC } from 'react';

export interface IWaitingModalProps {
    open: boolean;
    confirmLoading?: boolean;
    t: (key: string, vars?: Record<string, any>) => string;
    onCancel: () => void;
    onConfirm: (pagerNumber: string | undefined, comment: string | undefined) => void;
}

export const WaitingModal: FC<IWaitingModalProps> = ({
    open,
    confirmLoading,
    t,
    onCancel,
    onConfirm
}) => {
    const [form] = Form.useForm();

    const confirm = () => {
        const values = form.getFieldsValue(true);
        // trim to undefined so an empty input is stored as null rather than ''
        onConfirm(values.pagerNumber?.trim() || undefined, values.comment?.trim() || undefined);
        form.resetFields();
    };

    const close = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={t('common:on-site-waiting')}
            open={open}
            onCancel={close}
            onOk={confirm}
            confirmLoading={confirmLoading}
            okText={t('actions:mark-waiting-appointment')}
            cancelText={t('common:cancel')}
        >
            <Form form={form} layout="vertical">
                {/* pager identifiers are labelled things like "A12", so a free string - not a number */}
                <Form.Item name="pagerNumber" label={t('common:pager-number')}>
                    <Input placeholder={t('common:pager-number-ph')} maxLength={16} allowClear />
                </Form.Item>
                <Form.Item name="comment" label={t('common:comment-optional')}>
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

WaitingModal.displayName = 'WaitingModal';
