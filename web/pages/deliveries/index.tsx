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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DeliveryModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import configs from '../../../common/configs.json';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { DeliveryProgressBar } from 'modules/Deliveries/Elements/DeliveryProgressBar';
import { cancelHuoDeliveryStatus as statusForCancelation } from '@helpers';
import AssignLoadModal from 'modules/Preload/AssignLoadModal';
import AssignToAppointmentModal from 'modules/Appointments/AssignToAppointmentModal';
import { useAssignSelection } from 'modules/Preload/useAssignSelection';
import { isAppointmentLinkEnabled, isPreloadLinkEnabled } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPages: PageComponent = () => {
    const { permissions, configs: dbConfigs } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refetch, setRefetch] = useState<boolean>(false);
    const [assignLoadOpen, setAssignLoadOpen] = useState(false);
    const [assignApptOpen, setAssignApptOpen] = useState(false);

    // selection accumulated across pages; a delivery can receive a load/appointment only
    // while it is not shipped (< Dispatched); its carrier comes from the shipping mode
    const {
        selectedRowKeys,
        rowSelection,
        eligibleIds,
        commonCarrierId,
        hasMixedCarrier,
        reset: resetSelection
    } = useAssignSelection({
        tableData,
        isEligible: (row) => row?.status < configs.DELIVERY_STATUS_DISPATCHED,
        carrierOf: (row) => row?.carrierShippingMode_carrierId ?? null
    });
    const canAssign = eligibleIds.length > 0 && !hasMixedCarrier;
    const apptLinkEnabled = isAppointmentLinkEnabled(dbConfigs, 'deliveries');
    const preloadLinkEnabled = isPreloadLinkEnabled(dbConfigs, 'deliveries');
    const headerData: HeaderData = {
        title: t('common:deliveries'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:delivery') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    // CUBING
    const [isCubingLoading, setIsCubingLoading] = useState(false);
    //RESTART HERE: adapt to multi deliverylines
    const cubingDelivery = () => {
        Modal.confirm({
            title: t('messages:cubing-confirm'),
            onOk: async () => {
                setIsCubingLoading(true);
                const deliveries: Array<any> = [];
                selectedRowKeys?.forEach((deliveryId: string) => {
                    deliveries.push({ id: deliveryId });
                });

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'custom_cubing',
                    event: {
                        deliveries: deliveries
                    }
                };

                try {
                    const cubingResult = await graphqlRequestClient.request(query, variables);
                    if (cubingResult.executeFunction.status === 'ERROR') {
                        showError(cubingResult.executeFunction.output);
                    } else if (
                        cubingResult.executeFunction.status === 'OK' &&
                        cubingResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${cubingResult.executeFunction.output.output.code}`));
                        console.log('Backend_message', cubingResult.executeFunction.output.output);
                    } else {
                        showSuccess(t('messages:success-cubing'));
                        setRefetch(true);
                    }
                    setIsCubingLoading(false);
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                    setIsCubingLoading(false);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const hasSelected = selectedRowKeys.length > 0;
    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <span className="selected-items-span" style={{ marginLeft: 16 }}>
                        {hasSelected
                            ? `${t('messages:selected-items-number', {
                                  number: selectedRowKeys.length
                              })}`
                            : ''}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={cubingDelivery}
                            disabled={!hasSelected}
                            loading={loading}
                        >
                            {t('actions:cubing')}
                        </Button>
                    </span>
                    {preloadLinkEnabled && (
                        <span style={{ marginLeft: 16 }}>
                            <Button onClick={() => setAssignLoadOpen(true)} disabled={!canAssign}>
                                {t('actions:assign-to-load')}
                            </Button>
                        </span>
                    )}
                    {apptLinkEnabled && (
                        <span style={{ marginLeft: 16 }}>
                            <Button onClick={() => setAssignApptOpen(true)} disabled={!canAssign}>
                                {t('actions:assign-to-appointment')}
                            </Button>
                        </span>
                    )}
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={t('common:deliveries')} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={refetch}
                setData={setTableData}
                extraColumns={[
                    {
                        title: 'd:progress',
                        key: 'progress',
                        render: (record: { id: string; status: number }) => {
                            return <DeliveryProgressBar id={record.id} status={record.status} />;
                        },
                        fixed: false
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            managedByExternalSystem: boolean;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status < configs.DELIVERY_STATUS_LOADED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable &&
                                !record?.managedByExternalSystem &&
                                statusForCancelation.delivery.includes(record?.status) ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
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
            />
            <AssignLoadModal
                open={assignLoadOpen}
                onClose={() => setAssignLoadOpen(false)}
                entityIds={eligibleIds}
                direction="outbound"
                carrierId={commonCarrierId}
                update={{ mutation: 'updateDeliveries', inputType: 'UpdateDeliveryInput' }}
                onDone={() => {
                    resetSelection();
                    setRefetch((prev) => !prev);
                }}
            />
            <AssignToAppointmentModal
                open={assignApptOpen}
                onClose={() => setAssignApptOpen(false)}
                entityIds={eligibleIds}
                fkField="deliveryId"
                direction="outbound"
                carrierId={commonCarrierId}
                onDone={() => {
                    resetSelection();
                    setRefetch((prev) => !prev);
                }}
            />
        </>
    );
};

DeliveryPages.layout = MainLayout;

export default DeliveryPages;
