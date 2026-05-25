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
import { LinkButton } from '@components';
import { LoadExtrasListComponent } from './LoadExtrasListComponent';
import { EyeTwoTone, LinkOutlined } from '@ant-design/icons';
import { pathParams } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponentV2';
import { DocumentAttachedListComponent } from 'components/common/DocumentAttachedListComponent';
import { HandlingUnitOutboundModelV2, DeliveryModelV2, LoadExtrasModelV2 } from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { showError, showSuccess, getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../../common/configs.json';

export interface IItemDetailsProps {
    loadId?: string | any;
    loadData?: any;
    loadName?: string | any;
    setDocumentAttachmentsData?: any;
    isExtrasDisplayed?: boolean | any;
}
const LoadDetailsExtra = ({
    loadId,
    loadData,
    loadName,
    setDocumentAttachmentsData,
    isExtrasDisplayed
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const loadModes = getModesFromPermissions(permissions, LoadExtrasModelV2.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showAssignDeliveryModal, setShowAssignDeliveryModal] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(false);

    //veriffy if load is not dispatched to show or not the assign delivery button
    const canModifyLoad = loadData?.status < configs.LOAD_STATUS_DISPATCHED;

    // header RELATED to Boxes
    const loadBoxesHeaderData: HeaderData = {
        title: `${t('common:associatedLoadsBoxes')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    // Fonction pour refetch les données
    const handleRefetch = () => {
        setRefetchTrigger((prev) => !prev);
    };

    // Fonction pour supprimer l'assignation d'une delivery
    const removeDeliveryAssignment = async (deliveryId: string, deliveryName: string) => {
        Modal.confirm({
            title: t('messages:remove-assignment-confirm'),
            content: t('messages:remove-delivery-from-load-confirm', {
                delivery: deliveryName,
                load: loadData?.name || loadId
            }),
            onOk: async () => {
                try {
                    const mutation = gql`
                        mutation updateDelivery($id: String!, $input: UpdateDeliveryInput!) {
                            updateDelivery(id: $id, input: $input) {
                                id
                                name
                                preAssignedLoadId
                            }
                        }
                    `;

                    const variables = {
                        id: deliveryId,
                        input: {
                            preAssignedLoadId: null
                        }
                    };

                    await graphqlRequestClient.request(mutation, variables);
                    showSuccess(t('messages:success-removed-assignment'));
                    handleRefetch();
                } catch (error) {
                    console.error('Error removing delivery assignment:', error);
                    showError(t('messages:error-removing-assignment'));
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            {loadModes.length > 0 && loadModes.includes(ModeEnum.Read) && isExtrasDisplayed ? (
                <>
                    <LoadExtrasListComponent
                        searchCriteria={{ id: loadId }}
                        loadId={loadId}
                        loadName={loadName}
                        dataModel={LoadExtrasModelV2}
                        canModify={canModifyLoad}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        searchable={false}
                        refresh={true}
                    />
                </>
            ) : (
                <></>
            )}
            <Divider />
            <ListComponent
                searchCriteria={{ objectId: loadId }}
                dataModel={StatusHistoryDetailExtraModelV2}
                headerData={statusHistoryHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ loadId: loadId }}
                dataModel={HandlingUnitOutboundModelV2}
                headerData={loadBoxesHeaderData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams('/boxes/[id]', record.id)}
                            />
                        )
                    }
                ]}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
            />
            <Divider />
            <DocumentAttachedListComponent
                objectId={loadId}
                objectName="Load"
                objectData={loadData}
                canModify={canModifyLoad}
                setData={setDocumentAttachmentsData}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ preAssignedLoadId: loadId }}
                dataModel={DeliveryModelV2}
                headerData={{
                    title: `${t('common:deliveries-pre-assigned')}`,
                    routes: [],
                    actionsComponent: canModifyLoad ? (
                        <LinkButton
                            type="primary"
                            path={`/deliveries/pre-assigned-load?loadId=${loadId}`}
                            title={t('actions:assign-deliveries')}
                        />
                    ) : null
                }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; name: string }) => (
                            <Space>
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={pathParams('/deliveries/[id]', record.id)}
                                />
                                {canModifyLoad && (
                                    <Button
                                        icon={<LinkOutlined />}
                                        danger
                                        onClick={() =>
                                            removeDeliveryAssignment(record.id, record.name)
                                        }
                                        title={t('actions:remove-from-load')}
                                    />
                                )}
                            </Space>
                        )
                    }
                ]}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                refetch={refetchTrigger}
            />
        </>
    );
};

export { LoadDetailsExtra };
