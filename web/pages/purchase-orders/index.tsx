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
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { PurchaseOrderModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';
import { PurchaseOrderProgressBar } from 'modules/PurchaseOrders/Elements/PurchaseOrderProgressBar';
import AssignLoadModal from 'modules/Preload/AssignLoadModal';
import AssignToAppointmentModal from 'modules/Appointments/AssignToAppointmentModal';
import { useAssignSelection } from 'modules/Preload/useAssignSelection';
import { isAppointmentLinkEnabled, isPreloadLinkEnabled } from '@helpers';
import configs from '../../../common/configs.json';
type PageComponent = FC & { layout: typeof MainLayout };

const PurchaseOrderPages: PageComponent = () => {
    const { permissions, configs: dbConfigs } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [tableData, setTableData] = useState<any[]>([]);
    const [refetch, setRefetch] = useState<boolean>(false);
    const [assignLoadOpen, setAssignLoadOpen] = useState(false);
    const [assignApptOpen, setAssignApptOpen] = useState(false);

    // selection across pages; a PO can receive a load/appointment only while not finished.
    // Purchase orders have no carrier, so no carrier-uniformity constraint applies.
    const {
        selectedRowKeys,
        rowSelection,
        eligibleIds,
        reset: resetSelection
    } = useAssignSelection({
        tableData,
        isEligible: (row) =>
            row?.status !== configs.PURCHASE_ORDER_STATUS_CLOSED &&
            row?.status !== configs.PURCHASE_ORDER_STATUS_CANCELED,
        // assign-to-load / assign-to-appointment are the only bulk actions here → block
        // selecting ineligible (closed / canceled) rows
        disableIneligibleCheckbox: true
    });
    const hasSelected = selectedRowKeys.length > 0;
    const canAssign = eligibleIds.length > 0;
    const apptLinkEnabled = isAppointmentLinkEnabled(dbConfigs, 'purchase_orders');
    const preloadLinkEnabled = isPreloadLinkEnabled(dbConfigs, 'purchase_orders');

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

    const headerData: HeaderData = {
        title: t('common:purchaseOrders'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:purchaseOrder') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                setData={setTableData}
                refetch={refetch}
                extraColumns={[
                    {
                        title: 'd:progress',
                        key: 'progress',
                        render: (record: { id: string; status: number }) => (
                            <PurchaseOrderProgressBar id={record.id} status={record.status} />
                        )
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            type: number;
                            purchaseOrderLines: Array<number> | undefined;
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
                                record.status !== configs.PURCHASE_ORDER_STATUS_CLOSED ? (
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
                                record.status < configs.PURCHASE_ORDER_STATUS_CLOSED &&
                                !record.purchaseOrderLines ? (
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
                                model.isDeletable &&
                                record.type !== configs.PURCHASE_ORDER_TYPE_L3 &&
                                record.type !== configs.PURCHASE_ORDER_TYPE_L3_RETURN &&
                                // WARNING : if purchaseOrderLines exists, it means that there is no po line
                                record.purchaseOrderLines ? (
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
                direction="inbound"
                update={{ mutation: 'updatePurchaseOrders', inputType: 'UpdatePurchaseOrderInput' }}
                onDone={() => {
                    resetSelection();
                    setRefetch((prev) => !prev);
                }}
            />
            <AssignToAppointmentModal
                open={assignApptOpen}
                onClose={() => setAssignApptOpen(false)}
                entityIds={eligibleIds}
                fkField="purchaseOrderId"
                direction="inbound"
                onDone={() => {
                    resetSelection();
                    setRefetch((prev) => !prev);
                }}
            />
        </>
    );
};

PurchaseOrderPages.layout = MainLayout;

export default PurchaseOrderPages;
