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
    getModesFromPermissions,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { Button, Card, Descriptions, Image, Input, Modal, Result, Select, Space, Tag } from 'antd';
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

dayjs.extend(utc);
dayjs.extend(timezone);

type PageComponent = FC & { layout: typeof MainLayout };

const rootPath = '/gate-validation';
const DOCUMENT_RULE = 'TRUCK_DRIVER_INFOS_DOCUMENTS';

// URLs/data-URIs pass through; base64 image content -> data-URI (like the
// appointments schedule page). MIME inferred from the base64 header.
const resolveImage = (src: string): string => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const mime = src.startsWith('iVBOR')
        ? 'image/png'
        : src.startsWith('R0lGOD')
          ? 'image/gif'
          : 'image/jpeg';
    return `data:${mime};base64,${src}`;
};

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
    const { permissions, configs } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_appointments-gate-validation');
    // fail closed: menu gating alone doesn't stop a direct URL hit — never fetch without READ.
    const canRead = modes.includes(ModeEnum.Read);

    const [entry, setEntry] = useState<GateEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [comment, setComment] = useState('');
    // dock (Location of category "Dock") the agent can re-assign when validating access
    const [docks, setDocks] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedDock, setSelectedDock] = useState<string | undefined>();

    // CONFIRMED / ON_SITE codes from the configs reducer (no extra request).
    const codes = useMemo<GateStatusCodes | null>(() => {
        if (!configs || configs.length === 0) return null;
        const find = (re: RegExp) =>
            parseInt(
                configs.find((c: any) => c.scope === 'appointment_status' && re.test(c.value ?? ''))
                    ?.code,
                10
            );
        return {
            confirmed: find(/confirm/i),
            onSite: find(/on.?site|sur.?site|vor.?ort/i),
            cancelled: find(/cancel|annul|stornier/i)
        };
    }, [configs]);

    // Dock category code (location_category = "Dock"), used to list re-assignable docks.
    const dockCategory = useMemo(() => {
        const c = configs?.find(
            (x: any) => x.scope === 'location_category' && /dock|quai|rampe|ramp/i.test(x.value ?? '')
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
            .then((res: any) => {
                if (!active) return;
                const exec = res?.executeRule;
                let raw: any = Array.isArray(exec)
                    ? exec
                    : (exec?.document_list?.value ?? exec?.documents?.value ?? exec?.value);
                if (raw == null && exec && typeof exec === 'object') {
                    const first: any = Object.values(exec)[0];
                    raw =
                        first && typeof first === 'object' && 'value' in first
                            ? first.value
                            : first;
                }
                setDocGroups(
                    (Array.isArray(raw) ? raw : []).map((imgs: any) =>
                        (Array.isArray(imgs) ? imgs : [imgs]).map(resolveImage)
                    )
                );
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    const signature: string | undefined = entry?.extras?.gateSignature ?? undefined;

    // Merge the gate marker into the appointment's existing extras.
    const mergeGate = (patch: Record<string, any>) => ({
        ...(entry?.extras ?? {}),
        gateCheckIn: { ...(entry?.extras?.gateCheckIn ?? {}), pending: false, ...patch }
    });

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
                    extras: mergeGate({
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

    // Refusal with two outcomes:
    //  - 'cancel' -> appointment set to CANCELLED (dead, driver turned away)
    //  - 'reset'  -> kept CONFIRMED so the driver can redo the radio process
    // Both set denyReason so the waiting iPad shows the refusal + reason.
    const onRefuse = async (reason: string, message: string | undefined, action: RefuseAction) => {
        if (!entry || !codes) return;
        const newStatus = action === 'cancel' ? codes.cancelled : codes.confirmed;
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
                    extras: mergeGate({
                        decision: 'refused',
                        decidedAt: dayjs().toISOString(),
                        refusalMessage: message || null,
                        refuseAction: action
                    })
                }
            });
            showSuccess(action === 'cancel' ? t('common:cancelled-done') : t('common:reset-done'));
            router.push(rootPath);
        } catch (e) {
            showError(t('common:generic-error'));
        } finally {
            setSubmitting(false);
            setRejectOpen(false);
        }
    };

    const title = entry?.driverName
        ? t('common:review-of', { name: entry.driverName })
        : t('common:validation-title');

    const actions =
        decision === 'pending' && modes.includes(ModeEnum.Update) ? (
            <Space>
                <Button type="primary" loading={submitting} onClick={() => setApproveOpen(true)}>
                    {t('common:approve')}
                </Button>
                <Button danger onClick={() => setRejectOpen(true)}>
                    {t('common:refuse')}
                </Button>
                <LinkButton title={t('common:edit')} path={`/appointments/edit/${id}`} />
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
                        <Descriptions.Item label={t('common:seal')}>
                            {entry?.extraText1 ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:weight')}>
                            {entry?.extraNumber1 ?? '-'}
                        </Descriptions.Item>
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
                                            {images.map((img, idx) => (
                                                <Image
                                                    key={idx}
                                                    src={img}
                                                    width={120}
                                                    style={{ borderRadius: 4 }}
                                                />
                                            ))}
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
                <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>
                        <strong>{t('common:planned-dock')}:</strong>{' '}
                        {entry?.locationName ?? '-'}
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
        </>
    );
};

GateValidationDetail.layout = MainLayout;

export default GateValidationDetail;
