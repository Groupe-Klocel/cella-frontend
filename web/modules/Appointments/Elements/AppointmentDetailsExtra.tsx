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
import {
    DeleteOutlined,
    DownloadOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone
} from '@ant-design/icons';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess,
    StatusHistoryDetailExtraModelV2,
    isCarrierAppointmentUser
} from '@helpers';
import { DocumentAttachmentModelV2 } from 'models/DocumentAttachmentModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Descriptions, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AppointmentLineModelV2 } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { AddDocumentsModal } from 'components/common/AddDocumentsModal';

export interface IItemDetailsProps {
    appointmentId?: string | any;
    appointmentName?: string | any;
    appointmentType?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    carrierId?: string | any;
    status?: string | any;
    content?: any;
    setDocumentAttachmentsData?: any;
}

const AppointmentDetailsExtra = ({
    appointmentId,
    appointmentName,
    appointmentType,
    stockOwnerId,
    carrierId,
    status,
    content,
    setDocumentAttachmentsData
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters, configs, permissions } = useAppState();
    const isCarrier = isCarrierAppointmentUser(permissions);
    const { graphqlRequestClient } = useAuth();
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(false);
    const appointmentLineModes = getModesFromPermissions(permissions, Table.AppointmentLine);
    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
    });
    const [appointmentLinedata, setAppointmentLineData] = useState<any[]>([]);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };
        const appointmentStatusConfirmed = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'Confirmed'
        );
        const appointmentStatusCompleted = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'Completed'
        );
        return {
            appointmentStatusConfirmed,
            appointmentStatusCompleted
        };
    }, [configs, parameters]);

    // read-only truck composition (pallets per type + instructions) from the content JSON
    const composition = useMemo(() => {
        const raw =
            typeof content === 'string'
                ? (() => {
                      try {
                          return JSON.parse(content);
                      } catch {
                          return null;
                      }
                  })()
                : content;
        if (!raw) return null;
        const paletteLabel = (code: string) => {
            const p = (parameters ?? []).find(
                (x: any) => x.scope === 'appointment_palette_type' && String(x.code) === String(code)
            );
            return p?.translation?.[router.locale ?? ''] ?? p?.value ?? code;
        };
        const rows = Object.entries(raw.palettes ?? {})
            .filter(([, n]) => n != null)
            .map(([code, n]) => ({ label: paletteLabel(code), value: n as number }));
        if (rows.length === 0 && !raw.instructions) return null;
        return { rows, instructions: raw.instructions as string | undefined };
    }, [content, parameters, router.locale]);

    const appointmentLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:appointment-lines') }),
        routes: [],
        actionsComponent:
            !isCarrier &&
            appointmentLineModes.length > 0 &&
            appointmentLineModes.includes(ModeEnum.Create) &&
            status < configsParamsCodes.appointmentStatusConfirmed ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:appointment-line') })}
                    path={pathParamsFromDictionary('/appointments/line/add', {
                        appointmentId: appointmentId,
                        appointmentName: appointmentName,
                        appointmentType: appointmentType,
                        stockOwnerId: stockOwnerId,
                        carrierId: carrierId
                    })}
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

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    // header RELATED to Documents — documents can be added/removed until the appointment is
    // Completed (later statuses like Cancelled/Refused/No Show are > Completed, so excluded).
    // Fall back to the Confirmed threshold if the Completed code can't be resolved from DB
    // configs, so a missing/unloaded config doesn't disable document management everywhere.
    const documentCutoff =
        configsParamsCodes.appointmentStatusCompleted ??
        configsParamsCodes.appointmentStatusConfirmed;
    const canModifyAppointment = documentCutoff == null || status < documentCutoff;
    const appointmentDocumentsHeaderData: HeaderData = {
        title: `${t('common:documents')}`,
        routes: [],
        actionsComponent: canModifyAppointment ? (
            <Button type="primary" onClick={() => setShowAddDocumentModal(true)}>
                {t('actions:add')}
            </Button>
        ) : null
    };

    // Fonction pour refetch les données
    const handleRefetch = () => {
        setRefetchTrigger((prev) => !prev);
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
            {composition && (
                <>
                    <Divider orientation="left">{t('common:truck-composition')}</Divider>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                        {composition.rows.map((r, i) => (
                            <Descriptions.Item key={i} label={r.label}>
                                {r.value}
                            </Descriptions.Item>
                        ))}
                        {composition.instructions && (
                            <Descriptions.Item
                                label={t('common:composition-instructions')}
                                span={2}
                            >
                                {composition.instructions}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </>
            )}
            {appointmentLineModes.length > 0 && appointmentLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: appointmentId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ appointmentId: appointmentId }}
                        dataModel={AppointmentLineModelV2}
                        headerData={appointmentLineHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteLine,
                            setIdToDelete: setIdToDeleteLine
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableLine,
                            setIdToDisable: setIdToDisableLine
                        }}
                        triggerPriorityChange={{
                            id: priorityStatus.id,
                            setId: setPriorityStatus,
                            newOrder: priorityStatus.newOrder,
                            orderingField: 'created',
                            parentId: 'appointmentId'
                        }}
                        routeDetailPage={'/appointments/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (value: any, record: { id: string }, index: number) => (
                                    <Space>
                                        {isCarrier ||
                                        appointmentLineModes.length == 0 ||
                                        !appointmentLineModes.includes(ModeEnum.Read) ? (
                                            // carriers stay on the read-only sub-list: the line
                                            // detail page still exposes entity links + edit/delete,
                                            // which would bypass the carrier restriction
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/appointments/line/[id]',
                                                        {
                                                            id: record.id,
                                                            count: index + 1
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {!isCarrier &&
                                        appointmentLineModes.length > 0 &&
                                        appointmentLineModes.includes(ModeEnum.Update) &&
                                        AppointmentLineModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/appointments/line/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        count: index + 1
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {!isCarrier &&
                                        appointmentLineModes.length > 0 &&
                                        appointmentLineModes.includes(ModeEnum.Delete) &&
                                        AppointmentLineModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableLine,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {!isCarrier &&
                                        appointmentLineModes.length > 0 &&
                                        appointmentLineModes.includes(ModeEnum.Delete) &&
                                        AppointmentLineModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDeleteLine,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        setData={setAppointmentLineData}
                        searchable={false}
                        disableRowLinks={isCarrier}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: appointmentId, objectName: 'Appointment' }}
                        dataModel={DocumentAttachmentModelV2}
                        headerData={appointmentDocumentsHeaderData}
                        setData={setDocumentAttachmentsData}
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
                                        {canModifyAppointment && (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    removeDocument(record.id, record.name)
                                                }
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
                </>
            ) : (
                <></>
            )}
            {appointmentId && (
                <AddDocumentsModal
                    showModal={{
                        showAddDocumentModal,
                        setShowAddDocumentModal
                    }}
                    objectType="Appointment"
                    objectData={{ id: appointmentId, name: appointmentName }}
                    refetch={handleRefetch}
                />
            )}
        </>
    );
};

export { AppointmentDetailsExtra };
