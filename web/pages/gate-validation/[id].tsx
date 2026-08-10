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
    AppHead,
    ContentSpin,
    HeaderContent,
    LinkButton,
    PageTableContentWrapper
} from '@components';
import {
    buildGateQueueReturnInput,
    fetchCustomObjectDocuments,
    getAppointmentDirection,
    getModesFromPermissions,
    isPdfDocument,
    parseDocumentNames,
    resolveAppointmentStatusCodes,
    showError,
    showSuccess,
    toDocumentSrc,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Image,
    Input,
    Modal,
    Result,
    Select,
    Space,
    Tag
} from 'antd';
import { gql } from 'graphql-request';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    classifyGateEntry,
    GateEntry,
    GateStatusCodes,
    GATE_ENTRY_FIELDS
} from 'modules/GateValidation/types';
import { TimingTag } from 'modules/GateValidation/Elements/TimingTag';
import { RejectModal, RefuseAction } from 'modules/GateValidation/Elements/RejectModal';
import { WaitingModal } from 'modules/GateValidation/Elements/WaitingModal';

dayjs.extend(utc);
dayjs.extend(timezone);

type PageComponent = FC & { layout: typeof MainLayout };

const rootPath = '/gate-validation';
const DOCUMENT_RULE = 'TRUCK_DRIVER_INFOS_DOCUMENTS';

const UPDATE_MUTATION = gql`
    mutation updateGateAppointment($id: String!, $input: UpdateAppointmentInput!) {
        updateAppointment(id: $id, input: $input) {
            id
            status
        }
    }
`;

