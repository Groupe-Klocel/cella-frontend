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
import { WrapperForm } from '@components';
import {
    Button,
    Form,
    Modal,
    Select,
    Space,
    Switch,
    TimePicker,
    Divider,
    Typography,
    Row,
    Col
} from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { showError, showSuccess, showInfo } from '@helpers';
import { FC, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import {
    useUpdateLocationMutation,
    UpdateLocationMutation,
    UpdateLocationMutationVariables,
    useSimpleGetAllCarriersQuery,
    SimpleGetAllCarriersQuery
} from 'generated/graphql';
import { gql } from 'graphql-request';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const { Option } = Select;

// Days of week
const WEEK_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
] as const;

export type EditLocationExtrasFormProps = {
    locationId: string;
    locationName?: string;
};

export const EditLocationExtrasForm: FC<EditLocationExtrasFormProps> = ({
    locationId,
    locationName
}: EditLocationExtrasFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { parameters } = useAppState();
    const configsParamsLanguage = (router.locale || 'en').split('-')[0];

    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const configsParams = useMemo(() => {
        const findByScope = (items: any[], scope: string) => {
            return items.filter((item: any) => item.scope === scope);
        };
        const dockType = findByScope(parameters ?? [], 'dock_type');
        const truckType = findByScope(parameters ?? [], 'truck_type');
        return {
            dockType,
            truckType
        };
    }, [parameters]);

    // Operating schedules state: per day
    const [schedules, setSchedules] = useState<
        Record<string, { open: boolean; periods: Array<{ start: string; end: string }> }>
    >(() => {
        const initial: Record<
            string,
            { open: boolean; periods: Array<{ start: string; end: string }> }
        > = {};
        WEEK_DAYS.forEach((day) => {
            initial[day] = { open: false, periods: [] };
        });
        return initial;
    });

    // Fetch carriers for multi-select
    const carriersList = useSimpleGetAllCarriersQuery<Partial<SimpleGetAllCarriersQuery>, Error>(
        graphqlRequestClient
    );

    // Fetch existing extras from the location
    useEffect(() => {
        if (!locationId) return;
        const query = gql`
            query GetLocationExtrasForEdit($id: String!) {
                location(id: $id) {
                    id
                    extras
                }
            }
        `;
        graphqlRequestClient
            .request(query, { id: locationId })
            .then((data: any) => {
                const extras = data?.location?.extras ?? {};

                // dock_type
                if (extras['dock_type']) {
                    form.setFieldValue('dock_type', extras['dock_type']);
                }

                // authorized_carriers: * = empty selection, else split to array
                if (extras['authorized_carriers'] && extras['authorized_carriers'] !== '*') {
                    form.setFieldValue(
                        'authorized_carriers',
                        extras['authorized_carriers'].split(',').filter(Boolean)
                    );
                }

                // authorized_truck_types: * = empty selection, else split to array
                if (extras['authorized_truck_types'] && extras['authorized_truck_types'] !== '*') {
                    form.setFieldValue(
                        'authorized_truck_types',
                        extras['authorized_truck_types'].split(',').filter(Boolean)
                    );
                }

                // operating_schedules
                let rawSchedules = extras['operating_schedules'];
                if (rawSchedules) {
                    if (typeof rawSchedules === 'string') {
                        try {
                            rawSchedules = JSON.parse(rawSchedules);
                        } catch {
                            rawSchedules = null;
                        }
                    }
                    if (rawSchedules) {
                        const newSchedules = { ...schedules };
                        WEEK_DAYS.forEach((day) => {
                            if (rawSchedules[day]) {
                                newSchedules[day] = rawSchedules[day];
                            }
                        });
                        setSchedules(newSchedules);
                    }
                }
            })
            .catch(() => showError(t('messages:error-getting-data')));
    }, [locationId]);

    // Unsaved changes prompt
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page'));
        };
        const handleBrowseAway = () => {
            if (!unsavedChanges) return;
            if (window.confirm(t('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges]);

    const { mutate: updateLocation, isPending: updateLoading } = useUpdateLocationMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateLocationMutation,
                _variables: UpdateLocationMutationVariables,
                _context: unknown
            ) => {
                if (data.updateLocation) {
                    showSuccess(t('messages:success-updated'));
                    router.back();
                } else {
                    showError(t('messages:error-update-data'));
                }
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    // Toggle a day open/closed
    const toggleDay = (day: string, open: boolean) => {
        setSchedules((prev) => ({
            ...prev,
            [day]: { ...prev[day], open, periods: open ? prev[day].periods : [] }
        }));
        setUnsavedChanges(true);
    };

    // Add a period to a day
    const addPeriod = (day: string) => {
        setSchedules((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                periods: [...prev[day].periods, { start: '08:00', end: '17:00' }]
            }
        }));
        setUnsavedChanges(true);
    };

    // Remove a period from a day
    const removePeriod = (day: string, index: number) => {
        setSchedules((prev) => {
            const newPeriods = [...prev[day].periods];
            newPeriods.splice(index, 1);
            return { ...prev, [day]: { ...prev[day], periods: newPeriods } };
        });
        setUnsavedChanges(true);
    };

    // Update a period time
    const updatePeriod = (day: string, index: number, field: 'start' | 'end', value: string) => {
        setSchedules((prev) => {
            const newPeriods = [...prev[day].periods];
            newPeriods[index] = { ...newPeriods[index], [field]: value };
            return { ...prev, [day]: { ...prev[day], periods: newPeriods } };
        });
        setUnsavedChanges(true);
    };

    const onFinish = () => {
        form.validateFields()
            .then((values) => {
                const extras: Record<string, any> = {};

                if (values.dock_type) {
                    extras['dock_type'] = values.dock_type;
                }

                // dayjs.tz.guess() automatically identifies the local IANA timezone string
                // (e.g., 'Europe/Paris', 'America/New_York') based on the browser env.
                extras['timezone'] = dayjs.tz.guess();

                const carrierIds: string[] = values.authorized_carriers || [];
                extras['authorized_carriers'] = carrierIds.length > 0 ? carrierIds.join(',') : '*';

                const truckTypeCodes: string[] = values.authorized_truck_types || [];
                extras['authorized_truck_types'] =
                    truckTypeCodes.length > 0 ? truckTypeCodes.join(',') : '*';

                // operating_schedules — stored as JSON object (not string)
                extras['operating_schedules'] = schedules;

                const clearQuery = gql`
                    mutation ClearLocationExtras($id: String!, $input: UpdateLocationInput!) {
                        updateLocation(id: $id, input: $input) {
                            id
                            extras
                        }
                    }
                `;
                graphqlRequestClient
                    .request(clearQuery, {
                        id: locationId,
                        input: { extras: {} }
                    })
                    .then(() => {
                        setUnsavedChanges(false);
                        updateLocation({
                            id: locationId,
                            input: { extras }
                        });
                    })
                    .catch(() => {
                        setUnsavedChanges(true);
                        showError(t('messages:error-update-data'));
                    });
            })
            .catch(() => showInfo(t('messages:info-form-errors')));
    };

    const onCancel = () => {
        if (unsavedChanges) {
            Modal.confirm({
                title: t('messages:confirm-leaving-page'),
                onOk: () => {
                    setUnsavedChanges(false);
                    router.back();
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        } else {
            router.back();
        }
    };

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => {
                    setUnsavedChanges(true);
                }}
            >
                {/* DOCK TYPES */}
                <Form.Item name="dock_type" label={t('d:dock_type')}>
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:dock_type')
                        })}`}
                        allowClear
                    >
                        {configsParams.dockType.map((param: any) => (
                            <Option key={param.code} value={param.code}>
                                {param.translation?.[configsParamsLanguage] ?? param.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Divider />

                {/* AUTHORIZED CARRIERS */}
                <Form.Item name="authorized_carriers" label={t('d:authorized_carriers')}>
                    <Select
                        mode="multiple"
                        placeholder={t('d:all-carriers')}
                        optionFilterProp="children"
                        allowClear
                    >
                        {carriersList.data?.carriers?.results?.map((carrier: any) => (
                            <Option key={carrier.id} value={carrier.id}>
                                {carrier.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Divider />

                {/* AUTHORIZED TRUCK TYPES */}
                <Form.Item name="authorized_truck_types" label={t('d:authorized_truck_types')}>
                    <Select
                        mode="multiple"
                        placeholder={t('d:all-truck-types')}
                        optionFilterProp="children"
                        allowClear
                    >
                        {configsParams.truckType.map((param: any) => (
                            <Option key={param.code} value={param.code}>
                                {param.translation?.[configsParamsLanguage] ?? param.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Divider />

                {/* OPERATING SCHEDULES */}
                <Title level={5}>{t('d:operating_schedules')}</Title>
                {WEEK_DAYS.map((day) => (
                    <div
                        key={day}
                        style={{
                            marginBottom: 16,
                            padding: '12px',
                            border: '1px solid #f0f0f0',
                            borderRadius: 6
                        }}
                    >
                        <Row align="middle" gutter={16}>
                            <Col span={4}>
                                <strong>{t(`d:${day}`)}</strong>
                            </Col>
                            <Col span={4}>
                                <Switch
                                    checked={schedules[day]?.open ?? false}
                                    onChange={(checked) => toggleDay(day, checked)}
                                    checkedChildren={t('d:open')}
                                    unCheckedChildren={t('d:closed')}
                                />
                            </Col>
                            <Col span={16}>
                                {schedules[day]?.open && (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {schedules[day].periods.map((period, idx) => (
                                            <Space key={idx}>
                                                <TimePicker
                                                    format="HH:mm"
                                                    value={
                                                        period.start
                                                            ? dayjs(period.start, 'HH:mm')
                                                            : undefined
                                                    }
                                                    onChange={(time) =>
                                                        updatePeriod(
                                                            day,
                                                            idx,
                                                            'start',
                                                            time ? time.format('HH:mm') : ''
                                                        )
                                                    }
                                                />
                                                <span>–</span>
                                                <TimePicker
                                                    format="HH:mm"
                                                    value={
                                                        period.end
                                                            ? dayjs(period.end, 'HH:mm')
                                                            : undefined
                                                    }
                                                    onChange={(time) =>
                                                        updatePeriod(
                                                            day,
                                                            idx,
                                                            'end',
                                                            time ? time.format('HH:mm') : ''
                                                        )
                                                    }
                                                />
                                                <Button
                                                    danger
                                                    size="small"
                                                    onClick={() => removePeriod(day, idx)}
                                                >
                                                    {t('actions:delete')}
                                                </Button>
                                            </Space>
                                        ))}
                                        <Button
                                            type="dashed"
                                            size="small"
                                            onClick={() => addPeriod(day)}
                                        >
                                            + {t('actions:add')} {t('d:period')}
                                        </Button>
                                    </Space>
                                )}
                            </Col>
                        </Row>
                    </div>
                ))}
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
