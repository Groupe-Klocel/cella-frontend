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
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface ConfirmRoundCalculationModalProps {
    showModal: any;
    roundCalculation: (input: any) => Promise<void>;
}

const ConfirmRoundCalculationModal = ({
    showModal,
    roundCalculation
}: ConfirmRoundCalculationModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const [roundCalculationProfiles, setRoundCalculationProfiles] = useState<any[]>([]);
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const [isEditLoading, setIsEditLoading] = useState(false);

    const setFieldsValue = () => {
        form.setFieldsValue({});
    };

    const handleCancel = () => {
        setIsEditLoading(false);
        showModal.setShowConfirmRoundCalculationModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const getRoundCalculationProfiles = async () => {
        const query = gql`
            query roundCalculationProfiles {
                roundCalculationProfiles(
                    itemsPerPage: 1000
                    orderBy: { field: "name", ascending: true }
                ) {
                    results {
                        id
                        name
                    }
                }
            }
        `;
        try {
            const data = await graphqlRequestClient.request(query);
            return data.roundCalculationProfiles.results;
        } catch (error) {
            showError(t('messages:error-getting-data'));
            console.log(error);
            return [];
        }
    };

    useEffect(() => {
        const fetchRoundCalculationProfiles = async () => {
            const results = await getRoundCalculationProfiles();
            setRoundCalculationProfiles(results);
        };
        fetchRoundCalculationProfiles();
    }, []);

    const handleAssign = async () => {
        try {
            const formData = await form.validateFields();
            setIsEditLoading(true);
            await roundCalculation({
                roundCalculationProfileId: formData.roundCalculationProfiles
            });
            showModal.setShowConfirmRoundCalculationModal(false);
            form.resetFields();
            setIsEditLoading(false);
        } catch (error) {
            console.log('Confirmation failed:', error);
            setIsEditLoading(false);
        }
    };

    return (
        <Modal
            title={t('actions:roundCalculation')}
            open={showModal.showConfirmRoundCalculationModal}
            width={800}
            onCancel={handleCancel}
            onOk={handleAssign}
            okText={t('actions:confirm')}
            confirmLoading={isEditLoading}
        >
            <Form form={form}>
                <Form.Item
                    label={t('d:round-calculation-profiles')}
                    name="roundCalculationProfiles"
                    rules={[
                        {
                            required: true,
                            message: t('messages:please-select-an', {
                                name: t('d:round-calculation-profiles')
                            })
                        }
                    ]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:round-calculation-profiles')
                        })}`}
                        style={{ width: '100%' }}
                        allowClear
                    >
                        {roundCalculationProfiles.map((roundCalculationProfile) => (
                            <Select.Option
                                key={roundCalculationProfile.id}
                                value={roundCalculationProfile.id}
                            >
                                {roundCalculationProfile.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export { ConfirmRoundCalculationModal };
