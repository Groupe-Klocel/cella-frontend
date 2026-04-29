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
import { EyeTwoTone, LinkOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { pathParams } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponentV2';
import { HandlingUnitOutboundModelV2, DeliveryModelV2 } from '@helpers';
import { DocumentAttachmentModelV2 } from 'models/DocumentAttachmentModelV2';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';
import { AddDocumentsModal } from 'components/common/AddDocumentsModal';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { showError, showSuccess } from '@helpers';
import configs from '../../../../common/configs.json';

export interface IItemDetailsProps {
    loadId?: string | any;
    loadData?: any;
    setDocumentAttachmentsData?: any;
}
const LoadDetailsExtra = ({ loadId, loadData, setDocumentAttachmentsData }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(false);

    //veriffy if load is not dispatched to show or not the assign delivery button
    const canModifyLoad = loadData?.status < configs.LOAD_STATUS_DISPATCHED;

    // header RELATED to Boxes
    const loadBoxesHeaderData: HeaderData = {
        title: `${t('common:associatedLoadsBoxes')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to Documents
    const loadDocumentsHeaderData: HeaderData = {
        title: `${t('common:documents')}`,
        routes: [],
        actionsComponent: canModifyLoad ? (
            <Button type="primary" onClick={() => setShowAddDocumentModal(true)}>
                {t('actions:add')}
            </Button>
        ) : null
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

    // Fonction pour télécharger un document
    const downloadDocument = (base64Data: string, fileName: string, fileType: string) => {
        try {
            const byteCharacters = window.atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            showError(t('messages:error-downloading-document'));
        }
    };

    // Fonction pour supprimer un document
    const removeDocument = async (documentId: string, documentName: string) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            // content: t('messages:delete-document-confirm', {
            //     document: documentName
            // }),
            onOk: async () => {
                try {
                    const mutation = gql`
                        mutation deleteDocumentAttachment($id: String!) {
                            deleteDocumentAttachment(id: $id)
                        }
                    `;

                    const variables = {
                        id: documentId
                    };

                    await graphqlRequestClient.request(mutation, variables);
                    showSuccess(t('messages:success-deleted'));
                    handleRefetch();
                } catch (error) {
                    console.error('Error deleting document:', error);
                    showError(t('messages:error-deleting-data'));
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
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
            <ListComponent
                searchCriteria={{ objectId: loadId, objectName: 'Load' }}
                dataModel={DocumentAttachmentModelV2}
                headerData={loadDocumentsHeaderData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            name: string;
                            filename: string;
                            fileContent: string;
                            extras?: { fullFileType: string };
                        }) => (
                            <Space>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={() =>
                                        downloadDocument(
                                            record.fileContent,
                                            record.filename || record.name,
                                            record.extras?.fullFileType ||
                                                'application/octet-stream'
                                        )
                                    }
                                    title={t('actions:download')}
                                />
                                {canModifyLoad && (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() => removeDocument(record.id, record.name)}
                                        title={t('actions:delete')}
                                    />
                                )}
                            </Space>
                        )
                    }
                ]}
                setData={setDocumentAttachmentsData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                refetch={refetchTrigger}
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

            {loadData && (
                <>
                    <AddDocumentsModal
                        showModal={{
                            showAddDocumentModal,
                            setShowAddDocumentModal
                        }}
                        objectType="Load"
                        objectData={loadData}
                        refetch={handleRefetch}
                    />
                </>
            )}
        </>
    );
};

export { LoadDetailsExtra };
