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

// `safetyChecklist` now also carries `documents` (the identity of the documents the
// driver was actually shown, fingerprinted at step 40) and `acceptedAt`. Both are ADDED next to the
// existing keys — nothing written here before is removed or renamed, because `extras` is a
// whole-object replace and several clients write it.
// NOTE: `web/helpers/utils/appointmentGateQueue.ts` (readAppointmentExtras /
// buildExtrasPatchInput, which re-read `extras` from the API before patching) has NO mobile
// counterpart — it lives in the `web` workspace and mobile cannot import from it. It would not fit
// the ad-hoc branch either, where the appointment does not exist yet. So the existing write
// mechanism is kept as-is: spread of the step-20 `appointment.extras` snapshot.
//
// Tablet UI: The pad is taller (CSS in modules/Common/Kiosk/KioskSkin.tsx), the
// requirement is shown as a tag that turns green once drawn, "Clear" is a full-size button, and the
// drawn state is reported to the page (`onCanSubmitChange`) so its Validate button stays disabled
// until then.

// DESCRIPTION: gate-entry step 50 - digital signature. On validation the whole
// registration is persisted onto the appointment and the driver moves to the
// waiting screen.

import { WrapperForm } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Tag, Typography } from 'antd';
import { CheckCircleFilled, UndoOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { SignaturePad, SignaturePadHandle } from '../components/SignaturePad';
import { GateAppointment, RegistrationData } from '../types';

const { Text } = Typography;

export interface ISignatureFormProps {
    processName: string;
    stepNumber: number;
    submitTrigger: { triggerSubmit: boolean; setTriggerSubmit: (b: boolean) => void };
    loading: { isLoading: boolean; setIsLoading: (b: boolean) => void };
    // Lets the page enable its "Validate" button only once something has been drawn.
    onCanSubmitChange?: (canSubmit: boolean) => void;
}

export const SignatureForm = ({
    processName,
    stepNumber,
    submitTrigger: { triggerSubmit, setTriggerSubmit },
    loading: { setIsLoading },
    onCanSubmitChange
}: ISignatureFormProps) => {
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

    const appointment: GateAppointment | null = storedObject['step20']?.data?.appointment ?? null;
    const isAdHoc: boolean = storedObject['step20']?.data?.isAdHoc ?? false;
    const registration: RegistrationData | undefined = storedObject['step30']?.data?.registration;

    const submit = async () => {
        const signature = padRef.current?.getDataUrl() ?? null;
        if (!signature) {
            showError(t('common:required'));
            return;
        }
        if (!registration) return;

        setIsLoading(true);
        try {
            // Document checklist metadata (rule + language). The images are NOT stored on the
            // appointment; only the IDENTITY of each document shown is, so the acceptance can
            // be replayed later without re-running the rule.
            const documentRule = storedObject['step40']?.data?.documentRule ?? null;
            const documentLanguage = storedObject['step40']?.data?.language ?? null;
            // Id / name / modified / size / fingerprint per document, snapshotted at step 40.
            const acceptedDocuments = storedObject['step40']?.data?.documents ?? [];
            const acceptedAt = new Date().toISOString();

            // Status / type codes from the configs reducer (no extra request).
            const findCode = (scope: string, re: RegExp) =>
                parseInt(
                    (configs ?? []).find((c: any) => c.scope === scope && re.test(c.value ?? ''))
                        ?.code,
                    10
                );
            const confirmedStatus = findCode('appointment_status', /confirm/i);
            const defaultAppointmentType = findCode(
                'appointment_type',
                /inbound|décharg|unload|entr/i
            );

            // container -> extraText1, supplier -> entityAccountingCode,
            // signature + checklist + gate check-in marker -> extras.
            const extras = {
                ...(appointment?.extras ?? {}),
                gateCheckIn: { at: new Date().toISOString(), pending: true },
                safetyChecklist: {
                    template: documentRule ?? appointment?.safetyChecklistTemplate ?? null,
                    language: documentLanguage,
                    accepted: true,
                    // What was signed, frozen. An empty array is written when the rule
                    // returned no document, which is itself the information to keep.
                    documents: acceptedDocuments,
                    acceptedAt
                },
                gateSignature: signature,
                // Outbound driver declaration. No column exists for it, so it lives in `extras`
                // next to the safety-checklist acceptance — same nature: something the driver
                // asserted at the gate, kept as evidence.
                ...(registration.directTransportConfirmed !== undefined
                    ? {
                          directTransport: {
                              confirmed: registration.directTransportConfirmed,
                              at: new Date().toISOString()
                          }
                      }
                    : {})
            };
            const input: Record<string, any> = {
                driverName: registration.driverName,
                // `|| null` on everything APPOINTMENT_FIELD_RULES may hide: a hidden field is
                // never registered by AntD, so it arrives undefined and would be dropped from the
                // mutation entirely. Sending an explicit null instead also CLEARS a stale value on
                // the existing appointment, which matters on the reset->restart path.
                entityName: registration.companyName || null,
                entityAccountingCode: registration.supplier ?? null,
                driverPhoneNumber: registration.driverPhoneNumber || null,
                truckLicensePlate: registration.truckLicensePlate || null,
                trailerLicensePlate: registration.trailerLicensePlate || null,
                extraText1: registration.containerNumber || null,
                // real column (Float, hours); undefined on inbound so the key is simply absent
                driverDrivingTime: registration.driverDrivingTime ?? null,
                // Clear any previous refusal so a reset->restart begins clean.
                denyReason: null,
                extras
            };

            let appointmentId: string;
            if (isAdHoc) {
                // Ad-hoc: arrival now -> begin = now, end = now + chosen duration.
                const begin = new Date();
                const end = new Date(
                    begin.getTime() + (registration.durationMinutes ?? 60) * 60000
                );
                const res = await graphqlRequestClient.request(
                    gql`
                        mutation createAdHocGateAppointment($input: CreateAppointmentInput!) {
                            createAppointment(input: $input) {
                                id
                            }
                        }
                    `,
                    {
                        input: {
                            ...input,
                            appointmentType: defaultAppointmentType,
                            status: confirmedStatus,
                            carrierId: registration.carrierId || null,
                            appointmentDateBegin: begin.toISOString(),
                            appointmentDateEnd: end.toISOString()
                        }
                    }
                );
                appointmentId = res?.createAppointment?.id;
            } else {
                const res = await graphqlRequestClient.request(
                    gql`
                        mutation updateAppointmentForGate(
                            $id: String!
                            $input: UpdateAppointmentInput!
                        ) {
                            updateAppointment(id: $id, input: $input) {
                                id
                            }
                        }
                    `,
                    { id: appointment!.id, input }
                );
                appointmentId = res?.updateAppointment?.id ?? appointment!.id;
            }

            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    previousStep: storedObject.currentStep,
                    data: { appointmentId, signature }
                },
                customFields: [{ key: 'currentStep', value: 60 }]
            });
        } catch (e) {
            showError(t('common:generic-error'));
        } finally {
            setIsLoading(false);
        }
    };

    // The page "Validate" button raises this trigger (like the picking flow).
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
                initialDataUrl={appointment?.extras?.gateSignature ?? null}
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

SignatureForm.displayName = 'SignatureForm';
