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
import { useRouter } from 'next/router';

const { Option } = Select;
const { Text } = Typography;

export interface DeliveriesManualAllocationModalProps {
    showModal: any;
    selectedRowKeys: any;
    resetSelection: () => void;
}

const DeliveriesManualAllocationModal = ({
    showModal,
    selectedRowKeys,
    resetSelection
}: DeliveriesManualAllocationModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [orderData, setOrderData] = useState<any>();
    const [isCreationLoading, setIsCreationLoading] = useState<boolean>(false);
    const [equipmentsTypes, setEquipmentsTypes] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);

    const getEquipmentsTypes = async () => {
        const query = gql`
            query configs($scope: String!) {
                configs(filters: { scope: $scope }) {
                    results {
                        value
                        code
                    }
                }
            }
        `;

        const variables = {
            scope: 'equipment_type'
        };

        const EquipmentsTypes = await graphqlRequestClient.request(query, variables);
        return EquipmentsTypes.configs.results;
    };

    useEffect(() => {
        const fetchEquipmentsTypes = async () => {
            const results = await getEquipmentsTypes();
            setEquipmentsTypes(results);
        };
        fetchEquipmentsTypes();
    }, []);

    const getDeliveries = async () => {
        const query = gql`
            query deliveries($id: [String!]!) {
                deliveries(filters: { id: $id }) {
                    count
                    results {
                        id
                        handlingUnitOutbounds {
                            id
                            handlingUnit {
                                id
                                length
                                width
                                height
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            id: selectedRowKeys
        };

        const deliveries = await graphqlRequestClient.request(query, variables);
        return deliveries.deliveries.results;
    };

    useEffect(() => {
        const fetchDeliveries = async () => {
            if (selectedRowKeys && selectedRowKeys.length > 0) {
                const results = await getDeliveries();
                setDeliveries(results);
            }
        };
        fetchDeliveries();
    }, [selectedRowKeys]);

    const setFieldsValue = () => {
        form.setFieldsValue({});
    };

    const handleCancel = () => {
        setIsCreationLoading(false);
        showModal.setShowDeliveriesManualAllocationModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const calculateTotalVolume = (deliveries: any[]) => {
        const totalVolumeMm3 = deliveries.reduce((totalVolume, curr) => {
            const unitVolume = curr.handlingUnitOutbounds.reduce((unitAcc: number, unit: any) => {
                const { length, width, height } = unit.handlingUnit;
                if (length && width && height) {
                    const volume = length * width * height;
                    return unitAcc + volume;
                }
                return unitAcc;
            }, 0);
            return totalVolume + unitVolume;
        }, 0);
        return Math.round((totalVolumeMm3 / 1000000000) * 1000) / 1000; // 3 digits after comma
    };

    const handleAssign = async () => {
        const form_value = form.getFieldsValue();
        setIsCreationLoading(true);
        setFieldsValue();

        let allowedEquipments = undefined;

        if (form_value?.equipmentsTypes?.length > 0) {
            const equipmentQuery = gql`
                query equipments($filters: EquipmentSearchFilters) {
                    equipments(filters: $filters) {
                        count
                        results {
                            id
                        }
                    }
                }
            `;

            const equipmentVariables = {
                filters: {
                    type: form_value?.equipmentsTypes
                }
            };

            const equipmentResults = await graphqlRequestClient.request(
                equipmentQuery,
                equipmentVariables
            );

            allowedEquipments = equipmentResults?.equipments?.results?.map(
                (equipment: any) => equipment.id
            );
        }

        const allowedDeliveries = deliveries.map((deliveries: any) => deliveries.id);

        const data = {
            allowedDeliveries,
            allowedEquipments
        };

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'estimate_rounds',
            event: {
                input: data
            }
        };

        try {
            const query_result = await graphqlRequestClient.request(query, variables);
            if (query_result.executeFunction.status === 'ERROR') {
                showError(query_result.executeFunction.output);
            } else if (
                query_result.executeFunction.status === 'OK' &&
                query_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${query_result.executeFunction.output.output.code}`));
                console.log('Backend_message', query_result.executeFunction.output.output);
            } else {
                resetSelection();
                showSuccess(t('messages:manual-allocation-success'));
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        } finally {
            setIsCreationLoading(false);
            showModal.setShowDeliveriesManualAllocationModal(false);
            form.resetFields();
        }
    };

    return (
        <Modal
            title={t('actions:deliveries-manual-allocation-modal')}
            open={showModal.showDeliveriesManualAllocationModal}
            width={800}
            onCancel={handleCancel}
            onOk={handleAssign}
            okText={t('actions:confirm')}
            confirmLoading={isCreationLoading}
        >
            <Form form={form}>
                <Form.Item name="equipmentsTypes">
                    <Select
                        mode="multiple"
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:equipment')
                        })}`}
                        style={{ width: '100%' }}
                    >
                        {equipmentsTypes.map((equipment) => (
                            <Select.Option key={equipment.code} value={equipment.code}>
                                {equipment.value}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
            {deliveries != undefined && (
                <Text>
                    {`${t('common:deliveries-count')} : ${deliveries.length}`}
                    <br />
                    {`${t('common:number-of-boxes')} : ${deliveries.reduce((acc, curr) => acc + curr.handlingUnitOutbounds.length, 0)}`}
                    <br />
                    {`${t('common:total-volume')} : ${calculateTotalVolume(deliveries)} m³`}
                </Text>
            )}
        </Modal>
    );
};

export { DeliveriesManualAllocationModal };
