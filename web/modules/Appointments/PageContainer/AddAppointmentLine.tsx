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
    pathParams,
    showError,
    showSuccess,
    LoadModelV2 as loadModel
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { appointmentsRoutes } from '../Static/appointmentsRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    appointmentId: string | any;
    appointmentName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
    carrierId: string | any;
}

const AddAppointmentLine = (props: ISingleItemProps) => {
    const { permissions, configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    const modes = getModesFromPermissions(permissions, Table.AppointmentLine);
    const rootPath = '/loads';

    const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
    const [selectedRowKeysInfo, setSelectedRowKeysInfo] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [isAssignLoading, setIsAssignLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refetch, setRefetch] = useState(false);

    const advancedFilters = useMemo(() => {
        const filters: any[] = [
            {
                filter: [
                    {
                        field: { carrierId: props.carrierId },
                        searchType: 'EQUAL'
                    }
                ]
            }
        ];
        return filters;
    }, [props.carrierId]);

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

    const onSelectChange = (newSelectedRowKeys: any[]) => {
        selectedRowKeys.forEach((key: string) => {
            if (!newSelectedRowKeys.includes(key) && tableData.map((d) => d.id).includes(key)) {
                setSelectedRowKeys((prev) => prev.filter((k) => k !== key));
                setSelectedRowKeysInfo((prev) => prev.filter((info: any) => info.id !== key));
            }
        });
        newSelectedRowKeys.forEach((value: string) => {
            if (!selectedRowKeys.includes(value)) {
                setSelectedRowKeys((prev) => [...prev, value]);
                const loadInfo = tableData.find((load) => load.id === value);
                if (loadInfo) {
                    setSelectedRowKeysInfo((prev) => [
                        ...prev,
                        {
                            id: loadInfo.id,
                            name: loadInfo.name || loadInfo.id
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
        setShowConfirmModal(true);
    };

    const handleCancel = () => {
        setSelectedRowKeys([]);
        setSelectedRowKeysInfo([]);
    };

    const handleAssign = async () => {
        if (selectedRowKeys.length === 0) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        setIsAssignLoading(true);
        try {
            const mutation = gql`
                mutation createAppointmentLine($input: CreateAppointmentLineInput!) {
                    createAppointmentLine(input: $input) {
                        id
                        loadId
                    }
                }
            `;
            await Promise.all(
                selectedRowKeys.map((loadId: string) =>
                    graphqlRequestClient.request(mutation, {
                        input: {
                            appointmentId: props.appointmentId,
                            stockOwnerId: props.stockOwnerId,
                            loadId
                        }
                    })
                )
            );
            showSuccess(t('messages:success-creating-data'));
            handleCancel();
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
                    <Button
                        type="primary"
                        onClick={handleShowConfirmModal}
                        disabled={!hasSelected}
                        loading={isAssignLoading}
                    >
                        {t('actions:assign')}
                    </Button>
                    <Button onClick={handleCancel} disabled={!hasSelected}>
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
                    <h3 style={{ marginBottom: '16px', color: '#1890ff' }}>
                        {t('messages:assignment-summary')}
                    </h3>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>{t('common:appointment')}:</strong>
                        <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {props.appointmentName}
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>
                            {t('common:loads')} ({selectedRowKeysInfo.length}):
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
                            {selectedRowKeysInfo.map((load: any, index: number) => (
                                <div
                                    key={load.id}
                                    style={{
                                        padding: '8px 0',
                                        borderBottom:
                                            index < selectedRowKeysInfo.length - 1
                                                ? '1px solid #f0f0f0'
                                                : 'none',
                                        fontWeight: '500'
                                    }}
                                >
                                    {load.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
            <ListComponent
                headerData={headerData}
                dataModel={loadModel}
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
                checkbox={true}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
            />
        </>
    );
};

export { AddAppointmentLine };
