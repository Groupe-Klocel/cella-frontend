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

// `safetyChecklist` now also carries `documents` — the identity of the documents the
// visitor was actually shown, fingerprinted at step 40 and tagged with the zone each one was
// resolved for. It is ADDED next to the existing keys (`zones` is untouched), because `extras` is a
// whole-object replace and several clients write it.
// NOTE: `web/helpers/utils/appointmentGateQueue.ts` (readAppointmentExtras / buildExtrasPatchInput,
// which re-read `extras` from the API before patching) has NO mobile counterpart — it lives in the
// `web` workspace — and would not fit the walk-in branch, where the visit does not exist yet. The
// existing write mechanism is therefore kept as-is.
//
// Tablet UI: The pad is taller (CSS in modules/Common/Kiosk/KioskSkin.tsx), the requirement is
// shown as a tag that turns green once drawn, "Clear" is a full-size button, and the drawn state is
// reported to the page (`onCanSubmitChange`) so its Validate button stays disabled until then.

// DESCRIPTION: visitor-entry step 50 - digital signature. On validation the
// whole registration is persisted onto the visit (created for walk-ins,
// updated for pre-registered visitors) and the visitor moves to the waiting
// screen. NOTE: the extras keys (visitorCheckIn / visitorSignature) are
// deliberately different from the truck gateCheckIn ones so that visits never
// appear in the truck Gate validation screen.

