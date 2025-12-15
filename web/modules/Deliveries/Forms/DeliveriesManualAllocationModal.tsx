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
import { showWarning, useTranslationWithFallback as useTranslation } from '@helpers';
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
    const [equipments, setEquipments] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [roundCalculationProfiles, setRoundCalculationProfiles] = useState<any[]>([]);
    const [isProfileSelected, setIsProfileSelected] = useState(false);
    const [areEquipmentsSelected, setAreEquipmentsSelected] = useState(false);

    const handleProfileChange = (value: any) => {
        setIsProfileSelected(!!value);
        if (value) {
            form.setFieldsValue({ equipments: [] });
            setAreEquipmentsSelected(false);
        }
    };

    const handleEquipmentsChange = (value: any[]) => {
        setAreEquipmentsSelected(value.length > 0);
        if (value.length > 0) {
            form.setFieldsValue({ roundCalculationProfileId: null });
            setIsProfileSelected(false);
        }
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

    const getEquipments = async () => {
        const query = gql`
            query equipments {
                equipments(filters: { available: true }, itemsPerPage: 1000) {
                    results {
                        name
                        id
                    }
                }
            }
        `;

        const Equipments = await graphqlRequestClient.request(query);
        return Equipments.equipments.results;
    };

    useEffect(() => {
        const fetchEquipments = async () => {
            const results = await getEquipments();
            setEquipments(results);
        };
        fetchEquipments();
    }, []);

    const getDeliveries = async () => {
        const query = gql`
            query deliveries($id: [String!]!, $itemsPerPage: Int!) {
                deliveries(filters: { id: $id }, itemsPerPage: $itemsPerPage) {
                    count
                    results {
                        id
                        handlingUnitOutbounds(
                            advancedFilters: {
                                filter: [
                                    {
                                        searchType: DIFFERENT
                                        fieldName: "status"
                                        searchedValues: "2000"
                                    }
                                ]
                            }
                        ) {
                            id
                            theoriticalWeight
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
            id: selectedRowKeys,
            itemsPerPage: 999
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
        setAreEquipmentsSelected(false);
        setIsProfileSelected(false);
        form.resetFields();
        setFieldsValue();
    };

    const calculateTotalWeight = (deliveries: any[]) => {
        const totalWeight = deliveries.reduce((totalWeight, curr) => {
            const unitWeight = curr.handlingUnitOutbounds.reduce((unitAcc: number, unit: any) => {
                if (unit.theoriticalWeight) {
                    return unitAcc + unit.theoriticalWeight;
                }
                return unitAcc;
            }, 0);
            return totalWeight + unitWeight;
        }, 0);
        return Math.round((totalWeight / 1000) * 1000) / 1000; // 3 digits after comma
    };

    const calculateTotalVolume = (deliveries: any[]) => {
        const totalVolumeMm3 = deliveries.reduce((totalVolume, curr) => {
            const unitVolume = curr.handlingUnitOutbounds.reduce((unitAcc: number, unit: any) => {
                const { length, width, height } = unit?.handlingUnit || {};
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
        const form_value = await form.validateFields();
        setIsCreationLoading(true);
        setFieldsValue();

        let roundCalculationProfileId = form_value.roundCalculationProfileId;
        let allowedEquipments = form_value.equipments;

        const allowedDeliveries = deliveries.map((deliveries: any) => deliveries.id);

        const data = {
            roundCalculationProfileId,
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
                if (
                    query_result.executeFunction.output.output?.code == 200 &&
                    query_result.executeFunction.output.output?.variables?.nbRoundsCreated > 0
                ) {
                    showSuccess(
                        t('messages:rounds-created', {
                            nb:
                                query_result.executeFunction.output.output.variables
                                    .roundCalculationNumber +
                                ' : ' +
                                query_result.executeFunction.output.output.variables.nbRoundsCreated
                        })
                    );
                } else {
                    showWarning(t('messages:no-round-created'));
                }
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        } finally {
            setIsCreationLoading(false);
            setAreEquipmentsSelected(false);
            setIsProfileSelected(false);
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
                <Form.Item name="roundCalculationProfileId">
                    <Select
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:round-calculation-profiles')
                        })}`}
                        style={{ width: '100%' }}
                        onChange={handleProfileChange}
                        disabled={areEquipmentsSelected}
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
                <Form.Item name="equipments">
                    <Select
                        mode="multiple"
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:equipment')
                        })}`}
                        style={{ width: '100%' }}
                        onChange={handleEquipmentsChange}
                        disabled={isProfileSelected}
                    >
                        {equipments.map((equipment) => (
                            <Select.Option key={equipment.id} value={equipment.id}>
                                {equipment.name}
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
                    <br />
                    {`${t('common:weight')} : ${calculateTotalWeight(deliveries)} kg`}
                </Text>
            )}
        </Modal>
    );
};

export { DeliveriesManualAllocationModal };
