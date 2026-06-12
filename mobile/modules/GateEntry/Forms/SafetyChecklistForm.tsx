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

// DESCRIPTION: gate-entry step 40 - documents to read and accept. The document
// images come from the `TRUCK_DRIVER_INFOS_DOCUMENTS` business rule (input: the
// kiosk language). Each group of images gets one "I have read and accept ..."
// checkbox underneath; all groups are mandatory.

import { WrapperForm, StyledForm, ContentSpin } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Checkbox, Divider, Form, Image, Space } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

const DOCUMENT_RULE = 'TRUCK_DRIVER_INFOS_DOCUMENTS';

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
    const [groups, setGroups] = useState<DocumentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    // Resolve the documents from the business rule for the chosen language.
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
            .then((res: any) => {
                if (!active) return;
                // executeRule may return the groups array directly, or an object
                // keyed by output name with a `.value` (cf. document_list.value).
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
                // Each element is a group of image references -> normalise to data-URIs.
                const parsed: DocumentGroup[] = (Array.isArray(raw) ? raw : []).map(
                    (imgs: any, i: number) => ({
                        code: `group${i}`,
                        images: (Array.isArray(imgs) ? imgs : [imgs]).map(toImageSrc)
                    })
                );
                setGroups(parsed);
                // Re-entry: documents were already accepted -> pre-tick them.
                if (alreadyAccepted) {
                    const all: Record<string, boolean> = {};
                    parsed.forEach((g) => (all[g.code] = true));
                    setChecked(all);
                }
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

    const acceptedCount = groups.filter((g) => checked[g.code]).length;
    const complete = groups.length > 0 && acceptedCount === groups.length;

    const toggle = (code: string) => setChecked((prev) => ({ ...prev, [code]: !prev[code] }));

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
                // Store only metadata (rule + language + acceptance) — NOT the
                // document images. The web re-fetches them from the rule.
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
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {groups.map((g) => (
                        <div
                            key={g.code}
                            style={{
                                border: '1px solid #f0f0f0',
                                borderRadius: 5,
                                padding: 12
                            }}
                        >
                            <Image.PreviewGroup>
                                {g.images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            marginBottom: 8
                                        }}
                                    >
                                        <Image src={img} width="80%" style={{ borderRadius: 4 }} />
                                    </div>
                                ))}
                            </Image.PreviewGroup>
                            <Checkbox
                                checked={!!checked[g.code]}
                                onChange={() => toggle(g.code)}
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
                <Alert
                    type={complete ? 'success' : 'warning'}
                    showIcon
                    message={
                        complete
                            ? t('common:all-confirmed')
                            : t('common:count-confirmed', {
                                  y: acceptedCount,
                                  total: groups.length
                              })
                    }
                />
            </StyledForm>
        </WrapperForm>
    );
};

SafetyChecklistForm.displayName = 'SafetyChecklistForm';