const GateValidationDetail: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { id, timezone: timezoneQuery } = router.query;

    // Timezone for displaying UTC-stored dates, taken from the URL (?timezone=Europe/Paris).
    // Falls back to the browser's resolved timezone when not provided.
    const tz =
        (Array.isArray(timezoneQuery) ? timezoneQuery[0] : timezoneQuery) || dayjs.tz.guess();
    const { graphqlRequestClient } = useAuth();
    const { permissions, configs, parameters } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_appointments-gate-validation');
    // fail closed: menu gating alone doesn't stop a direct URL hit — never fetch without READ.
    const canRead = modes.includes(ModeEnum.Read);

    const [entry, setEntry] = useState<GateEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [waitingOpen, setWaitingOpen] = useState(false);
    const [comment, setComment] = useState('');
    // dock (Location of category "Dock") the agent can re-assign when validating access
    const [docks, setDocks] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedDock, setSelectedDock] = useState<string | undefined>();

    // Status codes from the configs reducer (no extra request), through the shared resolver so
    // "On Site" and the waiting/documents statuses can never be confused for one another.
    const codes = useMemo<GateStatusCodes | null>(
        () =>
            !configs || configs.length === 0
                ? null
                : (resolveAppointmentStatusCodes(configs) as GateStatusCodes),
        [configs]
    );

    // Dock category code (location_category = "Dock"), used to list re-assignable docks.
    const dockCategory = useMemo(() => {
        const c = configs?.find(
            (x: any) =>
                x.scope === 'location_category' && /dock|quai|rampe|ramp/i.test(x.value ?? '')
        )?.code;
        return c != null ? parseInt(c, 10) : undefined;
    }, [configs]);

    // Load the dock locations once so the agent can re-assign the appointment to another dock.
    useEffect(() => {
        if (dockCategory == null || !canRead) return;
        graphqlRequestClient
            .request(
                gql`
                    query gateDocks($filters: LocationSearchFilters) {
                        locations(filters: $filters, itemsPerPage: 1000) {
                            results {
                                id
                                name
                            }
                        }
                    }
                `,
                { filters: { category: dockCategory } }
            )
            .then((res: any) => setDocks(res?.locations?.results ?? []))
            .catch(() => undefined);
    }, [graphqlRequestClient, dockCategory, canRead]);

    // Default the dock selector to the appointment's planned dock once it is loaded.
    useEffect(() => {
        setSelectedDock(entry?.locationId ?? undefined);
    }, [entry?.locationId]);

    useEffect(() => {
        if (!id || !canRead) {
            setLoading(false);
            return;
        }
        setLoading(true);
        graphqlRequestClient
            .request(
                gql`
                    query getGateEntry($id: String!) {
                        appointment(id: $id) {
                            ${GATE_ENTRY_FIELDS}
                            driverEmail
                            reference1
                            created
                            modified
                        }
                    }
                `,
                { id }
            )
            .then((res: any) =>
                setEntry(
                    res?.appointment
                        ? {
                              ...res.appointment,
                              locationName: res.appointment.location?.name ?? null
                          }
                        : null
                )
            )
            .finally(() => setLoading(false));
    }, [graphqlRequestClient, id, canRead]);

    const decision = useMemo(
        () => (entry && codes ? classifyGateEntry(entry, codes) : 'pending'),
        [entry, codes]
    );

    // Documents are never stored on the appointment: fetch them from the business
    // rule as soon as the page loads (no need to wait for the appointment/extras).
    const checklistMeta = entry?.extras?.safetyChecklist;
    const documentsAccepted = checklistMeta?.accepted === true;
    const [docGroups, setDocGroups] = useState<string[][]>([]);

    // The rule returns custom-object NAMES; resolve them to the documentAttached of the
    // matching "Truck and visitors documents" custom objects (same contract as the kiosk).
    useEffect(() => {
        let active = true;
        // The rule expects locales like fr-FR / en-US (lang lowercase, region
        // uppercase). Prefer the language captured at acceptance, else the locale.
        const rawLocale = checklistMeta?.language ?? router.locale ?? 'en-US';
        const [lng, region] = String(rawLocale).split('-');
        const language = region
            ? `${lng.toLowerCase()}-${region.toUpperCase()}`
            : lng.toLowerCase();
        graphqlRequestClient
            .request(
                gql`
                    query executeRule($context: JSON!) {
                        executeRule(ruleName: "${DOCUMENT_RULE}", context: $context)
                    }
                `,
                { context: { language } }
            )
            .then(async (res: any) => {
                const names = parseDocumentNames(res?.executeRule);
                const docs = await fetchCustomObjectDocuments(
                    graphqlRequestClient,
                    parameters,
                    names
                );
                if (!active) return;
                setDocGroups(docs.length > 0 ? [docs.map((d) => d.documentAttached)] : []);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    const signature: string | undefined = entry?.extras?.gateSignature ?? undefined;

    // `extras` is a single JSON blob rewritten by read-modify-write from three different clients
    // (this screen, the kiosk, the appointment detail). This page can sit open for minutes while
    // the driver restarts the kiosk flow, so merging against the copy loaded at mount would
    // clobber the signature and the safety-checklist acceptance. Re-read it immediately before
    // each write and merge against the fresh value; fall back to the loaded copy if the re-read
    // fails, which is still better than dropping the keys entirely.
    const mergeGate = async (patch: Record<string, any>) => {
        let current = entry?.extras ?? {};
        try {
            const res: any = await graphqlRequestClient.request(
                gql`
                    query gateEntryExtras($id: String!) {
                        appointment(id: $id) {
                            extras
                        }
                    }
                `,
                { id: entry?.id }
            );
            current = res?.appointment?.extras ?? current ?? {};
        } catch (e) {
            console.warn('gate-validation: could not re-read extras, merging against local copy');
        }
        return {
            ...(current ?? {}),
            gateCheckIn: { ...(current?.gateCheckIn ?? {}), pending: false, ...patch }
        };
    };

    const onApprove = async () => {
        if (!entry || !codes) return;
        if (!Number.isFinite(codes.onSite)) {
            showError(t('common:generic-error'));
            return;
        }
        setSubmitting(true);
        try {
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: codes.onSite,
                    // allow the agent to re-assign the truck to another dock at validation time
                    ...(selectedDock ? { locationId: selectedDock } : {}),
                    extras: await mergeGate({
                        decision: 'approved',
                        decidedAt: dayjs().toISOString(),
                        agentComment: comment || null
                    })
                }
            });
            showSuccess(t('common:approved-done'));
            router.push(rootPath);
        } catch (e) {
            showError(t('common:generic-error'));
            console.error(e);
        } finally {
            setSubmitting(false);
            setApproveOpen(false);
        }
    };

    // Send the truck to the waiting area instead of a dock. It keeps its slot and stays in the
    // guard's queue (the dashboard filters on this status too) so entry can be granted later.
    // No dock is assigned here and no denyReason is written: this is not a refusal.
    const onWaiting = async (pagerNumber: string | undefined, agentComment: string | undefined) => {
        if (!entry || !codes) return;
        if (!Number.isFinite(codes.onSiteWaiting)) {
            showError(t('common:generic-error'));
            return;
        }
        setSubmitting(true);
        try {
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: codes.onSiteWaiting,
                    // `pagerNumber` is a real Appointment column, so it goes in the input rather
                    // than into `extras`: it is filterable, exportable and visible through the
                    // generic list/detail stack, which a key buried in a JSON blob is not.
                    // Explicit null clears a pager left over from a previous waiting round.
                    pagerNumber: pagerNumber ?? null,
                    extras: await mergeGate({
                        decision: 'waiting',
                        decidedAt: dayjs().toISOString(),
                        waitingSince: dayjs().toISOString(),
                        agentComment: agentComment ?? null
                    })
                }
            });
            showSuccess(t('common:waiting-done'));
            router.push(rootPath);
        } catch (e) {
            showError(t('common:generic-error'));
            console.error(e);
        } finally {
            setSubmitting(false);
            setWaitingOpen(false);
        }
    };

    // Refusal with three outcomes:
    //  - 'cancel'    -> appointment set to CANCELLED (dead, driver turned away)
    //  - 'reset'     -> kept CONFIRMED so the driver can redo the radio process
    //  - 'documents' -> held at DOCUMENTS PENDING; the carrier (or an internal user) attaches the
    //                   missing paperwork and returns it to the gate queue. Recoverable, so its
    //                   status code sits just after Confirmed and stays below the Completed
    //                   cutoff that governs document add/remove.
    // All three set denyReason so the waiting iPad shows the outcome + reason.
    const onRefuse = async (reason: string, message: string | undefined, action: RefuseAction) => {
        if (!entry || !codes) return;
        const newStatus =
            action === 'cancel'
                ? codes.cancelled
                : action === 'documents'
                  ? codes.documentsPending
                  : codes.confirmed;
        if (!Number.isFinite(newStatus)) {
            showError(t('common:generic-error'));
            return;
        }
        setSubmitting(true);
        try {
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: newStatus,
                    denyReason: message ? `${reason} — ${message}` : reason,
                    extras: await mergeGate({
                        decision: action === 'documents' ? 'awaiting-documents' : 'refused',
                        decidedAt: dayjs().toISOString(),
                        refusalMessage: message || null,
                        refuseAction: action,
                        ...(action === 'documents'
                            ? { documentsRequestedAt: dayjs().toISOString() }
                            : {})
                    })
                }
            });
            showSuccess(
                action === 'cancel'
                    ? t('common:cancelled-done')
                    : action === 'documents'
                      ? t('common:documents-requested-done')
                      : t('common:reset-done')
            );
            router.push(rootPath);
        } catch (e) {
            showError(t('common:generic-error'));
        } finally {
            setSubmitting(false);
            setRejectOpen(false);
        }
    };

    // Documents attached -> back into the gate queue at CONFIRMED.
    // `denyReason` MUST be cleared: `classifyGateEntry` and the kiosk both read it as "refused",
    // so a lingering value would keep the recovered appointment looking turned away. The old text
    // is stashed in extras so the history is not lost.
    const onReturnToQueue = async () => {
        if (!entry || !codes) return;
        if (!Number.isFinite(codes.confirmed)) {
            showError(t('common:generic-error'));
            return;
        }
        setSubmitting(true);
        try {
            // The shared helper, rather than mergeGate + a local `previousDenyReason`: it re-reads
            // `denyReason` from the server alongside `extras`, where the page snapshot could be
            // minutes stale — the guard may have re-refused with a different reason since mount,
            // and stashing the old text would put a wrong reason in the history. It is also the
            // same code the appointment detail page and the planning agenda run, so the three
            // screens cannot drift on what "return to the gate queue" means.
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: codes.confirmed,
                    ...(await buildGateQueueReturnInput(graphqlRequestClient, entry.id))
                }
            });
            showSuccess(t('common:returned-to-queue-done'));
            router.push(rootPath);
        } catch (e) {
            showError(t('common:generic-error'));
        } finally {
            setSubmitting(false);
        }
    };

    const title = entry?.driverName
        ? t('common:review-of', { name: entry.driverName })
        : t('common:validation-title');

    // Read the column, falling back to the old `extras` location so appointments written before
    // `pagerNumber` existed still show their pager instead of silently losing it.
    const pagerNumber: string | undefined =
        entry?.pagerNumber ?? entry?.extras?.gateCheckIn?.pagerNumber ?? undefined;
    const canUpdate = modes.includes(ModeEnum.Update);
    // Hide a write action outright when its status row is missing on this warehouse, rather than
    // letting the click send `status: undefined` (JSON.stringify(NaN) is null).
    const canSendToWaiting = Number.isFinite(codes?.onSiteWaiting);

    const actions = !canUpdate ? (
        <LinkButton title={t('common:back-to-dashboard')} path={rootPath} />
    ) : decision === 'pending' ? (
        <Space>
            <Button type="primary" loading={submitting} onClick={() => setApproveOpen(true)}>
                {t('common:approve')}
            </Button>
            {canSendToWaiting && (
                <Button loading={submitting} onClick={() => setWaitingOpen(true)}>
                    {t('actions:mark-waiting-appointment')}
                </Button>
            )}
            <Button danger onClick={() => setRejectOpen(true)}>
                {t('common:refuse')}
            </Button>
            <LinkButton title={t('common:edit')} path={`/appointments/edit/${id}`} />
        </Space>
    ) : decision === 'waiting' ? (
        // The truck is parked with a pager: the guard comes back here to clear it for a dock.
        <Space>
            <Button type="primary" loading={submitting} onClick={() => setApproveOpen(true)}>
                {t('common:grant-entry')}
            </Button>
            <Button danger onClick={() => setRejectOpen(true)}>
                {t('common:refuse')}
            </Button>
        </Space>
    ) : decision === 'awaiting-documents' ? (
        <Space>
            <Button type="primary" loading={submitting} onClick={onReturnToQueue}>
                {t('actions:return-to-gate-queue')}
            </Button>
            <LinkButton title={t('common:back-to-dashboard')} path={rootPath} />
        </Space>
    ) : (
        <LinkButton title={t('common:back-to-dashboard')} path={rootPath} />
    );

    if (!canRead) {
        return (
            <>
                <AppHead title={t('common:validation-title')} />
                <Result status="403" title={t('messages:access-denied')} />
            </>
        );
    }

    if (loading) {
        return (
            <PageTableContentWrapper>
                <ContentSpin />
            </PageTableContentWrapper>
        );
    }

    return (
        <>
            <AppHead title={title} />
            <HeaderContent
                title={title}
                routes={[
                    { breadcrumbName: t('common:validation-title'), path: rootPath },
                    { breadcrumbName: title }
                ]}
                onBack={() => router.push(rootPath)}
                actionsRight={actions}
            />
            <PageTableContentWrapper>
                {entry?.extras?.gateCheckIn?.at && (
                    <Tag style={{ marginBottom: 12 }}>
                        {t('common:arrival-time')}:{' '}
                        {dayjs(entry.extras.gateCheckIn.at).format('YYYY-MM-DD HH:mm')}
                    </Tag>
                )}

                {/* Parked truck: the pager is what the guard calls the driver back on, so it is
                    the most important thing on the screen while the appointment is waiting. */}
                {decision === 'waiting' && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={t('common:on-site-waiting')}
                        description={
                            pagerNumber ? (
                                <span>
                                    {t('common:pager-number')}:{' '}
                                    <strong style={{ fontSize: 24, fontFamily: 'monospace' }}>
                                        {pagerNumber}
                                    </strong>
                                </span>
                            ) : (
                                t('common:parked-no-pager')
                            )
                        }
                    />
                )}

                {/* Blocked on paperwork: show what is missing, for both the guard and the carrier. */}
                {decision === 'awaiting-documents' && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={t('common:documents-required-title')}
                        description={entry?.denyReason ?? t('common:documents-required-msg')}
                    />
                )}

                <Card size="small" title={t('common:section-driver')} style={{ marginBottom: 16 }}>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label={t('common:driver-name')}>
                            {entry?.driverName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:company-name')}>
                            {entry?.entityName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:phone')}>
                            {entry?.driverPhoneNumber ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:truck-plate')}>
                            {entry?.truckLicensePlate ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:trailer')}>
                            {entry?.trailerLicensePlate ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:container-number')}>
                            {entry?.extraText1 ?? '-'}
                        </Descriptions.Item>
                        {/* the supplier only applies to incoming goods */}
                        {getAppointmentDirection(entry?.appointmentType, configs) !==
                            'outbound' && (
                            <Descriptions.Item label={t('common:supplierName')}>
                                {entry?.entityAccountingCode ?? '-'}
                            </Descriptions.Item>
                        )}
                        {/* Outbound driver declarations, captured at the kiosk. The guard decides
                            with them in view -- a driving time close to the legal limit, or a
                            missing direct-transport confirmation, is exactly what should stop an
                            approval, so they belong on this card rather than only in the audit. */}
                        {getAppointmentDirection(entry?.appointmentType, configs) ===
                            'outbound' && (
                            <Descriptions.Item label={t('common:driver-driving-time')}>
                                {entry?.driverDrivingTime ?? '-'}
                            </Descriptions.Item>
                        )}
                        {getAppointmentDirection(entry?.appointmentType, configs) === 'outbound' &&
                            entry?.extras?.directTransport && (
                                <Descriptions.Item label={t('common:direct-transport')}>
                                    {entry.extras.directTransport.confirmed ? (
                                        <Tag color="green">{t('common:yes')}</Tag>
                                    ) : (
                                        <Tag color="red">{t('common:no')}</Tag>
                                    )}
                                </Descriptions.Item>
                            )}
                    </Descriptions>
                </Card>

                <Card
                    size="small"
                    title={t('common:section-appointment')}
                    style={{ marginBottom: 16 }}
                >
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label={t('common:ref-number')}>
                            {entry?.name ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:type')}>
                            {entry?.appointmentTypeText ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:dock')}>
                            {entry?.locationName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:planned-slot')}>
                            {entry?.appointmentDateBegin
                                ? dayjs
                                      .utc(entry.appointmentDateBegin)
                                      .tz(tz)
                                      .format('YYYY-MM-DD HH:mm')
                                : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:timing')} span={2}>
                            <TimingTag
                                dateBegin={
                                    entry?.appointmentDateBegin
                                        ? dayjs.utc(entry.appointmentDateBegin).tz(tz)
                                        : null
                                }
                                t={t}
                            />
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card size="small" title={t('common:documents-title')} style={{ marginBottom: 16 }}>
                    {!documentsAccepted && docGroups.length === 0 ? (
                        <span>-</span>
                    ) : (
                        <>
                            <div style={{ marginBottom: 8 }}>
                                {documentsAccepted ? (
                                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                                ) : (
                                    <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                                )}{' '}
                                {t('common:read-and-accept-docs')}
                            </div>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                {docGroups.map((images, i) => (
                                    <Image.PreviewGroup key={i}>
                                        <Space wrap size="small">
                                            {images.map((img, idx) => {
                                                const src = toDocumentSrc(img);
                                                return isPdfDocument(src) ? (
                                                    <iframe
                                                        key={idx}
                                                        src={src}
                                                        title={`document-${i}-${idx}`}
                                                        style={{
                                                            width: 320,
                                                            height: 240,
                                                            border: '1px solid #f0f0f0',
                                                            borderRadius: 4
                                                        }}
                                                    />
                                                ) : (
                                                    <Image
                                                        key={idx}
                                                        src={src}
                                                        width={120}
                                                        style={{ borderRadius: 4 }}
                                                    />
                                                );
                                            })}
                                        </Space>
                                    </Image.PreviewGroup>
                                ))}
                            </Space>
                        </>
                    )}
                </Card>

                <Card
                    size="small"
                    title={t('common:section-signature')}
                    style={{ marginBottom: 16 }}
                >
                    {signature ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={signature}
                            alt={t('common:section-signature')}
                            style={{ width: 400, maxWidth: '100%', border: '1px solid #f0f0f0' }}
                        />
                    ) : (
                        <span>-</span>
                    )}
                </Card>

                {entry?.denyReason && decision === 'refused' && (
                    <Card size="small" title={t('common:refused-title')}>
                        <Tag color="red">{entry.denyReason}</Tag>
                    </Card>
                )}
            </PageTableContentWrapper>

            <Modal
                title={t('common:approve-confirm', { name: entry?.driverName ?? '' })}
                open={approveOpen}
                onOk={onApprove}
                onCancel={() => setApproveOpen(false)}
                confirmLoading={submitting}
                okText={t('common:approve')}
                cancelText={t('common:cancel')}
            >
                {/* This is the moment the guard reclaims the physical pager from the driver, so
                    the number belongs here, prominently, not just on the page behind the modal. */}
                {pagerNumber && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message={
                            <span>
                                {t('common:pager-number')}:{' '}
                                <strong style={{ fontSize: 24, fontFamily: 'monospace' }}>
                                    {pagerNumber}
                                </strong>
                            </span>
                        }
                    />
                )}
                <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>
                        <strong>{t('common:planned-dock')}:</strong> {entry?.locationName ?? '-'}
                    </div>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        placeholder={t('actions:choose-dock')}
                        value={selectedDock}
                        onChange={(v) => setSelectedDock(v)}
                        options={docks.map((d) => ({ value: d.id, label: d.name }))}
                    />
                </div>
                <Input.TextArea
                    rows={3}
                    placeholder={t('common:comment-optional')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </Modal>

            <RejectModal
                open={rejectOpen}
                confirmLoading={submitting}
                t={t}
                onCancel={() => setRejectOpen(false)}
                onConfirm={onRefuse}
            />

            <WaitingModal
                open={waitingOpen}
                confirmLoading={submitting}
                t={t}
                onCancel={() => setWaitingOpen(false)}
                onConfirm={onWaiting}
            />
        </>
    );
};

GateValidationDetail.layout = MainLayout;

export default GateValidationDetail;
