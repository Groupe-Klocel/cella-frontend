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
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DeliveryModelV2 as model } from 'models/DeliveryModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import configs from '../../../../common/configs.json';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import { DeliveryProgressBar } from 'modules/Deliveries/Elements/DeliveryProgressBar';
import { DeliveriesManualAllocationModal } from 'modules/Deliveries/Forms/DeliveriesManualAllocationModal';
type PageComponent = FC & { layout: typeof MainLayout };

const DeliveriesManualAllocationPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [showDeliveriesManualAllocationModal, setShowDeliveriesManualAllocationModal] =
        useState(false);
    const headerData: HeaderData = {
        title: t('common:deliveries-manual-allocation'),
        routes: itemRoutes,
        actionsComponent: null
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
    };

    const resetSelection = () => {
        setSelectedRowKeys([]);
    };

    const hasSelected = selectedRowKeys.length > 0;
    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <span style={{ marginLeft: 16 }}>
                        {hasSelected
                            ? `${t('messages:selected-items-number', {
                                  number: selectedRowKeys.length
                              })}`
                            : ''}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={() => {
                                setShowDeliveriesManualAllocationModal(true);
                            }}
                            disabled={!hasSelected}
                            loading={loading}
                        >
                            {t('actions:manual-allocation')}
                        </Button>
                    </span>
                </>
            ) : null
    };

    const autocountFilter = {
        filter: { field: { autocountHandlingUnitOutbound: 0 }, searchType: 'SUPERIOR' }
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <DeliveriesManualAllocationModal
                showModal={{
                    showDeliveriesManualAllocationModal,
                    setShowDeliveriesManualAllocationModal
                }}
                selectedRowKeys={selectedRowKeys}
                resetSelection={resetSelection}
            />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                searchCriteria={{ status: configs.DELIVERY_STATUS_ESTIMATED }}
                advancedFilters={autocountFilter}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                checkbox={true}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                itemperpage={1000}
            />
        </>
    );
};

DeliveriesManualAllocationPages.layout = MainLayout;

export default DeliveriesManualAllocationPages;