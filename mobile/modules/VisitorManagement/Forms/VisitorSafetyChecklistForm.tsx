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

// DESCRIPTION: visitor-entry step 40 - safety documents to read and accept, one
// set per destination zone. The document images come from the
// `VISITOR_INFOS_DOCUMENTS` business rule (input: kiosk language + zone), which
// is executed once per zone. Each zone gets one mandatory acceptance checkbox.

import { WrapperForm, StyledForm, ContentSpin } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Checkbox, Divider, Form, Image, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { Visit, VisitorRegistrationData, getZoneLabel, parseAllowedZones } from '../types';

const { Title } = Typography;

const DOCUMENT_RULE = 'VISITOR_INFOS_DOCUMENTS';

// URLs/data-URIs pass through; base64 image content -> data-URI (like the
// appointments schedule page). MIME inferred from the base64 header.
const toImageSrc = (src: string): string => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const mime = src.startsWith('iVBOR')
        ? 'image/png'
        : src.startsWith('R0lGOD')
          ? 'image/gif'
          : 'image/jpeg';
    return `data:${mime};base64,${src}`;
};

interface DocumentGroup {
    code: string;
    images: string[];
}

interface ZoneDocuments {
    zone: string;
    groups: DocumentGroup[];
}

// executeRule may return the groups array directly, or an object keyed by
// output name with a `.value` (cf. document_list.value).
const parseRuleResult = (exec: any): DocumentGroup[] => {
    let raw: any = Array.isArray(exec)
        ? exec
        : (exec?.document_list?.value ?? exec?.documents?.value ?? exec?.value);
    if (raw == null && exec && typeof exec === 'object') {
        const first: any = Object.values(exec)[0];
        raw = first && typeof first === 'object' && 'value' in first ? first.value : first;
    }
    // Each element is a group of image references -> normalise to data-URIs.
    return (Array.isArray(raw) ? raw : []).map((imgs: any, i: number) => ({
        code: `group${i}`,
        images: (Array.isArray(imgs) ? imgs : [imgs]).map(toImageSrc)
    }));
};

export interface IVisitorSafetyChecklistFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const VisitorSafetyChecklistForm = ({
    processName,
    stepNumber,
    formToUse
}: IVisitorSafetyChecklistFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const visit: Visit | null = storedObject['step20']?.data?.visit ?? null;
    const isWalkIn: boolean = storedObject['step20']?.data?.isWalkIn ?? false;
    const registration: VisitorRegistrationData | undefined =
        storedObject['step30']?.data?.registration;

    // The rule expects the locale as-is (e.g. de-DE / en-US), not uppercased.
    const language = storedObject['step10']?.data?.lang ?? router.locale ?? 'en-US';
    // Zones: pre-registered -> the visit's allowedZones; walk-in -> the
    // destination zones chosen on the registration step.
    const zones: string[] = isWalkIn
        ? (registration?.zones ?? [])
        : parseAllowedZones(visit?.allowedZones);
    const alreadyAccepted = visit?.extras?.safetyChecklist?.accepted === true;

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [zoneDocs, setZoneDocs] = useState<ZoneDocuments[]>([]);
    const [loading, setLoading] = useState(true);
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    // Resolve the documents from the business rule, once per zone.
    useEffect(() => {
        let active = true;
        Promise.all(
            zones.map((zone) =>
                graphqlRequestClient
                    .request(
                        gql`
                            query executeRule($context: JSON!) {
                                executeRule(ruleName: "${DOCUMENT_RULE}", context: $context)
                            }
                        `,
                        { context: { language, zone } }
                    )
                    .then((res: any) => ({ zone, groups: parseRuleResult(res?.executeRule) }))
                    // a zone without a configured document set must not block
                    // the whole checklist: treat it as "no documents"
                    .catch(() => ({ zone, groups: [] as DocumentGroup[] }))
            )
        )
            .then((docs: ZoneDocuments[]) => {
                if (!active) return;
                setZoneDocs(docs);
                // Re-entry: documents were already accepted -> pre-tick them.
                if (alreadyAccepted) {
                    const all: Record<string, boolean> = {};
                    docs.forEach((d) => (all[d.zone] = true));
                    setChecked(all);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Only zones that actually have documents require an acceptance: when no
    // document set is configured, the step must not block the check-in.
    const zonesWithDocs = zoneDocs.filter((d) => d.groups.some((g) => g.images.length > 0));
    const acceptedCount = zonesWithDocs.filter((d) => checked[d.zone]).length;
    const complete = acceptedCount === zonesWithDocs.length;

    const toggle = (zone: string) => setChecked((prev) => ({ ...prev, [zone]: !prev[zone] }));

    const onFinish = () => {
        if (!complete) {
            showError(t('common:must-confirm-all'));
            return;
        }
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: {
                previousStep: storedObject.currentStep,
                // Store only metadata (zones + language + acceptance) — NOT the
                // document images. The web re-fetches them from the rule.
                data: { zones, language, accepted: true }
            },
            customFields: [{ key: 'currentStep', value: 50 }]
        });
    };

    if (loading) {
        return <ContentSpin />;
    }

    return (
        <WrapperForm>
            <Alert
                type="info"
                showIcon
                message={t('common:documents-msg')}
                style={{ marginBottom: 12 }}
            />
            <StyledForm name="visitor-checklist" form={form} onFinish={onFinish}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {zonesWithDocs.map((d) => (
                        <div
                            key={d.zone}
                            style={{
                                border: '1px solid #f0f0f0',
                                borderRadius: 5,
                                padding: 12
                            }}
                        >
                            <Title level={5} style={{ marginTop: 0 }}>
                                {t('common:zone')}:{' '}
                                {getZoneLabel(d.zone, state.parameters, language)}
                            </Title>
                            <Image.PreviewGroup>
                                {d.groups.map((g) =>
                                    g.images.map((img, idx) => (
                                        <div
                                            key={`${g.code}-${idx}`}
                                            style={{
                                                width: '100%',
                                                textAlign: 'center',
                                                marginBottom: 8
                                            }}
                                        >
                                            <Image
                                                src={img}
                                                width="80%"
                                                style={{ borderRadius: 4 }}
                                            />
                                        </div>
                                    ))
                                )}
                            </Image.PreviewGroup>
                            <Checkbox
                                checked={!!checked[d.zone]}
                                onChange={() => toggle(d.zone)}
                                style={{ display: 'flex', alignItems: 'flex-start', marginTop: 10 }}
                            >
                                <span style={{ fontSize: 15, lineHeight: 1.4 }}>
                                    {t('common:read-and-accept-docs')}
                                </span>
                            </Checkbox>
                        </div>
                    ))}
                </Space>
                <Divider />
                {zonesWithDocs.length === 0 ? (
                    <Alert type="info" showIcon message={t('common:no-safety-documents')} />
                ) : (
                    <Alert
                        type={complete ? 'success' : 'warning'}
                        showIcon
                        message={
                            complete
                                ? t('common:all-confirmed')
                                : t('common:count-confirmed', {
                                      y: acceptedCount,
                                      total: zonesWithDocs.length
                                  })
                        }
                    />
                )}
            </StyledForm>
        </WrapperForm>
    );
};

VisitorSafetyChecklistForm.displayName = 'VisitorSafetyChecklistForm';
