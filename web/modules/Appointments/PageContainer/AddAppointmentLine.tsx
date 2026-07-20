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
import { LinkButton } from '@components';
import {
    getModesFromPermissions,
    pathParams,
    showError,
    showSuccess,
    findCodeByScopeAndValue,
    getAppointmentDirection,
    getLoadTypeCodesForDirection,
    getOrderTypeCodesForDirection,
    isAppointmentLinkEnabled,
    isCarrierAppointmentUser,
    LoadModelV2,
    DeliveryModelV2,
    CustomerOrderModelV2,
    PurchaseOrderModelV2
} from '@helpers';
import type { LoadDirection } from '@helpers';
import { Button, Empty, Modal, Radio, Space } from 'antd';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { appointmentsRoutes } from '../Static/appointmentsRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    appointmentId: string | any;
    appointmentName: string | any;
    appointmentType?: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
    carrierId: string | any;
}

// entity type -> its model / appointmentLine FK / detail route / label + whether the
// appointment carrier|stockOwner filters apply. Loads carry a carrier but no stock owner.
type EntityKey = 'loads' | 'deliveries' | 'orders' | 'purchaseOrders';

const AddAppointmentLine = (props: ISingleItemProps) => {
    const { permissions, configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    const modes = getModesFromPermissions(permissions, Table.AppointmentLine);
    // carriers cannot attach appointment lines (read-only), even via a direct URL to this page
    const isCarrier = isCarrierAppointmentUser(permissions);
    // the real appointment direction (may be 'visit' or undefined when the type is missing, e.g.
    // direct URL navigation without the query param) — availableTypes is gated on it below
    const apptDirection = getAppointmentDirection(props.appointmentType, configs);
    const direction: LoadDirection = apptDirection === 'inbound' ? 'inbound' : 'outbound';

    const entityDefs: Record<EntityKey, any> = useMemo(
        () => ({
            loads: {
                model: LoadModelV2,
                fk: 'loadId',
                detailRoot: '/loads',
                label: t('common:loads')
            },
            deliveries: {
                model: DeliveryModelV2,
                fk: 'deliveryId',
                detailRoot: '/deliveries',
                label: t('common:deliveries')
            },
            orders: {
                model: CustomerOrderModelV2,
                fk: 'orderId',
                detailRoot: '/customer-orders',
                label: t('common:orders')
            },
            purchaseOrders: {
                model: PurchaseOrderModelV2,
                fk: 'purchaseOrderId',
                detailRoot: '/purchase-orders',
                label: t('common:purchaseOrders')
            }
        }),
        [t]
    );

    // which entity types are available for this appointment (direction + DB configs)
    const availableTypes = useMemo(() => {
        const types: EntityKey[] = [];
        if (apptDirection === 'inbound') {
            if (isAppointmentLinkEnabled(configs, 'unloads')) types.push('loads');
            if (isAppointmentLinkEnabled(configs, 'purchase_orders')) types.push('purchaseOrders');
        } else if (apptDirection === 'outbound') {
            if (isAppointmentLinkEnabled(configs, 'loads')) types.push('loads');
            if (isAppointmentLinkEnabled(configs, 'deliveries')) types.push('deliveries');
        } else {
            // visit or unclassifiable appointment → no entity types can be linked
            return [];
        }
        if (isAppointmentLinkEnabled(configs, 'orders')) types.push('orders');
        return types;
    }, [configs, apptDirection]);

    const [activeType, setActiveType] = useState<EntityKey | undefined>(undefined);
    useEffect(() => {
        if (!activeType && availableTypes.length > 0) setActiveType(availableTypes[0]);
    }, [availableTypes, activeType]);

    const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
    const [selectedRowKeysInfo, setSelectedRowKeysInfo] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [isAssignLoading, setIsAssignLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refetch, setRefetch] = useState(false);

    // filters for the active entity type: loads by direction type + carrier; deliveries not
    // shipped; orders by direction order-type; deliveries/orders/POs by carrier (via shipping
    // mode) & stock owner when present. Loads have no stock owner.
    const advancedFilters = useMemo(() => {
        const carrierClause = props.carrierId
            ? [{ filter: [{ searchType: 'EQUAL', field: { carrierId: props.carrierId } }] }]
            : [];
        const carrierShipClause = props.carrierId
            ? [
                  {
                      filter: [
                          {
                              searchType: 'EQUAL',
                              field: { carrierShippingMode_CarrierId: props.carrierId }
                          }
                      ]
                  }
              ]
            : [];
        const stockOwnerClause = props.stockOwnerId
            ? [{ filter: [{ searchType: 'EQUAL', field: { stockOwnerId: props.stockOwnerId } }] }]
            : [];
        if (activeType === 'loads') {
            const dispatched = parseInt(
                findCodeByScopeAndValue(configs, 'load_status', 'Dispatched') ?? '0',
                10
            );
            const typeCodes = getLoadTypeCodesForDirection(direction, configs);
            return [
                { filter: [{ searchType: 'INFERIOR', field: { status: dispatched } }] },
                // fail-closed: unresolved load types must propose no load rather than any
                // direction, which could attach a wrong-direction load to the appointment.
                {
                    filter: [
                        { searchType: 'EQUAL', field: { type: typeCodes.length ? typeCodes : [-1] } }
                    ]
                },
                ...carrierClause
            ];
        }
        if (activeType === 'deliveries') {
            const dispatched = parseInt(
                findCodeByScopeAndValue(configs, 'delivery_status', 'Dispatched') ?? '0',
                10
            );
            return [
                { filter: [{ searchType: 'INFERIOR', field: { status: dispatched } }] },
                ...carrierShipClause,
                ...stockOwnerClause
            ];
        }
        if (activeType === 'orders') {
            const orderTypeCodes = getOrderTypeCodesForDirection(direction, configs);
            return [
                // fail-closed: unresolved order types must propose no order rather than any
                // direction/type.
                {
                    filter: [
                        {
                            searchType: 'EQUAL',
                            field: { orderType: orderTypeCodes.length ? orderTypeCodes : [-1] }
                        }
                    ]
                },
                ...carrierShipClause,
                ...stockOwnerClause
            ];
        }
        // purchaseOrders: no carrier
        return [...stockOwnerClause];
    }, [activeType, direction, configs, props.carrierId, props.stockOwnerId]);

    const activeDef = activeType ? entityDefs[activeType] : undefined;

    const appointmentDetailBreadCrumb = [
        ...appointmentsRoutes,
        {
            breadcrumbName: `${props.appointmentName}`,
            path: '/appointments/' + props.appointmentId
        }
    ];
    const breadCrumb = [
        ...appointmentDetailBreadCrumb,
        {
            breadcrumbName: t('actions:add') + ' ' + t('common:appointment-line')
        }
    ];

    const resetSelection = () => {
        setSelectedRowKeys([]);
        setSelectedRowKeysInfo([]);
    };

    // Cross-page selection via antd's preserveSelectedRowKeys: merge the provided rows
    // (current page + preserved) by id into the name snapshots, keeping only ids still in `keys`.
    const onSelectChange = (newSelectedRowKeys: any[], newSelectedRows?: any[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
        setSelectedRowKeysInfo((prev) => {
            const byId = new Map<any, any>();
            prev.forEach((info: any) => byId.set(info.id, info));
            (newSelectedRows ?? [])
                .filter((row) => row && row.id != null)
                .forEach((row) => byId.set(row.id, { id: row.id, name: row.name || row.id }));
            return newSelectedRowKeys
                .map((key) => {
                    if (byId.has(key)) return byId.get(key);
                    const info = tableData.find((row) => row.id === key);
                    return info ? { id: info.id, name: info.name || info.id } : undefined;
                })
                .filter((info) => !!info);
        });
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        preserveSelectedRowKeys: true
    };

    const handleShowConfirmModal = () => {
        if (selectedRowKeys.length === 0) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        setShowConfirmModal(true);
    };

    const handleAssign = async () => {
        if (selectedRowKeys.length === 0 || !activeDef) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        setIsAssignLoading(true);
        try {
            const mutation = gql`
                mutation createAppointmentLine($input: CreateAppointmentLineInput!) {
                    createAppointmentLine(input: $input) {
                        id
                    }
                }
            `;
            await Promise.all(
                selectedRowKeys.map((entityId: string) =>
                    graphqlRequestClient.request(mutation, {
                        input: {
                            appointmentId: props.appointmentId,
                            stockOwnerId: props.stockOwnerId,
                            [activeDef.fk]: entityId
                        }
                    })
                )
            );
            showSuccess(t('messages:success-creating-data'));
            resetSelection();
            router.push(`/appointments/${props.appointmentId}`);
        } catch (error) {
            console.error('Error creating appointment lines:', error);
            showError(t('messages:error-creating-data'));
        } finally {
            setIsAssignLoading(false);
            setShowConfirmModal(false);
        }
    };

    const hasSelected = selectedRowKeys.length > 0;

    const headerData: HeaderData = {
        title: t('actions:add') + ' ' + t('common:appointment-line'),
        routes: breadCrumb,
        actionsComponent: null
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {availableTypes.length > 1 && (
                        <Radio.Group
                            value={activeType}
                            onChange={(e) => {
                                setActiveType(e.target.value);
                                resetSelection();
                            }}
                            optionType="button"
                        >
                            {availableTypes.map((typeKey) => (
                                <Radio.Button key={typeKey} value={typeKey}>
                                    {entityDefs[typeKey].label}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    )}
                    <Button
                        type="primary"
                        onClick={handleShowConfirmModal}
                        disabled={!hasSelected}
                        loading={isAssignLoading}
                    >
                        {t('actions:assign')}
                    </Button>
                    <Button onClick={resetSelection} disabled={!hasSelected}>
                        {t('actions:cancel')}
                    </Button>
                    {hasSelected && (
                        <span>
                            {t('messages:selected-items-number', {
                                number: selectedRowKeys.length
                            })}
                        </span>
                    )}
                </div>
            ) : null
    };

    if (isCarrier || !activeDef) {
        // carriers can't attach lines (read-only); otherwise no linkable entity type for this
        // appointment (unknown/visit direction, or every link type disabled by config) —
        // show an empty state rather than a blank page
        return <Empty description={t('messages:no-data')} style={{ marginTop: 48 }} />;
    }

    return (
        <>
            <Modal
                title={t('add2', { name: t('common:appointment-line') })}
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
                        onClick={handleAssign}
                    >
                        {t('actions:confirm')}
                    </Button>
                ]}
                width={600}
            >
                <div style={{ padding: '16px 0' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>{t('common:appointment')}:</strong>
                        <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {props.appointmentName}
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>
                            {activeDef.label} ({selectedRowKeysInfo.length}):
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
                            {selectedRowKeysInfo.map((row: any, index: number) => (
                                <div
                                    key={row.id}
                                    style={{
                                        padding: '8px 0',
                                        borderBottom:
                                            index < selectedRowKeysInfo.length - 1
                                                ? '1px solid #f0f0f0'
                                                : 'none',
                                        fontWeight: '500'
                                    }}
                                >
                                    {row.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
            <ListComponent
                key={`add-line-${activeType}`}
                headerData={headerData}
                dataModel={activeDef.model}
                advancedFilters={advancedFilters}
                setData={setTableData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${activeDef.detailRoot}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${activeDef.detailRoot}/:id`}
                checkbox={true}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
            />
        </>
    );
};

export { AddAppointmentLine };
