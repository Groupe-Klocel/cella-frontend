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
import { useAuth } from 'context/AuthContext';
import { Form, Modal, Space, Button, Spin } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useState, useEffect } from 'react';
import { showError, showSuccess } from '@helpers';
import { DeliveryModelV2 } from 'models/DeliveryModelV2';
import { gql } from 'graphql-request';
import { ListComponentV2Simplify } from 'modules/Crud/ListComponentV2Simplify';

export interface AssignDeliveryModalProps {
    showModal: {
        showAssignDeliveryModal: boolean;
        setShowAssignDeliveryModal: (show: boolean) => void;
    };
    loadData: {
        name: string;
        carrier_name: string | undefined;
        id: string;
        carrierId?: string;
        carrierShippingModeId?: string;
        carrier?: { name: string };
        carrierShippingMode?: { name: string };
    };
    refetch: () => void;
}

const AssignDeliveryModal = ({ showModal, loadData, refetch }: AssignDeliveryModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const [isAssignLoading, setIsAssignLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<any>([]);
    const [tableData, setTableData] = useState<any[]>([]);

    // Configuration des filtres avancés pour deliveries non assignées
    const advancedFilters = [
        {
            filter: [{ searchType: 'EQUAL', field: { preAssignedLoadId: '**null**' } }]
        },
        ...(loadData.carrierId
            ? [
                  {
                      filter: [
                          {
                              searchType: 'EQUAL',
                              field: { carrierShippingMode_CarrierId: loadData.carrierId }
                          }
                      ]
                  }
              ]
            : [])
    ];

    const handleCancel = () => {
        showModal.setShowAssignDeliveryModal(false);
        form.resetFields();
        setSelectedRowKeys([]);
    };

    const handleAssign = async () => {
        if (selectedRowKeys.length === 0) {
            showError(t('messages:please-select-deliveries'));
            return;
        }

        setIsAssignLoading(true);
        try {
            const mutation = gql`
                mutation updateDeliveries($ids: [String!]!, $input: UpdateDeliveryInput!) {
                    updateDeliveries(ids: $ids, input: $input)
                }
            `;

            const variables = {
                ids: selectedRowKeys,
                input: {
                    preAssignedLoadId: loadData.id
                }
            };

            await graphqlRequestClient.request(mutation, variables);

            showSuccess(
                t('messages:success-assigned', {
                    count: selectedRowKeys.length,
                    name: t('common:deliveries').toLowerCase()
                })
            );

            refetch();
            handleCancel();
        } catch (error) {
            console.error('Error assigning deliveries:', error);
            showError(t('messages:error-assigning-data'));
        } finally {
            setIsAssignLoading(false);
        }
    };

    // Configuration de la sélection de lignes
    const rowSelection = {
        selectedRowKeys: selectedRowKeys,
        onChange: (newSelectedRowKeys: any) => {
            selectedRowKeys.forEach((key: string) => {
                if (!newSelectedRowKeys.includes(key) && tableData.map((d) => d.id).includes(key)) {
                    setSelectedRowKeys((prevKeys: React.Key[]) =>
                        prevKeys.filter((k) => k !== key)
                    );
                }
            });
            newSelectedRowKeys.forEach((value: string) => {
                if (!selectedRowKeys?.includes(value)) {
                    setSelectedRowKeys((prevKeys: React.Key[]) => [...prevKeys, value]);
                }
            });
        }
    };

    return (
        <Modal
            title={t('actions:assign-deliveries-to-load')}
            open={showModal.showAssignDeliveryModal}
            width={'80%'}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions:cancel')}
                </Button>,
                <Button
                    key="assign"
                    type="primary"
                    loading={isAssignLoading}
                    onClick={handleAssign}
                >
                    {t('actions:assign')}
                </Button>
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <strong>{t('common:load')}: </strong>
                {loadData?.name || '-'}
                <br />
                <strong>{t('d:carrier')}: </strong>
                {loadData?.carrier_name || '-'}
            </div>

            <ListComponentV2Simplify
                headerData={{
                    title: t('common:deliveries'),
                    routes: [],
                    actionsComponent: null
                }}
                dataModel={DeliveryModelV2}
                searchable={false}
                rowSelection={rowSelection}
                advancedFilters={advancedFilters}
                setData={setTableData}
            />

            <div
                style={{
                    marginTop: 16,
                    fontSize: '14px',
                    color: '#666',
                    textAlign: 'center'
                }}
            >
                {selectedRowKeys.length > 0
                    ? `${t('messages:selected-items-number', {
                          number: selectedRowKeys.length
                      })}`
                    : ''}
            </div>
        </Modal>
    );
};

export { AssignDeliveryModal };
