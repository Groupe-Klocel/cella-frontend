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
import { Form, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { showError } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface ManageAssignmentModalProps {
    showModal: any;
    updateFunction: (input: any, setLoading: (loading: boolean) => void) => Promise<void>;
    loading: any;
    userAssigned?: string;
    additionalInfoToUpdate?: any;
}

const ManageAssignmentModal = ({
    showModal,
    updateFunction,
    loading,
    userAssigned,
    additionalInfoToUpdate
}: ManageAssignmentModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const [warehouseWorkers, setWarehouseWorkers] = useState<any[]>([]);
    const [isEditLoading, setIsEditLoading] = useState(false);

    const setFieldsValue = () => {
        form.setFieldsValue({});
    };

    const handleCancel = () => {
        setIsEditLoading(false);
        showModal.setShowManageAssignmentModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const getWarehouseWorkers = async () => {
        const query = gql`
            query warehouseWorkers {
                warehouseWorkers(
                    itemsPerPage: 1000
                    orderBy: { field: "username", ascending: true }
                ) {
                    results {
                        id
                        username
                    }
                }
            }
        `;
        try {
            const data = await graphqlRequestClient.request(query);
            return data.warehouseWorkers.results;
        } catch (error) {
            showError(t('messages:error-getting-data'));
            return [];
        }
    };

    useEffect(() => {
        const fetchWarehouseWorkers = async () => {
            const results = await getWarehouseWorkers();
            setWarehouseWorkers(results);
        };
        fetchWarehouseWorkers();
    }, []);

    const handleAssign = async () => {
        try {
            setIsEditLoading(true);

            if (userAssigned) {
                await updateFunction({ assignedUser: null, ...additionalInfoToUpdate }, loading);
            } else {
                const formData = await form.validateFields();
                await updateFunction({ assignedUser: formData.warehouseWorker }, loading);
            }

            showModal.setShowManageAssignmentModal(false);
            form.resetFields();
            setIsEditLoading(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsEditLoading(false);
        }
    };

    return (
        <Modal
            title={
                userAssigned
                    ? t('actions:unassign-confirmation')
                    : t('actions:manage-assignment-modal')
            }
            open={showModal.showManageAssignmentModal}
            width={800}
            onCancel={handleCancel}
            onOk={handleAssign}
            okText={t('actions:confirm')}
            confirmLoading={isEditLoading}
        >
            {userAssigned ? (
                // Unassignment mode - confirmation message
                <div>
                    <p>
                        {t('messages:confirm-unassignment', {
                            user: userAssigned
                        })}
                    </p>
                </div>
            ) : (
                // Assignment mode - select warehouse worker
                <Form form={form}>
                    <Form.Item
                        name="warehouseWorker"
                        rules={[
                            {
                                required: true,
                                message: t('messages:please-select-an', {
                                    name: t('d:warehouseWorker')
                                })
                            }
                        ]}
                    >
                        <Select
                            placeholder={`${t('messages:please-select-an', {
                                name: t('d:warehouseWorker')
                            })}`}
                            style={{ width: '100%' }}
                        >
                            {warehouseWorkers.map((warehouseWorker) => (
                                <Select.Option
                                    key={warehouseWorker.id}
                                    value={warehouseWorker.username}
                                >
                                    {warehouseWorker.username}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
};

export { ManageAssignmentModal };