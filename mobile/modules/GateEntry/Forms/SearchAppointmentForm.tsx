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

// DESCRIPTION: gate-entry step 20 - find a confirmed appointment by number or
// truck plate (or QR), otherwise the driver can request an ad-hoc entry.

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Divider, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISearchAppointmentFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const SearchAppointmentForm = ({
    processName,
    stepNumber,
    formToUse
}: ISearchAppointmentFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { configs } = state;
    const storedObject = state[processName] || {};

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [camData, setCamData] = useState<string | undefined>();
    const [notFound, setNotFound] = useState(false);

    // A scanned QR code is treated as an appointment number.
    useEffect(() => {
        if (camData) {
            form.setFieldsValue({ refNumber: camData });
            form.submit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camData]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };

    // CONFIRMED status code, read from the configs reducer (no extra request).
    const confirmedStatus = parseInt(
        configs?.find(
            (c: any) => c.scope === 'appointment_status' && /confirm/i.test(c.value ?? '')
        )?.code,
        10
    );

    const onFinish = async (values: any) => {
        const name = values.refNumber?.trim() || undefined;
        const plate = values.truckLicensePlate?.trim() || undefined;
        if (!name && !plate) return;

        setNotFound(false);

        // Search by appointment number (= name) first, then by truck plate.
        const query = gql`
            query searchAppointmentForGate($filters: AppointmentSearchFilters) {
                appointments(filters: $filters) {
                    results {
                        id
                        name
                        status
                        statusText
                        appointmentType
                        appointmentTypeText
                        truckLicensePlate
                        trailerLicensePlate
                        driverName
                        driverPhoneNumber
                        driverEmail
                        entityName
                        reference1
                        safetyChecklistTemplate
                        denyReason
                        appointmentDateBegin
                        appointmentDateEnd
                        extraText1
                        extraNumber1
                        extras
                        location {
                            name
                        }
                    }
                }
            }
        `;
        const attempts = [name ? { name } : null, plate ? { truckLicensePlate: plate } : null].filter(
            Boolean
        ) as any[];

        try {
            let appointment: any = null;
            for (const filters of attempts) {
                const res = await graphqlRequestClient.request(query, { filters });
                const results: any[] = res?.appointments?.results ?? [];
                if (results.length > 0) {
                    appointment = { ...results[0], locationName: results[0].location?.name ?? null };
                    break;
                }
            }
            const isConfirmed =
                appointment && (!confirmedStatus || appointment.status === confirmedStatus);
            if (appointment && isConfirmed) {
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        previousStep: storedObject.currentStep,
                        data: { appointment, isAdHoc: false }
                    },
                    customFields: [{ key: 'currentStep', value: 30 }]
                });
            } else {
                setNotFound(true);
            }
        } catch (e) {
            setNotFound(true);
        }
    };

    return (
        <WrapperForm>
            <StyledForm
                name="gate-search"
                layout="vertical"
                form={form}
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
            >
                <StyledFormItem label={t('common:scan-qr')}>
                    <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                </StyledFormItem>

                <Divider plain>{t('common:or')}</Divider>

                {notFound && (
                    <Alert
                        type="error"
                        showIcon
                        message={t('common:not-found')}
                        style={{ marginBottom: 12 }}
                    />
                )}

                <StyledFormItem label={t('common:ref-number')} name="refNumber">
                    <Input placeholder={t('common:ref-number-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem label={t('common:truck-plate')} name="truckLicensePlate">
                    <Input placeholder={t('common:truck-plate-ph')} allowClear />
                </StyledFormItem>
            </StyledForm>
        </WrapperForm>
    );
};

SearchAppointmentForm.displayName = 'SearchAppointmentForm';
