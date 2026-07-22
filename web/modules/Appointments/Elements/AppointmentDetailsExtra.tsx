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

import { LinkButton, SinglePrintDocumentSetModal } from '@components';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone,
    PrinterOutlined
} from '@ant-design/icons';
import {
    findCodeByScopeAndValue,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess,
    StatusHistoryDetailExtraModelV2,
    isCarrierAppointmentUser
} from '@helpers';
import 'moment/min/locales';
import moment from 'moment';
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
    printLanguage?: string | any;
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
    printLanguage,
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
    const loadModes = getModesFromPermissions(permissions, Table.Load);
    const [showLinePrintModal, setShowLinePrintModal] = useState(false);
    const [linePrintLoadId, setLinePrintLoadId] = useState<string>();
    const [linePrintReference, setLinePrintReference] = useState<string>();
    const [lineLoadDocuments, setLineLoadDocuments] = useState<any>();
    const [lineDocumentAttachments, setLineDocumentAttachments] = useState<any>();
    // "print all loads" flow: one shared selection pop-up (union of the loads' document lists),
    // then one generateDocuments call per load so each keeps its own reference and attachments
    const [showPrintAllLoadsModal, setShowPrintAllLoadsModal] = useState(false);
    const [allLoadsDocuments, setAllLoadsDocuments] = useState<any>();
    const [allLoadsAttachments, setAllLoadsAttachments] = useState<any>();
    const [multiplePrintTargets, setMultiplePrintTargets] = useState<any[]>([]);

    //retrieve client's date for printing
    const local = moment();
    local.locale();
    const dateLocal = local.format('l') + ', ' + local.format('LT');
    const statusDispatched = parseInt(
        findCodeByScopeAndValue(configs, 'delivery_status', 'Dispatched')
    );

    // the line row only carries loadId/load_name: resolve the load's extras first, then run
    // the DOCUMENT_LIST rule with the same context as the loads list print (loads/index.tsx)
    const fetchLoadDocumentsList = async (loadId: string) => {
        const loadQuery = gql`
            query loads($filters: LoadSearchFilters) {
                loads(filters: $filters, page: 1, itemsPerPage: 1) {
                    results {
                        id
                        name
                        extras
                    }
                }
            }
        `;
        const documentAttachmentsQuery = gql`
            query documentAttachments($filters: DocumentAttachmentSearchFilters) {
                documentAttachments(filters: $filters) {
                    results {
                        id
                        name
                        description
                    }
                }
            }
        `;
        const ruleQuery = gql`
            query executeRule($context: JSON!) {
                executeRule(ruleName: "DOCUMENT_LIST", context: $context)
            }
        `;
        const [loadResult, documentAttachmentsResult] = await Promise.all([
            graphqlRequestClient.request(loadQuery, { filters: { id: [loadId] } }),
            graphqlRequestClient.request(documentAttachmentsQuery, {
                filters: { objectId: loadId }
            })
        ]);
        const extras = loadResult?.loads?.results?.[0]?.extras;
        const ruleResult = await graphqlRequestClient.request(ruleQuery, {
            context: {
                object_name: 'load',
                stock_owner: extras?.stockOwnerName ?? undefined,
                shipping_type: extras?.shippingType ?? undefined,
                carrier: extras?.carrierName ?? undefined,
                delivery_po_type: extras?.deliveryType ?? undefined,
                delivery_customer_code: extras?.thirdPartyCode,
                dangerous: extras?.dangereux ?? undefined
            }
        });
        setLineLoadDocuments(ruleResult?.executeRule?.document_list?.value);
        setLineDocumentAttachments(documentAttachmentsResult?.documentAttachments?.results ?? []);
    };

    const printAllLoads = async () => {
        try {
            // the lines are already loaded by the list component below (setData)
            const loadIds: string[] = Array.from(
                new Set<string>(
                    (appointmentLinedata ?? []).map((l: any) => l.loadId).filter(Boolean)
                )
            );
            if (loadIds.length === 0) {
                showError(t('messages:no-load-to-print'));
                return;
            }
            const loadsRes = await graphqlRequestClient.request(
                gql`
                    query loads($filters: LoadSearchFilters, $itemsPerPage: Int!) {
                        loads(filters: $filters, page: 1, itemsPerPage: $itemsPerPage) {
                            results {
                                id
                                name
                                extras
                            }
                        }
                    }
                `,
                { filters: { id: loadIds }, itemsPerPage: loadIds.length }
            );
            const loads = loadsRes?.loads?.results ?? [];
            // per load (failure-tolerant): its DOCUMENT_LIST rule result + its attachments
            const perLoad = await Promise.all(
                loads.map(async (load: any) => {
                    try {
                        const [ruleResult, attachmentsResult] = await Promise.all([
                            graphqlRequestClient.request(
                                gql`
                                    query executeRule($context: JSON!) {
                                        executeRule(ruleName: "DOCUMENT_LIST", context: $context)
                                    }
                                `,
                                {
                                    context: {
                                        object_name: 'load',
                                        stock_owner: load.extras?.stockOwnerName ?? undefined,
                                        shipping_type: load.extras?.shippingType ?? undefined,
                                        carrier: load.extras?.carrierName ?? undefined,
                                        delivery_po_type: load.extras?.deliveryType ?? undefined,
                                        delivery_customer_code: load.extras?.thirdPartyCode,
                                        dangerous: load.extras?.dangereux ?? undefined
                                    }
                                }
                            ),
                            graphqlRequestClient.request(
                                gql`
                                    query documentAttachments(
                                        $filters: DocumentAttachmentSearchFilters
                                    ) {
                                        documentAttachments(filters: $filters) {
                                            results {
                                                id
                                                name
                                                description
                                            }
                                        }
                                    }
                                `,
                                { filters: { objectId: load.id } }
                            )
                        ]);
                        return {
                            load,
                            docList: ruleResult?.executeRule?.document_list?.value ?? [],
                            attachments:
                                attachmentsResult?.documentAttachments?.results ?? []
                        };
                    } catch (e) {
                        console.error(e);
                        return { load, docList: [], attachments: [] };
                    }
                })
            );
            // union of the documents lists, deduped by name
            const unionDocs = Object.values(
                Object.fromEntries(
                    perLoad.flatMap((p: any) => p.docList).map((d: any) => [d.name, d])
                )
            );
            // attachments are load-specific: concatenate, disambiguate the label with the load name
            const unionAttachments = perLoad.flatMap((p: any) =>
                p.attachments.map((a: any) => ({
                    ...a,
                    name: `${a.name ?? a.description} (${p.load.name})`
                }))
            );
            if (unionDocs.length === 0 && unionAttachments.length === 0) {
                showError(t('messages:error-print-data'));
                return;
            }
            setMultiplePrintTargets(
                perLoad.map((p: any) => ({
                    context: { id: p.load.id, date: dateLocal, statusDispatched },
                    reference: p.load.name,
                    documentNames: p.docList.map((d: any) => d.name),
                    attachmentIds: p.attachments.map((a: any) => a.id)
                }))
            );
            setAllLoadsDocuments(unionDocs);
            setAllLoadsAttachments(unionAttachments);
            setShowPrintAllLoadsModal(true);
        } catch (e) {
            console.error(e);
            showError(t('messages:error-fetching-data'));
        }
    };

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
        actionsComponent: (
            <Space>
                {!isCarrier &&
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
                ) : (
                    <></>
                )}
                {!isCarrier &&
                loadModes.length > 0 &&
                loadModes.includes(ModeEnum.Update) &&
                status >= configsParamsCodes.appointmentStatusConfirmed ? (
                    <Button type="primary" onClick={printAllLoads}>
                        {t('actions:print-load-documents')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
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
                                render: (
                                    value: any,
                                    record: { id: string; loadId?: string; load_name?: string },
                                    index: number
                                ) => (
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
                                        {record.loadId &&
                                        !isCarrier &&
                                        loadModes.length > 0 &&
                                        loadModes.includes(ModeEnum.Update) ? (
                                            <Button
                                                icon={<PrinterOutlined />}
                                                onClick={async () => {
                                                    setShowLinePrintModal(true);
                                                    setLinePrintLoadId(record.loadId);
                                                    setLinePrintReference(record.load_name);
                                                    setLineLoadDocuments(undefined);
                                                    setLineDocumentAttachments(undefined);
                                                    try {
                                                        await fetchLoadDocumentsList(
                                                            record.loadId!
                                                        );
                                                    } catch (e) {
                                                        console.error(e);
                                                        showError(
                                                            t('messages:error-fetching-data')
                                                        );
                                                    }
                                                }}
                                            />
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
            <SinglePrintDocumentSetModal
                showModal={{
                    showSinglePrintModal: showLinePrintModal,
                    setShowSinglePrintModal: setShowLinePrintModal
                }}
                dataToPrint={{
                    id: linePrintLoadId,
                    date: dateLocal,
                    statusDispatched
                }}
                allDocumentName={lineLoadDocuments}
                setAllDocumentName={setLineLoadDocuments}
                documentReference={linePrintReference}
                customLanguage={printLanguage ?? undefined}
                documentAttachmentsData={lineDocumentAttachments}
            />
            <SinglePrintDocumentSetModal
                showModal={{
                    showSinglePrintModal: showPrintAllLoadsModal,
                    setShowSinglePrintModal: setShowPrintAllLoadsModal
                }}
                multipleDataToPrint={multiplePrintTargets}
                allDocumentName={allLoadsDocuments}
                setAllDocumentName={setAllLoadsDocuments}
                customLanguage={printLanguage ?? undefined}
                documentAttachmentsData={allLoadsAttachments}
            />
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
