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

import { AppHead, HeaderContent, LinkButton, PageTableContentWrapper } from '@components';
import {
    getModesFromPermissions,
    pathParams,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Badge, Space, Table, Tabs, Tag } from 'antd';
import { EyeTwoTone } from '@ant-design/icons';
import { gql } from 'graphql-request';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import dayjs from 'dayjs';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
    classifyGateEntry,
    GateEntry,
    GateStatusCodes,
    GATE_ENTRY_FIELDS
} from 'modules/GateValidation/types';

type PageComponent = FC & { layout: typeof MainLayout };

const REFRESH_MS = 3000;
const rootPath = '/gate-validation';

const GateValidationDashboard: PageComponent = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { permissions, configs } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_appointments');

    const [entries, setEntries] = useState<GateEntry[]>([]);
    const [activeTab, setActiveTab] = useState('pending');

    // CONFIRMED / ON_SITE codes from the configs reducer (no extra request).
    const codes = useMemo<GateStatusCodes | null>(() => {
        if (!configs || configs.length === 0) return null;
        const find = (re: RegExp) =>
            parseInt(
                configs.find(
                    (c: any) => c.scope === 'appointment_status' && re.test(c.value ?? '')
                )?.code,
                10
            );
        return {
            confirmed: find(/confirm/i),
            onSite: find(/on.?site|sur.?site|vor.?ort/i),
            cancelled: find(/cancel|annul|stornier/i)
        };
    }, [configs]);

    const refresh = useCallback(async () => {
        if (!codes) return;
        try {
            const res = await graphqlRequestClient.request(
                gql`
                    query listGateEntries($filters: AppointmentSearchFilters) {
                        appointments(filters: $filters, itemsPerPage: 1000) {
                            results { ${GATE_ENTRY_FIELDS} }
                        }
                    }
                `,
                {
                    filters: {
                        status: [codes.confirmed, codes.onSite, codes.cancelled].filter(Boolean)
                    }
                }
            );
            const results: any[] = res?.appointments?.results ?? [];
            setEntries(
                results
                    .map((r) => ({ ...r, locationName: r.location?.name ?? null }))
                    .filter((e) => e.extras?.gateCheckIn)
            );
        } catch (e) {
            // keep previous data on transient errors
        }
    }, [graphqlRequestClient, codes]);

    // Auto-refresh while the dashboard is open.
    useEffect(() => {
        if (!codes) return;
        refresh();
        const id = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(id);
    }, [codes, refresh]);

    const { pending, approved, refused } = useMemo(() => {
        const isToday = (iso?: string) => iso && dayjs(iso).isSame(dayjs(), 'day');
        const buckets = {
            pending: [] as GateEntry[],
            approved: [] as GateEntry[],
            refused: [] as GateEntry[]
        };
        if (!codes) return buckets;
        entries.forEach((e) => {
            const decision = classifyGateEntry(e, codes);
            const decidedAt = e.extras?.gateCheckIn?.decidedAt;
            if (decision === 'pending') buckets.pending.push(e);
            else if (decision === 'approved' && isToday(decidedAt)) buckets.approved.push(e);
            else if (decision === 'refused' && isToday(decidedAt)) buckets.refused.push(e);
        });
        const byArrival = (a: GateEntry, b: GateEntry) =>
            (b.extras?.gateCheckIn?.at ?? '').localeCompare(a.extras?.gateCheckIn?.at ?? '');
        buckets.pending.sort(byArrival);
        buckets.approved.sort(byArrival);
        buckets.refused.sort(byArrival);
        return buckets;
    }, [entries, codes]);

    const baseColumns = [
        {
            title: t('common:arrival-time'),
            key: 'arrival',
            render: (record: GateEntry) => {
                const at = record.extras?.gateCheckIn?.at;
                return at ? dayjs(at).format('YYYY-MM-DD HH:mm') : '-';
            }
        },
        { title: t('common:driver-name'), dataIndex: 'driverName', key: 'driverName' },
        { title: t('common:truck-plate'), dataIndex: 'truckLicensePlate', key: 'truckLicensePlate' }
    ];

    const statusColumn = {
        title: t('common:status'),
        key: 'status',
        render: (record: GateEntry) => {
            const decision = codes ? classifyGateEntry(record, codes) : 'pending';
            const map: Record<string, { color: string; label: string }> = {
                pending: { color: 'orange', label: t('common:status-pending') },
                approved: { color: 'green', label: t('common:status-approved') },
                refused: { color: 'red', label: t('common:status-refused') }
            };
            return <Tag color={map[decision].color}>{map[decision].label}</Tag>;
        }
    };

    const actionColumn = {
        title: t('common:actions'),
        key: 'actions',
        render: (record: GateEntry) =>
            modes.includes(ModeEnum.Read) ? (
                <LinkButton
                    title={t('common:examine')}
                    icon={<EyeTwoTone />}
                    path={pathParams(`${rootPath}/[id]`, record.id)}
                />
            ) : null
    };

    const columns = [...baseColumns, statusColumn, actionColumn];

    const dataForTab =
        activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : refused;

    const headerData = {
        title: t('common:validation-title'),
        routes: [{ breadcrumbName: t('common:validation-title') }]
    };

    const tabItems = [
        {
            key: 'pending',
            label: (
                <Badge count={pending.length} offset={[12, -2]} size="small">
                    {t('common:tab-pending')}
                </Badge>
            )
        },
        { key: 'approved', label: `${t('common:tab-approved')} (${approved.length})` },
        { key: 'refused', label: `${t('common:tab-refused')} (${refused.length})` }
    ];

    return (
        <>
            <AppHead title={headerData.title} />
            <HeaderContent title={headerData.title} routes={headerData.routes} />
            <PageTableContentWrapper>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={dataForTab}
                    loading={!codes}
                    pagination={{ pageSize: 20 }}
                    locale={{ emptyText: t('common:empty') }}
                />
            </PageTableContentWrapper>
        </>
    );
};

GateValidationDashboard.layout = MainLayout;

export default GateValidationDashboard;
