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
import {
    CalculatorTwoTone,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone
} from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { CreditModelV2 as model } from 'models/CreditModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { creditsRoutes as itemRoutes } from 'modules/Credits/Static/creditsRoutes';
import configs from '../../../common/configs.json';

import { CreditPaymentModal } from 'modules/Credits/Modals/CreditPaymentModal';
import { ModeEnum } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const CreditPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [commonStatus, setCommonStatus] = useState<number | undefined>();
    const [showCreditPaymentModal, setShowCreditPaymentModal] = useState(false);
    const [orderId, setOrderId] = useState<any>();
    const [refetchCreditPayment, setRefetchCreditPayment] = useState<boolean>(false);

    const headerData: HeaderData = {
        title: t('common:credits'),
        routes: itemRoutes,
        actionsComponent: undefined
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

    const onSelectChange = (newSelectedRowKeys: React.Key[], newSelectedRows: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
        setSelectedRows(newSelectedRows);
        if (newSelectedRows.length === 0) return undefined;
        const firstStatus = newSelectedRows[0].status;
        const allSameStatus = newSelectedRows.every((item: any) => item.status === firstStatus);
        setCommonStatus(allSameStatus ? firstStatus : undefined);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled: record.status == configs.ORDER_STATUS_CLOSED ? true : false
        })
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                searchCriteria={{ orderType: configs.ORDER_TYPE_CREDIT }}
                headerData={headerData}
                dataModel={model}
                rowSelection={rowSelection}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status < configs.ORDER_STATUS_CLOSED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status == configs.ORDER_STATUS_TO_BE_PAID ? (
                                    <Button
                                        icon={<CalculatorTwoTone twoToneColor="orange" />}
                                        onClick={() => {
                                            setShowCreditPaymentModal(true);
                                            setOrderId(record.id);
                                        }}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
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
                refetch={triggerRefresh}
            />
            <CreditPaymentModal
                showModal={{
                    showCreditPaymentModal,
                    setShowCreditPaymentModal
                }}
                setRefetch={setRefetchCreditPayment}
                orderId={orderId}
            />
        </>
    );
};

CreditPages.layout = MainLayout;

export default CreditPages;
