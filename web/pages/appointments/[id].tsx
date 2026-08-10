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

import { AppHead, LinkButton, SinglePrintDocumentSetModal } from '@components';
import {
    getModesFromPermissions,
    showError,
    showSuccess,
    isCarrierAppointmentUser,
    getAppointmentDirection,
    resolveAppointmentStatusCodes,
    buildGateQueueReturnInput,
    buildExtrasPatchInput
} from '@helpers';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AppointmentModelV2 as model } from '@helpers';
import { Button, Input, Modal, Select, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { appointmentsRoutes as itemRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { AppointmentDetailsExtra } from 'modules/Appointments/Elements/AppointmentDetailsExtra';
import { NoShowReasonModal } from 'modules/Appointments/Elements/NoShowReasonModal';

type PageComponent = FC & { layout: typeof MainLayout };
const AppointmentPage: PageComponent = () => {
    const router = useRouter();
    const { configs, parameters, permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();
    // [id] is a single dynamic segment; normalize defensively (Next can type it as string[])
    const id = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [noShowModalOpen, setNoShowModalOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [idToPrint, setIdToPrint] = useState<string>();
    const [configsAppointment, setConfigAppointments] = useState<any>([]);
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();
    // document set for the print modal, resolved from the DOCUMENT_LIST rule for the printed
    // load (same as the load print) instead of a static config list.
    const [defaultLoadDocuments, setDefaultLoadDocuments] = useState<any>();
    // the generic detail hook flattens the record, which destroys the `content` JSON object
    // (it becomes content_palettes_XX / content_instructions). Fetch it raw for the composition.
    const [contentData, setContentData] = useState<any>();
    // undefined = not loaded yet (never write extras in that state, it would wipe the
    // driver's signature and safety-checklist acceptance); null = loaded and empty.
    const [extrasData, setExtrasData] = useState<any>();
    // Real column now, no longer a key inside `extras`.
    const [pagerNumber, setPagerNumber] = useState<string | null>(null);

    const appointmentStatuses = useMemo(() => {
        const statusMap: Record<string, number> = {};
        if (configsAppointment && configsAppointment.length > 0) {
            configsAppointment.forEach((config: any) => {
                const statusName = config.value
                    .split(/\s+/)
                    .map(
                        (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    )
                    .join('');
                statusMap[`appointmentStatus${statusName}`] = parseInt(config.code, 10);
            });
        }
        return statusMap;
    }, [configsAppointment]);

    // Resolved from AppContext configs through the shared helper. Used ONLY for the newer
    // statuses: the existing switch arms keep using the PascalCase map so this stays additive.
    const statusCodes = useMemo(() => resolveAppointmentStatusCodes(configs), [configs]);

    const isCarrier = isCarrierAppointmentUser(permissions);

    // the supplier (entityAccountingCode) only applies to incoming goods: hide it from the
    // detail when the appointment is outbound (the query fields stay unchanged)
    const detailModel = useMemo(() => {
        if (getAppointmentDirection(data?.appointmentType, configs) !== 'outbound') return model;
        return {
            ...model,
            fieldsInfo: {
                ...model.fieldsInfo,
                entityAccountingCode: {
                    ...model.fieldsInfo.entityAccountingCode,
                    isExcludedFromDetail: true
                }
            }
        };
    }, [data?.appointmentType, configs]);

    // "docs & references" validation status, backed by parameter scope appointment_extra_status1.
    // On confirmation it is forced to "Not OK"; a (non-carrier) user flips it to "OK" once they've
    // checked the carrier filled everything in and attached the documents.
    const extraStatusParams = useMemo(
        () =>
            (parameters ?? [])
                .filter((p: any) => p.scope === 'appointment_extra_status1')
                .map((p: any) => ({ code: parseInt(p.code, 10), value: p.value })),
        [parameters]
    );
    const extraStatusNotOkCode = useMemo(
        () => extraStatusParams.find((p: any) => /not.?ok|non.?ok|ko/i.test(p.value))?.code,
        [extraStatusParams]
    );

    const getConfigsByScope = async (scope: string) => {
        const query = gql`
            query configs($filters: ConfigSearchFilters) {
                configs(filters: $filters) {
                    results {
                        id
                        value
                        code
                        translation
                        extras
                    }
                }
            }
        `;

        const variables = {
            filters: {
                scope
            }
        };

        const configsResult = await graphqlRequestClient.request(query, variables);
        return configsResult?.configs?.results;
    };

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name ?? ''}`
        }
    ];

    const pageTitle = `${t('common:appointment')} ${data?.name ?? ''}`;

    // #endregions

    //#region : Specific functions for this page
    function getValidNextStatuses(currentStatus: number): number[] {
        switch (currentStatus) {
            case appointmentStatuses.appointmentStatusInCreation:
                return [appointmentStatuses.appointmentStatusSubmitted];
            case appointmentStatuses.appointmentStatusSubmitted:
                return [appointmentStatuses.appointmentStatusConfirmed];
            case appointmentStatuses.appointmentStatusConfirmed:
                return [
                    appointmentStatuses.appointmentStatusOnSite,
                    statusCodes.onSiteWaiting,
                    appointmentStatuses.appointmentStatusNoShow
                ].filter(Number.isFinite) as number[];
            // Parked in the yard: the guard can still clear it for a dock or mark a no-show.
            case statusCodes.onSiteWaiting:
                return [
                    appointmentStatuses.appointmentStatusOnSite,
                    appointmentStatuses.appointmentStatusNoShow
                ].filter(Number.isFinite);
            // Blocked on paperwork: the only way forward is back into the gate queue once the
            // documents are attached. The deny itself needs a reason, so it is only ever set from
            // the gate screen, never from a bare status button.
            case statusCodes.documentsPending:
                return [appointmentStatuses.appointmentStatusConfirmed].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusOnSite:
                return [appointmentStatuses.appointmentStatusArrivedAtDock].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusArrivedAtDock:
                return [appointmentStatuses.appointmentStatusLoadingStarted];
            case appointmentStatuses.appointmentStatusLoadingStarted:
                return [appointmentStatuses.appointmentStatusLoadingFinished];
            case appointmentStatuses.appointmentStatusLoadingFinished:
                return [appointmentStatuses.appointmentStatusCompleted];
            default:
                return [];
        }
    }

    function getConfigByCode(code: number): any {
        return configsAppointment?.find((config: any) => parseInt(config.code, 10) === code);
    }

    function getButtonActionCode(nextStatusCode: number): string {
        switch (nextStatusCode) {
            case appointmentStatuses.appointmentStatusSubmitted:
                return 'submit';
            case appointmentStatuses.appointmentStatusConfirmed:
                return 'confirm';
            case appointmentStatuses.appointmentStatusOnSite:
                return 'mark-on-site-appointment';
            case appointmentStatuses.appointmentStatusArrivedAtDock:
                return 'arrived-at-dock-appointment';
            case appointmentStatuses.appointmentStatusLoadingStarted:
                return 'start-loading-appointment';
            case appointmentStatuses.appointmentStatusLoadingFinished:
                return 'finish-loading-appointment';
            case appointmentStatuses.appointmentStatusCompleted:
                return 'complete-appointment';
            case appointmentStatuses.appointmentStatusCancelled:
                return 'cancel';
            case appointmentStatuses.appointmentStatusNoShow:
                return 'mark-no-show-appointment';
            case statusCodes.onSiteWaiting:
                return 'mark-waiting-appointment';
            case statusCodes.documentsPending:
                return 'return-to-gate-queue';
            default:
                return 'to-be-defined';
        }
    }

    function isFinalStatus(status: number): boolean {
        return [
            appointmentStatuses.appointmentStatusCancelled,
            appointmentStatuses.appointmentStatusCompleted,
            appointmentStatuses.appointmentStatusNoShow
        ].includes(status);
    }

    function getNextStatus(status: number) {
        const validNextStatuses = getValidNextStatuses(status);
        return validNextStatuses.length > 0 ? validNextStatuses[0] : status;
    }

    const switchNextStatus = async (
        id: string,
        currentStatus: number,
        nextStatus?: number,
        extraInput?: Record<string, any>
    ) => {
        const newStatus = nextStatus ?? getNextStatus(currentStatus);
        // Coming back from "documents pending": clear denyReason and the gate decision, otherwise
        // classifyGateEntry and the kiosk both keep reading the appointment as refused. The old
        // text is stashed in extras so the history survives.
        const isDocumentsRecovery =
            statusCodes.documentsPending != null &&
            currentStatus === statusCodes.documentsPending &&
            newStatus === appointmentStatuses.appointmentStatusConfirmed;
        // Re-read `extras` from the API instead of using `extrasData`: it comes from a separate
        // side-query, so the button can be clicked while it is still undefined — spreading `{}`
        // would then wipe the driver's gate signature and safety checklist. It also protects
        // against the kiosk having rewritten `extras` while this page sat open.
        const documentsRecoveryInput = isDocumentsRecovery
            ? await buildGateQueueReturnInput(graphqlRequestClient, id)
            : {};
        const updateVariables = {
            id: id,
            input: {
                status: newStatus,
                // on confirmation, the docs/refs check starts as "Not OK" until a user validates it
                ...(newStatus === appointmentStatuses.appointmentStatusConfirmed &&
                extraStatusNotOkCode != null
                    ? { extraStatus1: extraStatusNotOkCode }
                    : {}),
                ...documentsRecoveryInput,
                ...(extraInput ?? {})
            }
        };

        const updateMutation = gql`
            mutation updateAppointment($id: String!, $input: UpdateAppointmentInput!) {
                updateAppointment(id: $id, input: $input) {
                    id
                    name
                    status
                }
            }
        `;

        const result = await graphqlRequestClient.request(updateMutation, updateVariables);
        if (result) {
            setTriggerRefresh(!triggerRefresh);
        }
        return result;
    };

    // A carrier asking for a confirmed slot to be moved. This is a BACKWARD transition, so it is
    // deliberately not part of getValidNextStatuses -- adding Submitted to Confirmed's list there
    // would hand every internal planner a stray "Submit" button on confirmed appointments.
    //
    // The reason is stored in extras, never in denyReason: that field is read as "refused" by the
    // gate dashboard and by the kiosk, so a reschedule reason there would make the appointment
    // look turned away. extraStatus1 goes back to "Not OK" so the internal team has to re-check
    // the references before re-confirming, mirroring what happens on the way in.
    const requestReschedule = async () => {
        if (!data?.id) return;
        const submitted = appointmentStatuses.appointmentStatusSubmitted;
        if (!Number.isFinite(submitted)) {
            showError(t('messages:error-update-data'));
            return;
        }
        try {
            // Re-read `extras` instead of using the `extrasData` snapshot: it is a whole-object
            // replace, and the kiosk rewrites it while this page sits open, so a snapshot taken at
            // load would clobber a signature or checklist written since.
            const extrasInput = await buildExtrasPatchInput(graphqlRequestClient, data.id, {
                rescheduleRequest: {
                    at: new Date().toISOString(),
                    reason: rescheduleReason.trim() || null
                }
            });
            // Abort rather than move the status without the request. Here the payload IS the
            // point: the internal team needs the reason to know why the slot came back. Sending
            // the appointment to Submitted while dropping it would look like success and lose it.
            if (!extrasInput) {
                showError(t('messages:error-update-data'));
                return;
            }
            await switchNextStatus(data.id, data.status, submitted, extrasInput);
            showSuccess(t('messages:reschedule-requested'));
        } catch (e) {
            showError(t('messages:error-update-data'));
        } finally {
            setRescheduleOpen(false);
            setRescheduleReason('');
        }
    };

    const updateExtraStatus = async (extraStatus1: number) => {
        try {
            await graphqlRequestClient.request(
                gql`
                    mutation updateAppointment($id: String!, $input: UpdateAppointmentInput!) {
                        updateAppointment(id: $id, input: $input) {
                            id
                            extraStatus1
                        }
                    }
                `,
                { id, input: { extraStatus1 } }
            );
            showSuccess(t('messages:success-updated'));
            setTriggerRefresh(!triggerRefresh);
        } catch (e) {
            console.error(e);
            showError(t('messages:error-update-data'));
        }
    };

    useEffect(() => {
        const fetchAppointmentConfigs = async () => {
            const configs = await getConfigsByScope('appointment_status');
            if (configs) {
                setConfigAppointments(configs);
            }
        };
        fetchAppointmentConfigs();
    }, []);

    // fetch the raw `content` JSON (truck composition) — not available via the flattened detail data
    useEffect(() => {
        const fetchContent = async () => {
            if (!id) return;
            const query = gql`
                query appointment($id: String!) {
                    appointment(id: $id) {
                        content
                        extras
                        pagerNumber
                    }
                }
            `;
            try {
                const result = await graphqlRequestClient.request(query, { id });
                setContentData(result?.appointment?.content ?? undefined);
                // `extras` rides along on the same raw query for the same reason `content` does:
                // the generic detail hook flattens JSON (content_palettes_XX), which would turn
                // this into extras_gateCheckIn_pagerNumber and drag the base64 gate signature
                // into the generic Descriptions. It is also the object every extras write must
                // merge against, so it must be the fresh server copy, not a flattened view.
                setExtrasData(result?.appointment?.extras ?? null);
                setPagerNumber(result?.appointment?.pagerNumber ?? null);
            } catch (e) {
                console.error(e);
            }
        };
        fetchContent();
    }, [id, triggerRefresh]);

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const confirmAction = (info: any | undefined, setInfo: any, action: 'delete' | 'disable') => {
        return () => {
            const titre =
                action == 'delete' ? 'messages:delete-confirm' : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== appointmentStatuses.appointmentStatusCancelled ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    getValidNextStatuses(data?.status).length > 0 ? (
                        <Space>
                            {getValidNextStatuses(data?.status).map((nextStatusCode: number) => {
                                // Pushing a documents-blocked appointment back into the gate queue
                                // is the one transition a carrier owns beyond "Submitted": they are
                                // the party that supplies the missing paperwork.
                                const isDocumentsReturn =
                                    statusCodes.documentsPending != null &&
                                    data?.status === statusCodes.documentsPending &&
                                    nextStatusCode ===
                                        appointmentStatuses.appointmentStatusConfirmed;
                                // a carrier can only advance up to "Submitted" (review/confirm is
                                // done by the internal team)
                                if (
                                    isCarrier &&
                                    nextStatusCode !==
                                        appointmentStatuses.appointmentStatusSubmitted &&
                                    !isDocumentsReturn
                                ) {
                                    return null;
                                }
                                // Returning to the queue without attaching anything would just
                                // bounce off the guard again, so require at least one document.
                                const documentsMissing =
                                    isDocumentsReturn &&
                                    !((documentAttachmentsData?.length ?? 0) > 0);
                                const nextStatusConfig = getConfigByCode(nextStatusCode);
                                const buttonActionCode = getButtonActionCode(nextStatusCode);
                                return (
                                    <Button
                                        key={nextStatusConfig?.id}
                                        disabled={documentsMissing}
                                        title={
                                            documentsMissing
                                                ? t('messages:documents-required-before-return')
                                                : undefined
                                        }
                                        onClick={() =>
                                            // no-show requires a reason (like a refusal): go
                                            // through the reason modal instead of a direct switch
                                            nextStatusCode ===
                                            appointmentStatuses.appointmentStatusNoShow
                                                ? setNoShowModalOpen(true)
                                                : switchNextStatus(
                                                      data.id,
                                                      data.status,
                                                      nextStatusCode
                                                  )
                                        }
                                        style={{
                                            borderColor: nextStatusConfig?.extras?.color,
                                            color: nextStatusConfig?.extras?.color
                                        }}
                                    >
                                        {t(`actions:${buttonActionCode}`)}
                                    </Button>
                                );
                            })}
                        </Space>
                    ) : (
                        <></>
                    )}
                    {/* Carrier asking to move a confirmed slot: status goes back to Submitted so
                        the carrier regains edit rights and the internal team re-confirms. */}
                    {isCarrier &&
                    modes.includes(ModeEnum.Update) &&
                    statusCodes.confirmed != null &&
                    data?.status === statusCodes.confirmed ? (
                        <Button onClick={() => setRescheduleOpen(true)}>
                            {t('actions:request-reschedule')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Read) &&
                    data?.status >= appointmentStatuses.appointmentStatusConfirmed ? (
                        <>
                            <Button
                                type="primary"
                                onClick={async () => {
                                    // the load lives on the appointment lines, not on the
                                    // appointment: resolve the first line carrying a load to print
                                    try {
                                        const res = await graphqlRequestClient.request(
                                            gql`
                                                query aptLines(
                                                    $filters: AppointmentLineSearchFilters
                                                ) {
                                                    appointmentLines(
                                                        filters: $filters
                                                        itemsPerPage: 100
                                                    ) {
                                                        results {
                                                            loadId
                                                        }
                                                    }
                                                }
                                            `,
                                            { filters: { appointmentId: id } }
                                        );
                                        const loadId = res?.appointmentLines?.results?.find(
                                            (l: any) => l.loadId
                                        )?.loadId;
                                        if (loadId) {
                                            // resolve the printable document set from the
                                            // DOCUMENT_LIST rule for this appointment (+ the
                                            // printed load's attachments), instead of a static list
                                            const [ruleResult, attachmentsResult] =
                                                await Promise.all([
                                                    graphqlRequestClient.request(
                                                        gql`
                                                            query executeRule($context: JSON!) {
                                                                executeRule(
                                                                    ruleName: "DOCUMENT_LIST"
                                                                    context: $context
                                                                )
                                                            }
                                                        `,
                                                        {
                                                            context: {
                                                                object_name: 'appointment',
                                                                stock_owner:
                                                                    data?.stockOwner_name ??
                                                                    undefined,
                                                                carrier:
                                                                    data?.carrier_name ?? undefined
                                                            }
                                                        }
                                                    ),
                                                    graphqlRequestClient.request(
                                                        gql`
                                                            query documentAttachments(
                                                                $filters: DocumentAttachmentSearchFilters
                                                            ) {
                                                                documentAttachments(
                                                                    filters: $filters
                                                                ) {
                                                                    results {
                                                                        id
                                                                        name
                                                                        description
                                                                    }
                                                                }
                                                            }
                                                        `,
                                                        { filters: { objectId: loadId } }
                                                    )
                                                ]);
                                            setDefaultLoadDocuments(
                                                ruleResult?.executeRule?.document_list?.value
                                            );
                                            setDocumentAttachmentsData(
                                                attachmentsResult?.documentAttachments?.results ??
                                                    []
                                            );
                                            // the appointment document must be generated from the
                                            // appointment id as its context (not the load id); the
                                            // load is only used to gather its document attachments
                                            setIdToPrint(id as string);
                                            setShowSinglePrintModal(true);
                                        } else {
                                            showError(t('messages:no-load-to-print'));
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        showError(t('messages:error-fetching-data'));
                                    }
                                }}
                            >
                                {t('actions:print')}
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                    {/* "References complete" validation status: editable by a non-carrier
                        (Weilbach) user from Submitted onward — the carrier can't change it */}
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status >= appointmentStatuses.appointmentStatusSubmitted &&
                    extraStatusParams.length > 0 ? (
                        <Space size={4}>
                            <span style={{ whiteSpace: 'nowrap' }}>
                                {t('d:references-complete')}:
                            </span>
                            <Select
                                style={{ minWidth: 150 }}
                                placeholder={t('d:references-complete')}
                                value={data?.extraStatus1 ?? undefined}
                                onChange={(v) => updateExtraStatus(v)}
                                options={extraStatusParams.map((p: any) => ({
                                    value: p.code,
                                    label:
                                        data?.extraStatus1Text && data.extraStatus1 === p.code
                                            ? data.extraStatus1Text
                                            : p.value
                                }))}
                            />
                        </Space>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    data?.status != null &&
                    !isFinalStatus(data.status) &&
                    (!isCarrier ||
                        data.status <= appointmentStatuses.appointmentStatusSubmitted) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isSoftDeletable &&
                    data?.status != null &&
                    !isFinalStatus(data.status) ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            style={{
                                borderColor: getConfigByCode(
                                    appointmentStatuses.appointmentStatusCancelled
                                )?.extras?.color,
                                color: getConfigByCode(
                                    appointmentStatuses.appointmentStatusCancelled
                                )?.extras?.color
                            }}
                        >
                            {t('actions:cancel')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isDeletable &&
                    data?.status <= appointmentStatuses.appointmentStatusInCreation ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    <Modal
                        open={rescheduleOpen}
                        title={t('actions:request-reschedule')}
                        okText={t('messages:confirm')}
                        cancelText={t('messages:cancel')}
                        onOk={requestReschedule}
                        onCancel={() => {
                            setRescheduleOpen(false);
                            setRescheduleReason('');
                        }}
                    >
                        <div style={{ marginBottom: 8 }}>
                            {t('messages:request-reschedule-confirm')}
                        </div>
                        <Input.TextArea
                            rows={3}
                            placeholder={t('common:reschedule-reason')}
                            value={rescheduleReason}
                            onChange={(e) => setRescheduleReason(e.target.value)}
                        />
                    </Modal>
                    <NoShowReasonModal
                        open={noShowModalOpen}
                        t={t}
                        onCancel={() => setNoShowModalOpen(false)}
                        onConfirm={async (reason) => {
                            setNoShowModalOpen(false);
                            await switchNextStatus(
                                data.id,
                                data.status,
                                appointmentStatuses.appointmentStatusNoShow,
                                // stored in the same field as a cancellation/refusal reason
                                { denyReason: reason }
                            );
                        }}
                    />
                    <SinglePrintDocumentSetModal
                        showModal={{
                            showSinglePrintModal,
                            setShowSinglePrintModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        allDocumentName={defaultLoadDocuments}
                        documentReference={data?.name}
                        customLanguage={data?.printLanguage ?? undefined}
                        documentAttachmentsData={documentAttachmentsData}
                    />
                </Space>
            ) : (
                <></>
            )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <AppointmentDetailsExtra
                        appointmentId={id}
                        appointmentName={data?.name}
                        appointmentType={data?.appointmentType}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                        carrierId={data?.carrierId}
                        status={data?.status}
                        content={contentData}
                        gateCheckIn={extrasData?.gateCheckIn}
                        pagerNumber={pagerNumber}
                        printLanguage={data?.printLanguage ?? undefined}
                        setDocumentAttachmentsData={setDocumentAttachmentsData}
                    />
                }
                headerData={headerData}
                id={id!}
                dataModel={detailModel}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
                refetch={triggerRefresh}
            />
        </>
    );
};

export default AppointmentPage;

AppointmentPage.layout = MainLayout;
