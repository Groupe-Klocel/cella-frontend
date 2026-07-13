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

// DESCRIPTION: visitor-entry step 50 - digital signature. On validation the
// whole registration is persisted onto the visit (created for walk-ins,
// updated for pre-registered visitors) and the visitor moves to the waiting
// screen. NOTE: the extras keys (visitorCheckIn / visitorSignature) are
// deliberately different from the truck gateCheckIn ones so that visits never
// appear in the truck Gate validation screen.

import { WrapperForm, NavButton } from '@components';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Space, Typography } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';
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
}

export const VisitorSignatureForm = ({
    processName,
    stepNumber,
    submitTrigger: { triggerSubmit, setTriggerSubmit },
    loading: { setIsLoading }
}: IVisitorSignatureFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { configs } = state;
    const storedObject = state[processName] || {};
    const padRef = useRef<SignaturePadHandle>(null);

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

            // Type / status codes resolved at runtime from the configs reducer.
            const visitTypeCode = resolveVisitTypeCode(configs);
            const statusCodes = resolveVisitStatusCodes(configs);

            const now = new Date().toISOString();
            // Checklist metadata + signature + visitor check-in marker ->
            // extras. Any pre-existing extras are preserved.
            const extras = {
                ...(visit?.extras ?? {}),
                visitorCheckIn: { at: now, pending: true },
                safetyChecklist: { zones, language, accepted: true, acceptedAt: now },
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
            <Text style={{ display: 'block', fontSize: 16, marginBottom: 8, textAlign: 'center' }}>
                {t('common:signature-msg')}
            </Text>
            <SignaturePad ref={padRef} initialDataUrl={visit?.extras?.visitorSignature ?? null} />
            <Space style={{ marginTop: 12 }}>
                <NavButton icon={<UndoOutlined />} onClick={() => padRef.current?.clear()}>
                    {t('common:clear')}
                </NavButton>
            </Space>
        </WrapperForm>
    );
};

VisitorSignatureForm.displayName = 'VisitorSignatureForm';
