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

import { EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space, Form } from 'antd';
import { gql } from 'graphql-request';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DeliveryModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import { DeliveryProgressBar } from 'modules/Deliveries/Elements/DeliveryProgressBar';
import AutoComplete from 'components/common/smart/Form/MainInputs/AutoCompleteInput';
type PageComponent = FC & { layout: typeof MainLayout };

const DeliveriesManualAllocationPages: PageComponent = () => {
    const { permissions, configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { loadId } = router.query;
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<any>([]);
    const [selectedRowKeysInfo, setSelectedRowKeysInfo] = useState<any>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [carrierFilter, setCarrierFilter] = useState<number | null>(null);
    const [carrierName, setCarrierName] = useState<string | null>(null);
    const [expectedShippingDate, setExpectedShippingDate] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [allSubOptions, setAllSubOptions] = useState<any>([]);
    const [advancedFilters, setAdvancedFilters] = useState<any[]>([
        {
            filter: [{ searchType: 'EQUAL', field: { preAssignedLoadId: '**null**' } }]
        }
    ]);
    const [isAssignLoading, setIsAssignLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refetch, setRefetch] = useState(false);
    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };

        const LoadStatusDispatched = parseInt(
            findCodeByScopeAndValue(configs, 'load_status', 'Dispatched') ?? '0',
            10
        );

        return { LoadStatusDispatched };
    }, [configs]);

    useEffect(() => {
        if (loadId && router.isReady) {
            form.setFieldsValue({ load: loadId });
            handleLoadSelection([loadId as string]);
        }
    }, [loadId, router.isReady, form]);

    useEffect(() => {
        const newAdvancedFilters = [
            {
                filter: [{ searchType: 'EQUAL', field: { preAssignedLoadId: '**null**' } }]
            },
            ...(carrierFilter
                ? [
                      {
                          filter: [
                              {
                                  searchType: 'EQUAL',
                                  field: { carrierShippingMode_CarrierId: carrierFilter }
                              }
                          ]
                      }
                  ]
                : [])
        ];
        setAdvancedFilters(newAdvancedFilters);
    }, [carrierFilter]);

    const handleLoadSelection = async (selectedValues: string[]) => {
        if (selectedValues && selectedValues.length > 0) {
            try {
                // Récupérer les détails complets des loads sélectionnés
                const query = gql`
                    query GetLoadDetails($filters: LoadSearchFilters) {
                        loads(filters: $filters, page: 1, itemsPerPage: 100) {
                            results {
                                id
                                name
                                loadExpectedShippingDate
                                carrierId
                                carrier {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `;

                const variables = {
                    filters: {
                        id: selectedValues
                    }
                };

                const response = await graphqlRequestClient.request(query, variables);
                const selectedLoads = response.loads.results;

                if (selectedLoads && selectedLoads.length > 0) {
                    const carrierId = selectedLoads[0].carrierId;
                    const carrierName = selectedLoads[0].carrier
                        ? selectedLoads[0].carrier.name
                        : null;
                    const expectedShippingDate = selectedLoads[0].loadExpectedShippingDate;
                    setCarrierFilter(carrierId);
                    setCarrierName(carrierName);
                    setExpectedShippingDate(expectedShippingDate);
                } else {
                    setCarrierFilter(null);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des détails du load:', error);
            }
        } else {
            setCarrierFilter(null);
        }

        // Reset la sélection des lignes
        setSelectedRowKeys([]);
    };

    const onValuesChange = (changedValues: any, allValues: any) => {
        if (changedValues.load !== undefined) {
            handleLoadSelection(changedValues.load || []);
        } else if (changedValues.load === undefined || changedValues.load === null) {
            setCarrierFilter(null);
        }
        setSelectedRowKeys([]);
        setSelectedRowKeysInfo([]);
    };

    const headerData: HeaderData = {
        title: t('common:assign-deliveries-to-load'),
        routes: itemRoutes,
        actionsComponent: null
    };

    const onSelectChange = (newSelectedRowKeys: any) => {
        selectedRowKeys.forEach((key: string) => {
            if (!newSelectedRowKeys.includes(key) && tableData.map((d) => d.id).includes(key)) {
                setSelectedRowKeys((prevKeys: React.Key[]) => prevKeys.filter((k) => k !== key));
                setSelectedRowKeysInfo((prevInfo: any) =>
                    prevInfo.filter((info: any) => info.id !== key)
                );
            }
        });

        newSelectedRowKeys.forEach((value: string) => {
            if (!selectedRowKeys?.includes(value)) {
                setSelectedRowKeys((prevKeys: React.Key[]) => [...prevKeys, value]);
                const deliveryInfo = tableData.find((delivery) => delivery.id === value);
                if (deliveryInfo) {
                    setSelectedRowKeysInfo((prevInfo: any) => [
                        ...prevInfo,
                        {
                            id: deliveryInfo.id,
                            name: deliveryInfo.name || deliveryInfo.id,
                            estimatedNumberOfBoxes: deliveryInfo.estimatedNumberOfBoxes,
                            estimatedNumberOfPalettes: deliveryInfo.estimatedNumberOfPalettes,
                            estimatedLoadMeters: deliveryInfo.estimatedLoadMeters
                        }
                    ]);
                }
            }
        });
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
    };

    const handleShowConfirmModal = () => {
        if (selectedRowKeys.length === 0) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        if (!form.getFieldValue('load')) {
            showError(t('messages:please-select-one-element'));
            return;
        }
        setShowConfirmModal(true);
    };

    const getSelectedLoadName = () => {
        const loadOptions = allSubOptions.find((option: any) => option.hasOwnProperty('load'));
        if (loadOptions && loadOptions.load) {
            const selectedLoad = loadOptions.load.find(
                (load: any) => load.key === form.getFieldValue('load')
            );
            return selectedLoad ? selectedLoad.text : form.getFieldValue('load');
        }
        return form.getFieldValue('load');
    };

    const handleCancel = () => {
        setSelectedRowKeys([]);
        setSelectedRowKeysInfo([]);
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
                    preAssignedLoadId: form.getFieldValue('load')
                        ? form.getFieldValue('load').toString()
                        : null
                }
            };

            await graphqlRequestClient.request(mutation, variables);

            showSuccess(t('messages:success-assigned'));
            handleCancel();
        } catch (error) {
            console.error('Error assigning deliveries:', error);
            showError(t('messages:error-assigning-data'));
        } finally {
            setIsAssignLoading(false);
            form.resetFields();
            setSelectedRowKeys([]);
            setSelectedRowKeysInfo([]);
            setCarrierFilter((prev) => (loadId ? prev : null)); // Reset le filtre transporteur si on vient de la page d'un load
            setRefetch((prev) => !prev); // Trigger refresh of the list
        }
    };

    const autoCompleteInfos = {
        name: 'load',
        optionTable: {
            table: 'Load',
            fieldToDisplay: 'name'
        },
        advancedFilters: [
            {
                filter: [
                    {
                        searchType: 'INFERIOR',
                        field: { status: configsParamsCodes.LoadStatusDispatched }
                    }
                ]
            }
        ],
        initialValue: loadId ? [loadId] : undefined
    } as any;

    const hasSelected = selectedRowKeys.length > 0;
    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginLeft: 16 }}>
                        <Form
                            form={form}
                            onValuesChange={onValuesChange}
                            style={{ marginBottom: 16, width: '850px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <AutoComplete
                                    key={`loadSelector-${loadId || 'default'}`}
                                    item={autoCompleteInfos}
                                    setAllSubOptions={setAllSubOptions}
                                    style={{ width: '400px' }}
                                />
                                {carrierName && (
                                    <div style={{ marginBottom: 16 }}>
                                        <strong>{t('d:carrier')}:</strong> {carrierName}
                                    </div>
                                )}
                                {expectedShippingDate && (
                                    <div style={{ marginBottom: 16 }}>
                                        <strong>{t('d:expectedShippingDate')}:</strong>{' '}
                                        {new Date(expectedShippingDate).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                            <Button
                                type="primary"
                                onClick={handleShowConfirmModal}
                                disabled={!hasSelected || !form.getFieldValue('load')}
                                loading={isAssignLoading}
                            >
                                {t('actions:assign')}
                            </Button>
                            <span style={{ marginLeft: 16 }}>
                                {hasSelected
                                    ? `${t('messages:selected-items-number', {
                                          number: selectedRowKeys.length
                                      })}`
                                    : ''}
                            </span>
                        </Form>
                    </span>
                </div>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <Modal
                title={t('actions:assign')}
                open={showConfirmModal}
                onCancel={() => setShowConfirmModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowConfirmModal(false)}>
                        {t('actions:cancel')}
                    </Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        loading={isAssignLoading}
                        onClick={() => {
                            setShowConfirmModal(false);
                            handleAssign();
                        }}
                    >
                        {t('actions:confirm')}
                    </Button>
                ]}
                width={600}
            >
                <div style={{ padding: '16px 0' }}>
                    <h3 style={{ marginBottom: '16px', color: '#1890ff' }}>
                        {t('messages:assignment-summary')}
                    </h3>

                    <div style={{ marginBottom: '16px' }}>
                        <strong>{t('d:load')}:</strong>
                        <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {getSelectedLoadName()}
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <strong>
                            {t('common:deliveries')} ({selectedRowKeysInfo.length}):
                        </strong>
                        <div
                            style={{
                                marginLeft: '16px',
                                marginTop: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                padding: '8px'
                            }}
                        >
                            {selectedRowKeysInfo.map((delivery: any, index: number) => (
                                <div
                                    key={delivery.id}
                                    style={{
                                        padding: '8px 0',
                                        borderBottom:
                                            index < selectedRowKeysInfo.length - 1
                                                ? '1px solid #f0f0f0'
                                                : 'none'
                                    }}
                                >
                                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                        {delivery.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>{t('messages:estimated-load-details')}:</strong>
                        <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            <div style={{ padding: '8px 0' }}>
                                <div>
                                    {t('d:estimatedNumberOfBoxes')}:{' '}
                                    {selectedRowKeysInfo.reduce(
                                        (total: number, delivery: any) =>
                                            total + (delivery.estimatedNumberOfBoxes || 0),
                                        0
                                    )}
                                </div>
                                <div>
                                    {t('d:estimatedNumberOfPalettes')}:{' '}
                                    {selectedRowKeysInfo.reduce(
                                        (total: number, delivery: any) =>
                                            total + (delivery.estimatedNumberOfPalettes || 0),
                                        0
                                    )}
                                </div>
                                <div>
                                    {t('d:estimatedLoadMeters')}:{' '}
                                    {selectedRowKeysInfo.reduce(
                                        (total: number, delivery: any) =>
                                            total + (delivery.estimatedLoadMeters || 0),
                                        0
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            <ListComponent
                headerData={headerData}
                dataModel={model}
                advancedFilters={advancedFilters}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                setData={setTableData}
                extraColumns={[
                    {
                        title: 'd:progress',
                        key: 'progress',
                        render: (record: { id: string; status: number }) => (
                            <DeliveryProgressBar id={record.id} status={record.status} />
                        )
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
                checkbox={carrierFilter ? true : false}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
            />
        </>
    );
};

DeliveriesManualAllocationPages.layout = MainLayout;

export default DeliveriesManualAllocationPages;
