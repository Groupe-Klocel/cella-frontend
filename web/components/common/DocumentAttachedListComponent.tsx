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
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { showError, showSuccess } from '@helpers';
import { Button, Modal, Space } from 'antd';
import { ListComponent, HeaderData } from 'modules/Crud/ListComponentV2';
import { DocumentAttachmentModelV2 } from 'models/DocumentAttachmentModelV2';
import { AddDocumentsModal } from 'components/common/AddDocumentsModal';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IDocumentAttachedListComponentProps {
    objectId: string;
    objectName: 'Delivery' | 'Load' | 'PurchaseOrder' | 'ThirdParty';
    objectData: { id: string; name: string };
    canModify: boolean;
    setData?: (data: any) => void;
}

const DocumentAttachedListComponent = ({
    objectId,
    objectName,
    objectData,
    canModify,
    setData
}: IDocumentAttachedListComponentProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(false);

    const handleRefetch = () => {
        setRefetchTrigger((prev) => !prev);
    };

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

    const removeDocument = async (documentId: string, documentName: string) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
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

    const documentsHeaderData: HeaderData = {
        title: `${t('common:documents')}`,
        routes: [],
        actionsComponent: canModify ? (
            <Button type="primary" onClick={() => setShowAddDocumentModal(true)}>
                {t('actions:add')}
            </Button>
        ) : null
    };

    return (
        <>
            <ListComponent
                searchCriteria={{ objectId, objectName }}
                dataModel={DocumentAttachmentModelV2}
                headerData={documentsHeaderData}
                setData={setData}
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
                                {canModify && (
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
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                refetch={refetchTrigger}
            />
            <AddDocumentsModal
                showModal={{
                    showAddDocumentModal,
                    setShowAddDocumentModal
                }}
                objectType={objectName}
                objectData={objectData}
                refetch={handleRefetch}
            />
        </>
    );
};

export { DocumentAttachedListComponent };
