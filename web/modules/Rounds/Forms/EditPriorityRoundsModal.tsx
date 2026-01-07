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

import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, Modal, Select, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';

export interface EditPriorityRoundsModalProps {
    showModal: any;
    updateRounds: (input: any, setLoading: (loading: boolean) => void) => Promise<void>;
    loading: any;
}

const EditPriorityRoundsModal = ({
    showModal,
    updateRounds,
    loading
}: EditPriorityRoundsModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const [isEditLoading, setIsEditLoading] = useState(false);
    const { parameters } = useAppState();
    const router = useRouter();
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;

    const ParamsCodes = useMemo(() => {
        const priorityList = parameters
            .filter((param: any) => param.scope === 'priority')
            .map((param: any) => ({
                id: param.id,
                text: param.translation?.[String(filterLanguage)!] || param.value,
                code: param.code
            }))
            .sort((a: any, b: any) => b.code - a.code);
        return {
            priorityList
        };
    }, [parameters]);

    const setFieldsValue = () => {
        form.setFieldsValue({});
    };

    const handleCancel = () => {
        setIsEditLoading(false);
        showModal.setShowEditPriorityRoundsModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const handleAssign = async () => {
        try {
            const formData = await form.validateFields();
            setIsEditLoading(true);
            const priorityValue = parseInt(formData.priority, 10);
            await updateRounds({ priority: priorityValue }, loading);
            showModal.setShowEditPriorityRoundsModal(false);
            form.resetFields();
            setIsEditLoading(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsEditLoading(false);
        }
    };

    return (
        <Modal
            title={t('actions:edit-priority-rounds-modal')}
            open={showModal.showEditPriorityRoundsModal}
            width={800}
            onCancel={handleCancel}
            onOk={handleAssign}
            okText={t('actions:confirm')}
            confirmLoading={isEditLoading}
        >
            <Form form={form}>
                <Form.Item
                    name="priority"
                    rules={[
                        {
                            required: true,
                            message: t('messages:please-select-an', {
                                name: t('d:priority')
                            })
                        }
                    ]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:priority')
                        })}`}
                        style={{ width: '100%' }}
                    >
                        {ParamsCodes.priorityList.map((priority: any) => (
                            <Select.Option key={priority.id} value={priority.code}>
                                {priority.text}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export { EditPriorityRoundsModal };
