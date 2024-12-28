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
import { DeliveryModelV2 as model } from 'models/DeliveryModelV2';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import configs from '../../../common/configs.json';
import { deliveriesRoutes as itemRoutes } from 'modules/Deliveries/Static/deliveriesRoutes';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { DeliveryProgressBar } from 'modules/Deliveries/Elements/DeliveryProgressBar';
type PageComponent = FC & { layout: typeof MainLayout };

const DeliveryPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [refetch, setRefetch] = useState<boolean>(false);
    const headerData: HeaderData = {
        title: t('common:deliveries'),
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:add2', { name: t('common:delivery') })}
                        path={`${rootPath}/add`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <LinkButton
                        title={t('actions:view-deliveries-without-orders')}
                        path={`/deliveries/without-orders`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
            </Space>
        )
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
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    // CUBING
    const [isCubingLoading, setIsCubingLoading] = useState(false);
    const cubingDelivery = () => {
        Modal.confirm({
            title: t('messages:cubing-confirm'),
            onOk: async () => {
                setIsCubingLoading(true);
                const deliveries: Array<any> = [];
                selectedRowKeys?.forEach((deliveryId) => {
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
                    functionName: 'K_customCubing',
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

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
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
                            onClick={cubingDelivery}
                            disabled={!hasSelected}
                            loading={loading}
                        >
                            {t('actions:cubing')}
                        </Button>
                    </span>
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={refetch}
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
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status < configs.DELIVERY_STATUS_CANCELED ? (
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
                                record?.status < configs.DELIVERY_STATUS_PREPARED ? (
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
        </>
    );
};

DeliveryPages.layout = MainLayout;

export default DeliveryPages;
