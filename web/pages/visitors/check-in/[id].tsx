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
    getVisitStatusCodes,
    getVisitZones,
    getVisitZoneLabel,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation,
    VISITOR_DOCUMENT_RULE
} from '@helpers';
import { CheckCircleTwoTone, CloseCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Image,
    Input,
    Modal,
    Radio,
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
import { classifyVisitEntry, VisitEntry, VISIT_ENTRY_FIELDS } from 'modules/Visitors/types';
import { VisitorRejectModal } from 'modules/Visitors/Elements/VisitorRejectModal';
import { visitorCheckInRoutes } from 'modules/Visitors/Static/visitorsRoutes';

dayjs.extend(utc);
dayjs.extend(timezone);

type PageComponent = FC & { layout: typeof MainLayout };

const rootPath = '/visitors/check-in';

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
    mutation updateVisitorCheckIn($id: String!, $input: UpdateAppointmentInput!) {
        updateAppointment(id: $id, input: $input) {
            id
            status
        }
    }
`;

const VisitorCheckInDetail: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { id, timezone: timezoneQuery } = router.query;
    const tz =
        (Array.isArray(timezoneQuery) ? timezoneQuery[0] : timezoneQuery) || dayjs.tz.guess();
    const { graphqlRequestClient } = useAuth();
    const { permissions, configs, parameters } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_visitor-check-in');
    const language = router.locale ?? 'en-US';

    const [entry, setEntry] = useState<VisitEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [grantedZones, setGrantedZones] = useState<string[]>([]);
    const [escortRequired, setEscortRequired] = useState<boolean>(false);

    const codes = useMemo(() => getVisitStatusCodes(configs), [configs]);
    const zoneParams = useMemo(() => getVisitZones(parameters), [parameters]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        graphqlRequestClient
            .request(
                gql`
                    query getVisitorCheckIn($id: String!) {
                        appointment(id: $id) {
                            ${VISIT_ENTRY_FIELDS}
                        }
                    }
                `,
                { id }
            )
            .then((res: any) => {
                const visit = res?.appointment ?? null;
                setEntry(visit);
                setGrantedZones(Array.isArray(visit?.allowedZones) ? visit.allowedZones : []);
                setEscortRequired(visit?.escortRequired ?? false);
            })
            .finally(() => setLoading(false));
    }, [graphqlRequestClient, id]);

    const decision = useMemo(
        () => (entry ? classifyVisitEntry(entry, codes) : 'pending'),
        [entry, codes]
    );

    const checklistMeta = entry?.extras?.safetyChecklist;
    const documentsAccepted = checklistMeta?.accepted === true;
    const acceptedZones: string[] = Array.isArray(checklistMeta?.zones) ? checklistMeta.zones : [];
    // zones granted beyond what the visitor accepted on the tablet require a
    // new tablet acceptance of the added zone before validation
    const zonesNotAccepted = grantedZones.filter((zone) => !acceptedZones.includes(zone));
    const [docGroupsByZone, setDocGroupsByZone] = useState<{ zone: string; images: string[] }[]>(
        []
    );

    useEffect(() => {
        if (!entry) return;
        let active = true;
        const rawLocale = checklistMeta?.language ?? router.locale ?? 'en-US';
        const [lng, region] = String(rawLocale).split('-');
        const ruleLanguage = region
            ? `${lng.toLowerCase()}-${region.toUpperCase()}`
            : lng.toLowerCase();
        const zones: string[] = acceptedZones.length
            ? acceptedZones
            : Array.isArray(entry.allowedZones)
              ? entry.allowedZones
              : [];
        Promise.all(
            zones.map((zone) =>
                graphqlRequestClient
                    .request(
                        gql`
                            query executeRule($context: JSON!) {
                                executeRule(ruleName: "${VISITOR_DOCUMENT_RULE}", context: $context)
                            }
                        `,
                        { context: { language: ruleLanguage, zone } }
                    )
                    .then((res: any) => {
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
                        const images = (Array.isArray(raw) ? raw : [])
                            .flat()
                            .map((img: any) => resolveImage(img));
                        return { zone, images };
                    })
                    .catch(() => ({ zone, images: [] as string[] }))
            )
        ).then((groups) => {
            if (active) setDocGroupsByZone(groups);
        });
        return () => {
            active = false;
        };
    }, [entry?.id]);

    const signature: string | undefined = entry?.extras?.visitorSignature ?? undefined;

    const mergeVisitorCheckIn = (patch: Record<string, any>) => ({
        ...(entry?.extras ?? {}),
        visitorCheckIn: { ...(entry?.extras?.visitorCheckIn ?? {}), pending: false, ...patch }
    });

    const onApprove = async () => {
        if (!entry) return;
        if (!Number.isFinite(codes.checkedIn)) {
            showError(t('common:generic-error'));
            return;
        }
        // blocking rule: no check-in without accepted instructions + signature
        if (!documentsAccepted || !signature) {
            showError(t('messages:visit-checklist-signature-required'));
            return;
        }
        setSubmitting(true);
        const now = dayjs().toISOString();
        try {
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: codes.checkedIn,
                    allowedZones: grantedZones,
                    escortRequired,
                    extraText1: now,
                    extras: mergeVisitorCheckIn({
                        decision: 'approved',
                        decidedAt: now,
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

    const onRefuse = async (reason: string, message: string | undefined) => {
        if (!entry) return;
        if (!Number.isFinite(codes.cancelled)) {
            showError(t('common:generic-error'));
            return;
        }
        setSubmitting(true);
        try {
            await graphqlRequestClient.request(UPDATE_MUTATION, {
                id: entry.id,
                input: {
                    status: codes.cancelled,
                    denyReason: message ? `${reason} — ${message}` : reason,
                    extras: mergeVisitorCheckIn({
                        decision: 'refused',
                        decidedAt: dayjs().toISOString(),
                        refusalMessage: message || null
                    })
                }
            });
            showSuccess(t('common:cancelled-done'));
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
        : t('common:visitor-check-in');

    const canDecide =
        decision === 'pending' && modes.includes(ModeEnum.Update) && !!documentsAccepted;

    const actions =
        decision === 'pending' && modes.includes(ModeEnum.Update) ? (
            <Space>
                <Button
                    type="primary"
                    loading={submitting}
                    disabled={!canDecide || !signature}
                    onClick={() => setApproveOpen(true)}
                >
                    {t('common:approve')}
                </Button>
                <Button danger onClick={() => setRejectOpen(true)}>
                    {t('common:refuse')}
                </Button>
            </Space>
        ) : (
            <LinkButton title={t('common:back-to-dashboard')} path={rootPath} />
        );

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
                routes={[...visitorCheckInRoutes, { breadcrumbName: title }]}
                onBack={() => router.push(rootPath)}
                actionsRight={actions}
            />
            <PageTableContentWrapper>
                {entry?.extras?.visitorCheckIn?.at && (
                    <Tag style={{ marginBottom: 12 }}>
                        {t('common:arrival-time')}:{' '}
                        {dayjs(entry.extras.visitorCheckIn.at).format('YYYY-MM-DD HH:mm')}
                    </Tag>
                )}

                <Card size="small" title={t('common:section-visitor')} style={{ marginBottom: 16 }}>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label={t('d:visitor-name')}>
                            {entry?.driverName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:company')}>
                            {entry?.entityName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:phone')}>
                            {entry?.driverPhoneNumber ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:email')}>
                            {entry?.driverEmail ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:license-plate')}>
                            {entry?.truckLicensePlate ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:ref-number')}>
                            {entry?.name ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card size="small" title={t('common:section-visit')} style={{ marginBottom: 16 }}>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label={t('d:visit-reason')}>
                            {entry?.comment ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:internal-referent')}>
                            {entry?.contactName ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common:planned-slot')}>
                            {entry?.appointmentDateBegin
                                ? dayjs
                                      .utc(entry.appointmentDateBegin)
                                      .tz(tz)
                                      .format('YYYY-MM-DD HH:mm')
                                : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:otherRequirements')}>
                            {entry?.otherRequirements ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:allowed-zones')}>
                            {decision === 'pending' && modes.includes(ModeEnum.Update) ? (
                                <Select
                                    mode="multiple"
                                    style={{ minWidth: 220 }}
                                    value={grantedZones}
                                    onChange={setGrantedZones}
                                    options={zoneParams.map((zone) => ({
                                        value: zone.value,
                                        label: zone.translation?.[language] ?? zone.value
                                    }))}
                                />
                            ) : (
                                (entry?.allowedZones ?? [])
                                    .map((zone: string) =>
                                        getVisitZoneLabel(parameters, zone, language)
                                    )
                                    .join(', ') || '-'
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('d:escortRequired')}>
                            {decision === 'pending' && modes.includes(ModeEnum.Update) ? (
                                <Radio.Group
                                    value={escortRequired}
                                    onChange={(e) => setEscortRequired(e.target.value)}
                                >
                                    <Radio value={true}>{t('common:yes')}</Radio>
                                    <Radio value={false}>{t('common:no')}</Radio>
                                </Radio.Group>
                            ) : entry?.escortRequired ? (
                                t('common:yes')
                            ) : (
                                t('common:no')
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                    {zonesNotAccepted.length > 0 ? (
                        <Alert
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginTop: 12 }}
                            message={t('messages:visit-zones-not-accepted-warning')}
                            description={zonesNotAccepted
                                .map((zone) => getVisitZoneLabel(parameters, zone, language))
                                .join(', ')}
                        />
                    ) : null}
                </Card>

                <Card size="small" title={t('common:documents-title')} style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                        {documentsAccepted ? (
                            <CheckCircleTwoTone twoToneColor="#52c41a" />
                        ) : (
                            <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                        )}{' '}
                        {t('common:read-and-accept-docs')}
                        {checklistMeta?.language ? (
                            <Tag style={{ marginLeft: 8 }}>{checklistMeta.language}</Tag>
                        ) : null}
                        {checklistMeta?.acceptedAt ? (
                            <Tag>{dayjs(checklistMeta.acceptedAt).format('YYYY-MM-DD HH:mm')}</Tag>
                        ) : null}
                    </div>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        {docGroupsByZone.map((group) => (
                            <div key={group.zone}>
                                <Tag color="blue" style={{ marginBottom: 8 }}>
                                    {getVisitZoneLabel(parameters, group.zone, language)}
                                </Tag>
                                <Image.PreviewGroup>
                                    <Space wrap size="small">
                                        {group.images.map((img, idx) => (
                                            <Image
                                                key={idx}
                                                src={img}
                                                width={120}
                                                style={{ borderRadius: 4 }}
                                            />
                                        ))}
                                    </Space>
                                </Image.PreviewGroup>
                            </div>
                        ))}
                    </Space>
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
                {zonesNotAccepted.length > 0 ? (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message={t('messages:visit-zones-not-accepted-warning')}
                    />
                ) : null}
                <Input.TextArea
                    rows={3}
                    placeholder={t('common:comment-optional')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </Modal>

            <VisitorRejectModal
                open={rejectOpen}
                confirmLoading={submitting}
                t={t}
                onCancel={() => setRejectOpen(false)}
                onConfirm={onRefuse}
            />
        </>
    );
};

VisitorCheckInDetail.layout = MainLayout;

export default VisitorCheckInDetail;
