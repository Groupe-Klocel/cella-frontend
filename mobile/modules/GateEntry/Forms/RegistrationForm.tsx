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

import { WrapperForm, StyledForm, StyledFormItem, ContentSpin } from '@components';
import {
    useTranslationWithFallback as useTranslation,
    findCodeByScopeAndValue,
    getReservedCarrierExclusionFilters,
    fetchAppointmentFieldRules,
    isAppointmentFieldVisible,
    isAppointmentFieldRequired,
    appointmentFieldRulesFor,
    EMPTY_APPOINTMENT_FIELD_RULES,
    AppointmentFieldRules
} from '@helpers';
import { Checkbox, Form, Input, InputNumber, Select } from 'antd';
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
    // Which fields to show / require, from the APPOINTMENT_FIELD_RULES rule. The form is gated on
    // the fetch: a driver watching inputs appear and disappear under their finger is worse than a
    // moment of spinner, and step 40 already spins.
    const [fieldRules, setFieldRules] = useState<AppointmentFieldRules | null>(null);

    // The supplier only applies to incoming goods: hide it when the found appointment is
    // outbound. Same classification as web loadDirection.ts — "unloading" contains "loading",
    // so test the inbound matcher; anything that is neither a visit nor inbound is outbound.
    // Ad-hoc entries (no appointment) are created with the inbound type, so they keep it.
    const isOutbound = useMemo(() => {
        const item = (state.configs ?? []).find(
            (c: any) =>
                c.scope === 'appointment_type' &&
                String(c.code) === String(appointment?.appointmentType)
        );
        return (
            !!item &&
            !/visit/i.test(item.value ?? '') &&
            !/unload|décharg|entlad|réception|reception/i.test(item.value ?? '')
        );
    }, [state.configs, appointment?.appointmentType]);

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

    useEffect(() => {
        let active = true;
        fetchAppointmentFieldRules(graphqlRequestClient, {
            screen: 'gate_entry',
            direction: isOutbound ? 'outbound' : 'inbound',
            appointmentType: appointment?.appointmentType ?? null
        })
            .then((rules) => {
                if (active) setFieldRules(rules);
            })
            .catch(() => {
                if (active) setFieldRules(EMPTY_APPOINTMENT_FIELD_RULES);
            });
        return () => {
            active = false;
        };
    }, [graphqlRequestClient, isOutbound, appointment?.appointmentType]);

    const rules = fieldRules ?? EMPTY_APPOINTMENT_FIELD_RULES;
    // `supplier` keeps its coded default (incoming goods only); everything else defaults to the
    // visibility the form has always had, so an unconfigured warehouse sees no change.
    const show = (field: string, codeDefault = true) =>
        isAppointmentFieldVisible(rules, field, codeDefault);
    const fieldRule = (field: string, codeRequired: boolean, extra?: any[]) =>
        appointmentFieldRulesFor(rules, field, {
            codeRequired,
            requiredMessage: t('common:required'),
            extra
        });

    const onFinish = (values: any) => {
        // Optional chaining throughout: any of these can now be configured hidden, in which case
        // AntD never registers the field and `values.x` is undefined.
        const registration: RegistrationData = {
            driverName: values.driverName?.trim(),
            companyName: values.companyName?.trim(),
            supplier: isOutbound ? undefined : values.supplier?.trim(),
            driverPhoneNumber: values.driverPhoneNumber?.trim(),
            truckLicensePlate: values.truckLicensePlate?.trim(),
            trailerLicensePlate: values.trailerLicensePlate?.trim() || undefined,
            containerNumber: values.containerNumber?.trim() || undefined,
            // outbound-only driver declarations; undefined on inbound so nothing is written
            driverDrivingTime: isOutbound ? (values.driverDrivingTime ?? undefined) : undefined,
            directTransportConfirmed: isOutbound
                ? values.directTransportConfirmed === true
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

    // still used by the ad-hoc-only carrier/duration fields, which are structural: without
    // them the walk-in appointment cannot be created at all, so they are not configurable.
    const required = { required: true, message: t('common:required') };

    // Hold the form until the field rules have resolved, as the comment on `fieldRules` promises.
    // Rendering with the coded defaults first and applying the rule afterwards would make inputs
    // appear and disappear under the driver's finger — and could drop what they had already typed
    // into a field the rule then hides. The fetch also sets state on failure, so this cannot hang.
    if (fieldRules === null) {
        return <ContentSpin />;
    }

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
                    supplier: appointment?.entityAccountingCode ?? undefined,
                    driverPhoneNumber: appointment?.driverPhoneNumber ?? undefined,
                    truckLicensePlate: appointment?.truckLicensePlate ?? undefined,
                    trailerLicensePlate: appointment?.trailerLicensePlate ?? undefined,
                    containerNumber: appointment?.extraText1 ?? undefined,
                    durationMinutes: isAdHoc ? 60 : undefined
                }}
            >
                {show('driverName') && (
                    <StyledFormItem
                        label={t('common:driver-name')}
                        name="driverName"
                        rules={fieldRule('driverName', true)}
                    >
                        <Input placeholder={t('common:driver-name-ph')} allowClear />
                    </StyledFormItem>
                )}

                {show('companyName') && (
                    <StyledFormItem
                        label={t('common:company-name')}
                        name="companyName"
                        rules={fieldRule('companyName', true)}
                    >
                        <Input placeholder={t('common:company-name')} allowClear />
                    </StyledFormItem>
                )}

                {/* supplier of the goods (e.g. Girteka delivers goods from Barcelona for
                    Coty), stored in appointment.entityAccountingCode — incoming goods only */}
                {show('supplier', !isOutbound) && (
                    <StyledFormItem
                        label={t('common:supplierName')}
                        name="supplier"
                        rules={fieldRule('supplier', true)}
                    >
                        <Input placeholder={t('common:supplierName-ph')} allowClear />
                    </StyledFormItem>
                )}

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

                {show('driverPhoneNumber') && (
                    <StyledFormItem
                        label={t('common:phone')}
                        name="driverPhoneNumber"
                        rules={fieldRule('driverPhoneNumber', true, [
                            { pattern: PHONE_RE, message: t('common:invalid-phone') }
                        ])}
                    >
                        <Input placeholder={t('common:phone-ph')} allowClear />
                    </StyledFormItem>
                )}

                {show('truckLicensePlate') && (
                    <StyledFormItem
                        label={t('common:truck-plate')}
                        name="truckLicensePlate"
                        rules={fieldRule('truckLicensePlate', true, [
                            { pattern: PLATE_RE, message: t('common:invalid-plate') }
                        ])}
                    >
                        <Input placeholder={t('common:truck-plate-ph')} allowClear />
                    </StyledFormItem>
                )}

                {show('trailerLicensePlate') && (
                    <StyledFormItem
                        label={t('common:trailer')}
                        name="trailerLicensePlate"
                        rules={fieldRule('trailerLicensePlate', false)}
                    >
                        <Input placeholder={t('common:trailer-ph')} allowClear />
                    </StyledFormItem>
                )}

                {show('containerNumber') && (
                    <StyledFormItem
                        label={t('common:container-number')}
                        name="containerNumber"
                        rules={fieldRule('containerNumber', false)}
                    >
                        <Input placeholder={t('common:container-number-ph')} allowClear />
                    </StyledFormItem>
                )}

                {/* Outbound only: the driver declares how long they have been driving, and
                    confirms the goods go straight to their destination. Both are regulatory
                    declarations made by the driver about the trip they are about to start, so
                    they have no meaning on an inbound arrival — the trip is already over. */}
                {isOutbound && show('driverDrivingTime') && (
                    <StyledFormItem
                        label={t('common:driver-driving-time')}
                        name="driverDrivingTime"
                        rules={fieldRule('driverDrivingTime', true)}
                    >
                        <InputNumber
                            min={0}
                            max={24}
                            step={0.5}
                            style={{ width: '100%' }}
                            placeholder={t('common:driver-driving-time-ph')}
                        />
                    </StyledFormItem>
                )}
                {isOutbound && show('directTransportConfirmed') && (
                    <StyledFormItem
                        name="directTransportConfirmed"
                        valuePropName="checked"
                        rules={[
                            // A declaration is worthless unless it is actually ticked, so this is
                            // not a plain `required` (which a `false` checkbox satisfies).
                            {
                                validator: (_: any, v: boolean) =>
                                    isAppointmentFieldRequired(
                                        rules,
                                        'directTransportConfirmed',
                                        true
                                    ) && !v
                                        ? Promise.reject(new Error(t('common:must-confirm-direct')))
                                        : Promise.resolve()
                            }
                        ]}
                    >
                        <Checkbox>{t('common:direct-transport-confirm')}</Checkbox>
                    </StyledFormItem>
                )}
            </StyledForm>
        </WrapperForm>
    );
};

RegistrationForm.displayName = 'RegistrationForm';
