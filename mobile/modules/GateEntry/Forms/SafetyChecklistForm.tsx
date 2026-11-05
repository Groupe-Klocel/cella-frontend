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

// On top of the acceptance flag, the step now hands the NEXT step the identity of the
// documents it actually displayed (id / name / modified / size / fingerprint), so the signature can
// be replayed later without re-running the rule. The mandatory checkbox is unchanged in behaviour.
// Tablet UI: The progress alert sits ABOVE the documents so it stays in view, the
// card turns green once accepted, and the acceptance row is a large tap target carrying a Required
// tag until it is ticked (classes styled by modules/Common/Kiosk/KioskSkin.tsx).

// DESCRIPTION: gate-entry step 40 - documents to read and accept. The
// `TRUCK_DRIVER_INFOS_DOCUMENTS` business rule (input: the kiosk language) now returns a flat list
// of custom-object NAMES; we resolve each name to the `documentAttached` of the matching custom
// object (category "Truck and visitors documents") and display it (image or PDF). A single
// "I have read and accept ..." checkbox gates the step.

import { WrapperForm, StyledForm, ContentSpin } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Checkbox, Form, Tag } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import {
    AcceptedDocument,
    DocumentViewer,
    fetchCustomObjectDocuments,
    parseDocumentNames,
    toAcceptedDocuments
} from '@CommonRadio';

const DOCUMENT_RULE = 'TRUCK_DRIVER_INFOS_DOCUMENTS';

export interface ISafetyChecklistFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const SafetyChecklistForm = ({
    processName,
    stepNumber,
    formToUse
}: ISafetyChecklistFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const appointment = storedObject['step20']?.data?.appointment ?? null;

    // The rule expects the locale as-is (e.g. fr-FR / en-US), not uppercased.
    const language = storedObject['step10']?.data?.lang ?? router.locale ?? 'en-US';
    const alreadyAccepted = appointment?.extras?.safetyChecklist?.accepted === true;

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    // documentAttached data URIs, resolved from the custom-object names returned by the rule
    const [documents, setDocuments] = useState<string[]>([]);
    // Identity + fingerprint of those same documents, in the same order, to be persisted
    const [acceptedDocuments, setAcceptedDocuments] = useState<AcceptedDocument[]>([]);
    // number of document names the rule returned; used to detect resolution failures
    const [expectedCount, setExpectedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [accepted, setAccepted] = useState(false);

    // Resolve the document names from the business rule, then fetch each custom object's document.
    useEffect(() => {
        let active = true;
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
                    state.parameters,
                    names
                );
                // Fingerprint the payloads as served, before anything can change upstream.
                const snapshot = await toAcceptedDocuments(docs);
                if (!active) return;
                setExpectedCount(names.length);
                setDocuments(docs.map((d) => d.documentAttached));
                setAcceptedDocuments(snapshot);
                // Re-entry: documents were already accepted -> pre-tick.
                if (alreadyAccepted) setAccepted(true);
            })
            .catch(() => {
                if (active) showError(t('common:generic-error'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Distinguish "no documents configured" (rule returned no names -> may proceed) from
    // "documents expected but not all resolved" (missing category/param, name typo, missing
    // documentAttached) -> block with an error so a mandatory safety document is never skipped.
    const missingDocuments = expectedCount > documents.length;
    const complete = !missingDocuments && (expectedCount === 0 || accepted);

    const onFinish = () => {
        if (!complete) {
            showError(
                missingDocuments
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
                // Store metadata (rule + language + acceptance) and the IDENTITY of the documents
                // shown — NOT their payloads. The identity is what makes the acceptance
                // auditable; without it the review screen has to re-run the rule and would show
                // today's documents instead of the ones that were signed.
                data: {
                    documentRule: DOCUMENT_RULE,
                    language,
                    accepted: true,
                    documents: acceptedDocuments
                }
            },
            customFields: [{ key: 'currentStep', value: 50 }]
        });
    };

    if (loading) {
        return <ContentSpin />;
    }

    // Status line, kept ABOVE the documents so it stays in view while the PDFs scroll.
    const statusAlert = missingDocuments ? (
        <Alert type="error" showIcon message={t('common:safety-documents-load-error')} />
    ) : documents.length === 0 ? (
        <Alert type="info" showIcon message={t('common:no-safety-documents')} />
    ) : (
        <Alert
            type={complete ? 'success' : 'warning'}
            showIcon
            message={t('common:documents-msg')}
            description={complete ? t('common:all-confirmed') : t('common:must-confirm-all')}
        />
    );

    return (
        <WrapperForm>
            <div style={{ marginBottom: 16 }}>{statusAlert}</div>
            <StyledForm name="gate-checklist" form={form} onFinish={onFinish}>
                {documents.length > 0 ? (
                    <div
                        className={`kiosk-zone-card${accepted ? ' is-accepted' : ''}`}
                        style={{
                            border: `2px solid ${accepted ? '#52c41a' : '#e0e0e0'}`,
                            background: accepted ? '#f6ffed' : '#ffffff'
                        }}
                    >
                        <DocumentViewer documents={documents} />
                        {/* The whole row is the tap target (antd Checkbox renders a label). */}
                        <Checkbox
                            checked={accepted}
                            onChange={() => setAccepted((prev) => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                marginTop: 16,
                                padding: '14px 18px',
                                borderRadius: 10,
                                background: accepted ? '#d9f7be' : '#fafafa'
                            }}
                        >
                            <span className="kiosk-accept-label">
                                {t('common:read-and-accept-docs')}
                                {accepted ? (
                                    <CheckCircleFilled style={{ color: '#52c41a', fontSize: 24 }} />
                                ) : (
                                    <Tag
                                        color="red"
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            lineHeight: '22px',
                                            margin: 0
                                        }}
                                    >
                                        {t('common:mandatory')}
                                    </Tag>
                                )}
                            </span>
                        </Checkbox>
                    </div>
                ) : null}
            </StyledForm>
        </WrapperForm>
    );
};

SafetyChecklistForm.displayName = 'SafetyChecklistForm';
