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

// DESCRIPTION: visitor-entry step 30 - visitor registration form, pre-filled
// from the found visit or blank for a walk-in. Walk-ins also provide the reason
// for the visit, the internal referent and the desired destination zone(s).

import { WrapperForm, StyledForm, StyledFormItem } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, Input, Select } from 'antd';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { Visit, VisitorRegistrationData, getVisitZones, getZoneLabel } from '../types';

// Loose validation (same "basic format" approach as the gate-entry kiosk).
const PHONE_RE = /^[+]?[\d\s().-]{6,}$/;
const PLATE_RE = /^[A-Za-z0-9- ]{2,15}$/;

export interface IVisitorRegistrationFormProps {
    processName: string;
    stepNumber: number;
    formToUse: any;
}

export const VisitorRegistrationForm = ({
    processName,
    stepNumber,
    formToUse
}: IVisitorRegistrationFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const visit: Visit | null = storedObject['step20']?.data?.visit ?? null;
    const isWalkIn: boolean = storedObject['step20']?.data?.isWalkIn ?? false;
    const language = storedObject['step10']?.data?.lang ?? router.locale ?? 'en-US';

    const [form] = formToUse === undefined || formToUse === null ? Form.useForm() : [formToUse];

    // Destination zones offered to walk-ins (parameters scope `visit_zone`);
    // the stored identifier is the parameter's `value` string.
    const zones = getVisitZones(state.parameters);

    const onFinish = (values: any) => {
        const registration: VisitorRegistrationData = {
            visitorName: values.visitorName.trim(),
            companyName: values.companyName?.trim() || undefined,
            email: values.email?.trim() || undefined,
            phoneNumber: values.phoneNumber?.trim() || undefined,
            licensePlate: values.licensePlate?.trim() || undefined,
            reason: isWalkIn ? values.reason?.trim() : undefined,
            contactName: isWalkIn ? values.contactName?.trim() : undefined,
            zones: isWalkIn ? values.zones : undefined
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

    // Walk-in rule: at least one of email / phone number must be provided.
    const atLeastOneContact = ({ getFieldValue }: any) => ({
        validator() {
            if (!isWalkIn) return Promise.resolve();
            if (getFieldValue('email')?.trim() || getFieldValue('phoneNumber')?.trim()) {
                return Promise.resolve();
            }
            return Promise.reject(new Error(t('common:email-or-phone-required')));
        }
    });

    return (
        <WrapperForm>
            <StyledForm
                name="visitor-registration"
                layout="vertical"
                form={form}
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                initialValues={{
                    visitorName: visit?.driverName ?? undefined,
                    companyName: visit?.entityName ?? undefined,
                    email: visit?.driverEmail ?? undefined,
                    phoneNumber: visit?.driverPhoneNumber ?? undefined,
                    licensePlate: visit?.truckLicensePlate ?? undefined
                }}
            >
                <StyledFormItem
                    label={t('common:visitor-name')}
                    name="visitorName"
                    rules={[required]}
                >
                    <Input placeholder={t('common:visitor-name-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem label={t('common:company-name')} name="companyName">
                    <Input placeholder={t('common:company-name')} allowClear />
                </StyledFormItem>

                <StyledFormItem
                    label={t('common:email')}
                    name="email"
                    dependencies={['phoneNumber']}
                    rules={[
                        { type: 'email', message: t('common:invalid-email') },
                        atLeastOneContact
                    ]}
                >
                    <Input placeholder={t('common:email-ph')} allowClear />
                </StyledFormItem>

                <StyledFormItem
                    label={t('common:phone')}
                    name="phoneNumber"
                    dependencies={['email']}
                    rules={[
                        { pattern: PHONE_RE, message: t('common:invalid-phone') },
                        atLeastOneContact
                    ]}
                >
                    <Input placeholder={t('common:phone-ph')} allowClear />
                </StyledFormItem>

                {isWalkIn ? (
                    <>
                        <StyledFormItem
                            label={t('common:visit-reason')}
                            name="reason"
                            rules={[required]}
                        >
                            <Input.TextArea
                                placeholder={t('common:visit-reason-ph')}
                                autoSize={{ minRows: 2 }}
                                allowClear
                            />
                        </StyledFormItem>

                        <StyledFormItem
                            label={t('common:internal-referent')}
                            name="contactName"
                            rules={[required]}
                        >
                            <Input placeholder={t('common:internal-referent-ph')} allowClear />
                        </StyledFormItem>

                        <StyledFormItem
                            label={t('common:destination-zones')}
                            name="zones"
                            rules={[required]}
                        >
                            <Select
                                mode="multiple"
                                placeholder={t('common:destination-zones')}
                                optionFilterProp="children"
                                allowClear
                            >
                                {zones.map((z) => (
                                    <Select.Option key={z.value} value={z.value}>
                                        {getZoneLabel(z.value, state.parameters, language)}
                                    </Select.Option>
                                ))}
                            </Select>
                        </StyledFormItem>
                    </>
                ) : (
                    <>
                        <StyledFormItem label={t('common:internal-referent')}>
                            <Input value={visit?.contactName ?? '-'} disabled />
                        </StyledFormItem>

                        <StyledFormItem label={t('common:visit-reason')}>
                            <Input.TextArea
                                value={visit?.comment ?? '-'}
                                disabled
                                autoSize={{ minRows: 1 }}
                            />
                        </StyledFormItem>
                    </>
                )}

                <StyledFormItem
                    label={t('common:license-plate')}
                    name="licensePlate"
                    rules={[{ pattern: PLATE_RE, message: t('common:invalid-plate') }]}
                >
                    <Input placeholder={t('common:license-plate-ph')} allowClear />
                </StyledFormItem>
            </StyledForm>
        </WrapperForm>
    );
};

VisitorRegistrationForm.displayName = 'VisitorRegistrationForm';
