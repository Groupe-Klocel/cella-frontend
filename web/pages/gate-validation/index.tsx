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
    resolveAppointmentStatusCodes,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Badge, Result, Space, Table, Tabs, Tag } from 'antd';
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
    const modes = getModesFromPermissions(permissions, 'wm_appointments-gate-validation');
    // fail closed: menu gating alone doesn't stop a direct URL hit — never fetch without READ.
    const canRead = modes.includes(ModeEnum.Read);

    const [entries, setEntries] = useState<GateEntry[]>([]);
    const [activeTab, setActiveTab] = useState('pending');

    // Status codes from the configs reducer (no extra request), through the shared resolver so
    // "On Site" and the waiting/documents statuses can never be confused for one another.
    const codes = useMemo<GateStatusCodes | null>(
        () =>
            !configs || configs.length === 0
                ? null
                : (resolveAppointmentStatusCodes(configs) as GateStatusCodes),
        [configs]
    );

    const refresh = useCallback(async () => {
        if (!codes || !canRead) return;
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
                        // The waiting / documents-pending statuses MUST be here: without them a
                        // truck vanishes from the dashboard the instant the guard parks it, and
                        // full entry could never be granted afterwards.
                        status: [
                            codes.confirmed,
                            codes.documentsPending,
                            codes.onSiteWaiting,
                            codes.onSite,
                            codes.cancelled
                        ].filter(Number.isFinite)
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
    }, [graphqlRequestClient, codes, canRead]);

    // Auto-refresh while the dashboard is open.
    useEffect(() => {
        if (!codes || !canRead) return;
        refresh();
        const id = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(id);
    }, [codes, canRead, refresh]);

    const { pending, waiting, awaitingDocuments, approved, refused } = useMemo(() => {
        const isToday = (iso?: string) => iso && dayjs(iso).isSame(dayjs(), 'day');
        const buckets = {
            pending: [] as GateEntry[],
            waiting: [] as GateEntry[],
            awaitingDocuments: [] as GateEntry[],
            approved: [] as GateEntry[],
            refused: [] as GateEntry[]
        };
        if (!codes) return buckets;
        entries.forEach((e) => {
            const decision = classifyGateEntry(e, codes);
            const decidedAt = e.extras?.gateCheckIn?.decidedAt;
            if (decision === 'pending') buckets.pending.push(e);
            // waiting / awaiting-documents are LIVE queues, deliberately not filtered to today:
            // a truck can wait past midnight, and paperwork routinely takes more than a day. The
            // approved / refused tabs stay day-scoped -- those are read-only logs.
            else if (decision === 'waiting') buckets.waiting.push(e);
            else if (decision === 'awaiting-documents') buckets.awaitingDocuments.push(e);
            else if (decision === 'approved' && isToday(decidedAt)) buckets.approved.push(e);
            else if (decision === 'refused' && isToday(decidedAt)) buckets.refused.push(e);
        });
        const byArrival = (a: GateEntry, b: GateEntry) =>
            (b.extras?.gateCheckIn?.at ?? '').localeCompare(a.extras?.gateCheckIn?.at ?? '');
        Object.values(buckets).forEach((bucket) => bucket.sort(byArrival));
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
                waiting: { color: 'gold', label: t('common:status-waiting') },
                'awaiting-documents': {
                    color: 'volcano',
                    label: t('common:status-awaiting-documents')
                },
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
                    icon={<EyeTwoTone />}
                    path={pathParams(`${rootPath}/[id]`, record.id)}
                />
            ) : null
    };

    // The pager is what the guard shouts on the radio to call a parked driver back, so it earns a
    // column of its own on the waiting queue.
    const pagerColumn = {
        title: t('common:pager-number'),
        key: 'pager',
        // column first, `extras` only as a fallback for appointments written before it existed
        render: (record: GateEntry) =>
            record.pagerNumber ?? record.extras?.gateCheckIn?.pagerNumber ?? '-'
    };

    const columns = [
        ...baseColumns,
        ...(activeTab === 'waiting' ? [pagerColumn] : []),
        statusColumn,
        actionColumn
    ];

    const dataByTab: Record<string, GateEntry[]> = {
        pending,
        waiting,
        documents: awaitingDocuments,
        approved,
        refused
    };
    const dataForTab = dataByTab[activeTab] ?? pending;

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
        {
            key: 'waiting',
            label: (
                <Badge count={waiting.length} offset={[12, -2]} size="small">
                    {t('common:tab-waiting')}
                </Badge>
            )
        },
        {
            key: 'documents',
            label: (
                <Badge count={awaitingDocuments.length} offset={[12, -2]} size="small">
                    {t('common:tab-documents')}
                </Badge>
            )
        },
        { key: 'approved', label: `${t('common:tab-approved')} (${approved.length})` },
        { key: 'refused', label: `${t('common:tab-refused')} (${refused.length})` }
    ];

    if (!canRead) {
        return (
            <>
                <AppHead title={headerData.title} />
                <HeaderContent title={headerData.title} routes={headerData.routes} />
                <Result status="403" title={t('messages:access-denied')} />
            </>
        );
    }

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
