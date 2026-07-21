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

// DESCRIPTION: gate-entry step 40 - documents to read and accept. The
// `TRUCK_DRIVER_INFOS_DOCUMENTS` business rule (input: the kiosk language) now returns a flat list
// of custom-object NAMES; we resolve each name to the `documentAttached` of the matching custom
// object (category "Truck and visitors documents") and display it (image or PDF). A single
// "I have read and accept ..." checkbox gates the step.

import { WrapperForm, StyledForm, ContentSpin } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Checkbox, Divider, Form } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { DocumentViewer, fetchCustomObjectDocuments, parseDocumentNames } from '@CommonRadio';

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
                if (!active) return;
                setExpectedCount(names.length);
                setDocuments(docs.map((d) => d.documentAttached));
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
                // Store only metadata (rule + language + acceptance) — NOT the
                // documents. The web re-fetches them from the rule + custom objects.
                data: {
                    documentRule: DOCUMENT_RULE,
                    language,
                    accepted: true
                }
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
            <StyledForm name="gate-checklist" form={form} onFinish={onFinish}>
                {documents.length > 0 ? (
                    <div
                        style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: 5,
                            padding: 12
                        }}
                    >
                        <DocumentViewer documents={documents} />
                        <Checkbox
                            checked={accepted}
                            onChange={() => setAccepted((prev) => !prev)}
                            style={{ display: 'flex', alignItems: 'flex-start', marginTop: 10 }}
                        >
                            <span style={{ fontSize: 15, lineHeight: 1.4 }}>
                                {t('common:read-and-accept-docs')}
                            </span>
                        </Checkbox>
                    </div>
                ) : null}
                <Divider />
                {missingDocuments ? (
                    <Alert
                        type="error"
                        showIcon
                        message={t('common:safety-documents-load-error')}
                    />
                ) : documents.length === 0 ? (
                    <Alert type="info" showIcon message={t('common:no-safety-documents')} />
                ) : (
                    <Alert
                        type={complete ? 'success' : 'warning'}
                        showIcon
                        message={
                            complete ? t('common:all-confirmed') : t('common:must-confirm-all')
                        }
                    />
                )}
            </StyledForm>
        </WrapperForm>
    );
};

SafetyChecklistForm.displayName = 'SafetyChecklistForm';
