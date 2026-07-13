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

// DESCRIPTION: visitor-entry step 20 - find a pre-registered visit by reference
// number (or QR), otherwise the visitor can continue as a walk-in.

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Divider, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { Visit, resolveVisitStatusCodes, resolveVisitTypeCode } from '../types';

export interface ISearchVisitFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const SearchVisitForm = ({ processName, stepNumber, formToUse }: ISearchVisitFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { configs } = state;
    const storedObject = state[processName] || {};

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [camData, setCamData] = useState<string | undefined>();
    const [errorKey, setErrorKey] = useState<string | null>(null);

    // A scanned QR code is treated as a visit reference number.
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

    const onFinish = async (values: any) => {
        const name = values.refNumber?.trim() || undefined;
        if (!name) return;

        setErrorKey(null);

        const query = gql`
            query searchVisitForVisitor($filters: AppointmentSearchFilters) {
                appointments(filters: $filters) {
                    results {
                        id
                        name
                        status
                        statusText
                        appointmentType
                        driverName
                        driverEmail
                        driverPhoneNumber
                        entityName
                        contactName
                        comment
                        allowedZones
                        escortRequired
                        otherRequirements
                        truckLicensePlate
                        appointmentDateBegin
                        appointmentDateEnd
                        denyReason
                        extras
                    }
                }
            }
        `;

        try {
            const res = await graphqlRequestClient.request(query, { filters: { name } });
            const results: Visit[] = res?.appointments?.results ?? [];
            // Visit type and status codes resolved at runtime from the configs.
            const visitTypeCode = resolveVisitTypeCode(configs);
            const statusCodes = resolveVisitStatusCodes(configs);

            // Only appointments of type "visit" are eligible on this kiosk.
            const visit =
                results.find((r) => !visitTypeCode || r.appointmentType === visitTypeCode) ?? null;

            if (!visit) {
                setErrorKey('common:visit-not-found');
            } else if (statusCodes.checkedIn && visit.status === statusCodes.checkedIn) {
                setErrorKey('common:visit-already-checked-in');
            } else if (statusCodes.checkedOut && visit.status === statusCodes.checkedOut) {
                setErrorKey('common:visit-already-checked-out');
            } else if (statusCodes.cancelled && visit.status === statusCodes.cancelled) {
                setErrorKey('common:visit-cancelled');
            } else if (!statusCodes.preRegistered || visit.status === statusCodes.preRegistered) {
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        previousStep: storedObject.currentStep,
                        data: { visit, isWalkIn: false }
                    },
                    customFields: [{ key: 'currentStep', value: 30 }]
                });
            } else {
                setErrorKey('common:visit-not-found');
            }
        } catch (e) {
            setErrorKey('common:visit-not-found');
        }
    };

    return (
        <WrapperForm>
            <StyledForm
                name="visitor-search"
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

                {errorKey && (
                    <Alert
                        type="error"
                        showIcon
                        message={t(errorKey)}
                        description={t('common:walk-in-hint')}
                        style={{ marginBottom: 12 }}
                    />
                )}

                <StyledFormItem label={t('common:ref-number')} name="refNumber">
                    <Input placeholder={t('common:ref-number-ph')} allowClear />
                </StyledFormItem>
            </StyledForm>
        </WrapperForm>
    );
};

SearchVisitForm.displayName = 'SearchVisitForm';
