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

// DESCRIPTION: visitor-entry step 40 - safety documents to read and accept, one set per destination
// zone. The `VISITOR_INFOS_DOCUMENTS` business rule (input: kiosk language + allowedZones) is
// executed once per zone and now returns a flat list of custom-object NAMES; we resolve each name to
// the `documentAttached` of the matching custom object (category "Truck and visitors documents") and
// display it (image or PDF). Each zone gets one mandatory acceptance checkbox.

import { WrapperForm, StyledForm, ContentSpin } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Checkbox, Divider, Form, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { DocumentViewer, fetchCustomObjectDocuments, parseDocumentNames } from '@CommonRadio';
import { Visit, VisitorRegistrationData, getZoneLabel, parseAllowedZones } from '../types';

const { Title } = Typography;

const DOCUMENT_RULE = 'VISITOR_INFOS_DOCUMENTS';

interface ZoneDocuments {
    zone: string;
    // documentAttached data URIs, resolved from the custom-object names returned by the rule
    documents: string[];
    // number of names the rule returned for this zone (to detect resolution failures)
    expectedCount: number;
    // true when the rule call itself failed for this zone
    error: boolean;
}

// Intermediate per-zone rule result (names only), before the shared documents fetch resolves them.
interface ZoneNames {
    zone: string;
    names: string[];
    error: boolean;
}

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

    // Resolve the document names from the business rule (once per zone — the output can differ per
    // zone), then fetch the documents ONCE for the union of names so a document shared by several
    // zones is not re-downloaded (payloads can be large), and map them back per zone.
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
                        // allowedZones is the new rule input: documents can differ per allowed zone
                        { context: { language, allowedZones: zone } }
                    )
                    .then((res: any) => ({
                        zone,
                        names: parseDocumentNames(res?.executeRule),
                        error: false
                    }))
                    // the rule call itself failed for this zone -> flag it so the step blocks
                    // rather than silently treating the zone as "no documents configured"
                    .catch(() => ({ zone, names: [] as string[], error: true }))
            )
        )
            .then(async (perZone: ZoneNames[]) => {
                // De-duplicate names across every zone -> a single documents fetch for the union.
                const nameSet = new Set<string>();
                perZone.forEach((z) => z.names.forEach((n) => nameSet.add(n)));
                let byName = new Map<string, string>();
                let fetchFailed = false;
                try {
                    const docs = await fetchCustomObjectDocuments(
                        graphqlRequestClient,
                        state.parameters,
                        Array.from(nameSet)
                    );
                    byName = new Map(docs.map((d) => [d.name, d.documentAttached]));
                } catch {
                    // the shared documents fetch failed -> block every zone that expected documents
                    fetchFailed = true;
                }
                // Map each zone's names back to the shared documents, preserving order.
                const resolved: ZoneDocuments[] = perZone.map((z) => ({
                    zone: z.zone,
                    documents: z.names.map((n) => byName.get(n)).filter((d): d is string => !!d),
                    expectedCount: z.names.length,
                    error: z.error || (fetchFailed && z.names.length > 0)
                }));
                if (!active) return;
                setZoneDocs(resolved);
                // Re-entry: documents were already accepted -> pre-tick them.
                if (alreadyAccepted) {
                    const all: Record<string, boolean> = {};
                    resolved.forEach((d) => (all[d.zone] = true));
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

    // Zones with resolved documents require an acceptance.
    const zonesWithDocs = zoneDocs.filter((d) => d.documents.length > 0);
    // Zones where documents were expected (or the rule call failed) but not all resolved: block
    // with an error so a mandatory safety document is never silently skipped.
    const zonesFailed = zoneDocs.filter((d) => d.error || d.expectedCount > d.documents.length);
    const acceptedCount = zonesWithDocs.filter((d) => checked[d.zone]).length;
    const complete = zonesFailed.length === 0 && acceptedCount === zonesWithDocs.length;

    const toggle = (zone: string) => setChecked((prev) => ({ ...prev, [zone]: !prev[zone] }));

    const onFinish = () => {
        if (!complete) {
            showError(
                zonesFailed.length > 0
                    ? t('common:safety-documents-load-error')
                    : t('common:must-confirm-all')
            );
            return;
        }
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: {
                previousStep: storedObject.currentStep,
                // Store only metadata (zones + language + acceptance) — NOT the
                // documents. The web re-fetches them from the rule + custom objects.
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
                            <DocumentViewer documents={d.documents} />
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
                    {zonesFailed.map((d) => (
                        <Alert
                            key={`failed-${d.zone}`}
                            type="error"
                            showIcon
                            message={`${t('common:zone')}: ${getZoneLabel(
                                d.zone,
                                state.parameters,
                                language
                            )} — ${t('common:safety-documents-load-error')}`}
                        />
                    ))}
                </Space>
                <Divider />
                {zonesFailed.length > 0 ? (
                    <Alert
                        type="error"
                        showIcon
                        message={t('common:safety-documents-load-error')}
                    />
                ) : zonesWithDocs.length === 0 ? (
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
