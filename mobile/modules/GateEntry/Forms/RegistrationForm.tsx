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

// DESCRIPTION: gate-entry step 30 - driver/vehicle registration form,
// pre-filled from the found appointment or blank for an ad-hoc entry.
// Ad-hoc entries also pick a carrier and a slot duration (begin = arrival time,
// end = begin + duration), mirroring web appointments/add.

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import {
    useTranslationWithFallback as useTranslation,
    findCodeByScopeAndValue,
    getReservedCarrierExclusionFilters
} from '@helpers';
import { Form, Input, InputNumber, Select } from 'antd';
import { gql } from 'graphql-request';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { GateAppointment, RegistrationData } from '../types';

// Loose validation matching the spec ("format basique").
const PHONE_RE = /^[+]?[\d\s().-]{6,}$/;
const PLATE_RE = /^[A-Za-z0-9- ]{2,15}$/;

// Slot durations offered for ad-hoc entries (minutes).
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const formatDuration = (m: number) =>
    m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`;

export interface IRegistrationFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const RegistrationForm = ({
    processName,
    stepNumber,
    formToUse
}: IRegistrationFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const appointment: GateAppointment | null = storedObject['step20']?.data?.appointment ?? null;
    const isAdHoc: boolean = storedObject['step20']?.data?.isAdHoc ?? false;

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];
    const [carriers, setCarriers] = useState<Array<{ id: string; name: string }>>([]);

    // Backend advancedFilters excluding reserved carriers (virtual / closed) from the ad-hoc
    // selection. The closed status code is resolved from AppState configs (scope
    // 'carrier_status', value 'closed') and parsed to a number (status is an Int).
    const carrierExclusionFilters = useMemo(() => {
        const code = findCodeByScopeAndValue(state.configs, 'carrier_status', 'closed');
        return getReservedCarrierExclusionFilters(code != null ? parseInt(code, 10) : undefined);
    }, [state.configs]);

    // Ad-hoc: load the carrier list (no carrier is known yet).
    useEffect(() => {
        if (!isAdHoc) return;
        let active = true;
        graphqlRequestClient
            .request(
                gql`
                    query gateCarriers($advancedFilters: [CarrierAdvancedSearchFilters!]) {
                        carriers(advancedFilters: $advancedFilters) {
                            results {
                                id
                                name
                            }
                        }
                    }
                `,
                { advancedFilters: carrierExclusionFilters }
            )
            .then((res: any) => {
                if (active) setCarriers(res?.carriers?.results ?? []);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [isAdHoc, graphqlRequestClient, carrierExclusionFilters]);

    const onFinish = (values: any) => {
        const registration: RegistrationData = {
            driverName: values.driverName.trim(),
            companyName: values.companyName.trim(),
            driverPhoneNumber: values.driverPhoneNumber.trim(),
            truckLicensePlate: values.truckLicensePlate.trim(),
            trailerLicensePlate: values.trailerLicensePlate?.trim() || undefined,
            sealNumber: values.sealNumber?.trim() || undefined,
            estimatedWeight:
                values.estimatedWeight !== undefined && values.estimatedWeight !== null
                    ? Number(values.estimatedWeight)
                    : undefined,
            carrierId: isAdHoc ? values.carrierId : undefined,
            durationMinutes: isAdHoc ? values.durationMinutes : undefined
        };
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { previousStep: storedObject.currentStep, data: { registration } },
            customFields: [{ key: 'currentStep', value: 40 }]
        });
    };

    const required = { required: true, message: t('common:required') };

    return (
        <WrapperForm>
            <StyledForm
                name="gate-registration"
                layout="vertical"
                form={form}
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                initialValues={{
                    driverName: appointment?.driverName ?? undefined,
                    companyName: appointment?.entityName ?? undefined,
                    driverPhoneNumber: appointment?.driverPhoneNumber ?? undefined,
                    truckLicensePlate: appointment?.truckLicensePlate ?? undefined,
                    trailerLicensePlate: appointment?.trailerLicensePlate ?? undefined,
                    sealNumber: appointment?.extraText1 ?? undefined,
                    estimatedWeight: appointment?.extraNumber1 ?? undefined,
                    durationMinutes: isAdHoc ? 60 : undefined
                }}
            >
                <StyledFormItem
                    label={t('common:driver-name')}
                    name="driverName"
                    rules={[required]}
                >
                    <Input placeholder={t('common:driver-name-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem
                    label={t('common:company-name')}
                    name="companyName"
                    rules={[required]}
                >
                    <Input placeholder={t('common:company-name')} allowClear />
                </StyledFormItem>

                {isAdHoc && (
                    <>
                        <StyledFormItem
                            label={t('common:carrier')}
                            name="carrierId"
                            rules={[required]}
                        >
                            <Select
                                placeholder={t('common:carrier')}
                                showSearch
                                optionFilterProp="children"
                                allowClear
                            >
                                {carriers.map((c) => (
                                    <Select.Option key={c.id} value={c.id}>
                                        {c.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </StyledFormItem>

                        <StyledFormItem
                            label={t('common:duration')}
                            name="durationMinutes"
                            rules={[required]}
                        >
                            <Select placeholder={t('common:duration')}>
                                {DURATIONS.map((m) => (
                                    <Select.Option key={m} value={m}>
                                        {formatDuration(m)}
                                    </Select.Option>
                                ))}
                            </Select>
                        </StyledFormItem>
                    </>
                )}

                <StyledFormItem
                    label={t('common:phone')}
                    name="driverPhoneNumber"
                    rules={[required, { pattern: PHONE_RE, message: t('common:invalid-phone') }]}
                >
                    <Input placeholder={t('common:phone-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem
                    label={t('common:truck-plate')}
                    name="truckLicensePlate"
                    rules={[required, { pattern: PLATE_RE, message: t('common:invalid-plate') }]}
                >
                    <Input placeholder={t('common:truck-plate-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem label={t('common:trailer')} name="trailerLicensePlate">
                    <Input placeholder={t('common:trailer-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem label={t('common:seal')} name="sealNumber">
                    <Input placeholder={t('common:seal-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem label={t('common:weight')} name="estimatedWeight">
                    <InputNumber
                        min={0}
                        placeholder={t('common:weight-ph')}
                        style={{ width: '100%' }}
                    />
                </StyledFormItem>
            </StyledForm>
        </WrapperForm>
    );
};

RegistrationForm.displayName = 'RegistrationForm';