import { WrapperForm } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Tag, Typography } from 'antd';
import { CheckCircleFilled, UndoOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { SignaturePad, SignaturePadHandle } from '../../GateEntry/components/SignaturePad';
import {
    Visit,
    VisitorRegistrationData,
    resolveVisitStatusCodes,
    resolveVisitTypeCode
} from '../types';

const { Text } = Typography;

export interface IVisitorSignatureFormProps {
    processName: string;
    stepNumber: number;
    submitTrigger: { triggerSubmit: boolean; setTriggerSubmit: (b: boolean) => void };
    loading: { isLoading: boolean; setIsLoading: (b: boolean) => void };
    // Lets the page enable its "Validate" button only once something has been drawn.
    onCanSubmitChange?: (canSubmit: boolean) => void;
}

export const VisitorSignatureForm = ({
    processName,
    stepNumber,
    submitTrigger: { triggerSubmit, setTriggerSubmit },
    loading: { setIsLoading },
    onCanSubmitChange
}: IVisitorSignatureFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { configs } = state;
    const storedObject = state[processName] || {};
    const padRef = useRef<SignaturePadHandle>(null);
    // Mirrors the pad's drawn state for the tag here and the page's Validate button.
    const [hasDrawn, setHasDrawn] = useState(false);
    const onDrawnChange = (drawn: boolean) => {
        setHasDrawn(drawn);
        onCanSubmitChange?.(drawn);
    };

    const visit: Visit | null = storedObject['step20']?.data?.visit ?? null;
    const isWalkIn: boolean = storedObject['step20']?.data?.isWalkIn ?? false;
    const registration: VisitorRegistrationData | undefined =
        storedObject['step30']?.data?.registration;

    const submit = async () => {
        const signature = padRef.current?.getDataUrl() ?? null;
        if (!signature) {
            showError(t('common:required'));
            return;
        }
        if (!registration) return;

        setIsLoading(true);
        try {
            const checklist = storedObject['step40']?.data ?? {};
            const zones: string[] = checklist.zones ?? [];
            const language: string | null = checklist.language ?? null;
            // Id / name / modified / size / fingerprint / zone per document, snapshotted at
            // step 40. The payloads themselves are NOT stored; only what identifies them.
            const documents: any[] = checklist.documents ?? [];

            // Type / status codes resolved at runtime from the configs reducer.
            const visitTypeCode = resolveVisitTypeCode(configs);
            const statusCodes = resolveVisitStatusCodes(configs);

            const now = new Date().toISOString();
            // Checklist metadata + signature + visitor check-in marker ->
            // extras. Any pre-existing extras are preserved.
            const extras = {
                ...(visit?.extras ?? {}),
                visitorCheckIn: { at: now, pending: true },
                safetyChecklist: {
                    zones,
                    language,
                    accepted: true,
                    acceptedAt: now,
                    // What was signed, frozen. An empty array is written when no zone had a
                    // document, which is itself the information to keep.
                    documents
                },
                visitorSignature: signature
            };

            let visitId: string;
            if (isWalkIn) {
                // Walk-in: create the visit now; the server generates the
                // reference (no name), no end date is set.
                const res = await graphqlRequestClient.request(
                    gql`
                        mutation createWalkInVisit($input: CreateAppointmentInput!) {
                            createAppointment(input: $input) {
                                id
                            }
                        }
                    `,
                    {
                        input: {
                            appointmentType: visitTypeCode,
                            status: statusCodes.toBeChecked,
                            appointmentDateBegin: now,
                            driverName: registration.visitorName,
                            driverEmail: registration.email || null,
                            driverPhoneNumber: registration.phoneNumber || null,
                            entityName: registration.companyName || null,
                            contactName: registration.contactName || null,
                            comment: registration.reason || null,
                            allowedZones: registration.zones ?? [],
                            truckLicensePlate: registration.licensePlate || null,
                            denyReason: null,
                            extras
                        }
                    }
                );
                visitId = res?.createAppointment?.id;
            } else {
                const res = await graphqlRequestClient.request(
                    gql`
                        mutation updateVisitForVisitor(
                            $id: String!
                            $input: UpdateAppointmentInput!
                        ) {
                            updateAppointment(id: $id, input: $input) {
                                id
                            }
                        }
                    `,
                    {
                        id: visit!.id,
                        input: {
                            driverName: registration.visitorName,
                            driverEmail: registration.email || null,
                            driverPhoneNumber: registration.phoneNumber || null,
                            entityName: registration.companyName || null,
                            truckLicensePlate: registration.licensePlate || null,
                            // Clear any previous refusal so a restart begins clean.
                            denyReason: null,
                            extras
                        }
                    }
                );
                visitId = res?.updateAppointment?.id ?? visit!.id;
            }

            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    previousStep: storedObject.currentStep,
                    data: { visitId }
                },
                customFields: [{ key: 'currentStep', value: 60 }]
            });
        } catch (e) {
            showError(t('common:generic-error'));
        } finally {
            setIsLoading(false);
        }
    };

    // The page "Validate" button raises this trigger (like the gate-entry flow).
    useEffect(() => {
        if (triggerSubmit) {
            setTriggerSubmit(false);
            submit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerSubmit]);

    return (
        <WrapperForm>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <Text className="kiosk-sign-title">{t('common:signature-msg')}</Text>
                <Tag
                    color={hasDrawn ? 'success' : 'red'}
                    icon={hasDrawn ? <CheckCircleFilled /> : undefined}
                    style={{
                        marginLeft: 12,
                        fontSize: 14,
                        lineHeight: '24px',
                        fontWeight: 600,
                        verticalAlign: 'middle'
                    }}
                >
                    {hasDrawn ? null : t('common:mandatory')}
                </Tag>
            </div>
            <SignaturePad
                ref={padRef}
                initialDataUrl={visit?.extras?.visitorSignature ?? null}
                onDrawnChange={onDrawnChange}
            />
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 14
                }}
            >
                <Text type="secondary" className="kiosk-sign-hint">
                    {t('common:signature-hint')}
                </Text>
                <Button
                    icon={<UndoOutlined />}
                    onClick={() => padRef.current?.clear()}
                    style={{ fontSize: 18, paddingInline: 24 }}
                >
                    {t('common:clear')}
                </Button>
            </div>
        </WrapperForm>
    );
};

VisitorSignatureForm.displayName = 'VisitorSignatureForm';
