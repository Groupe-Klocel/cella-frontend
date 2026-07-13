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
    getVisitStatusCodes,
    getVisitTypeCode,
    pathParams,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Badge, Table, Tabs, Tag } from 'antd';
import { EyeTwoTone } from '@ant-design/icons';
import { gql } from 'graphql-request';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import dayjs from 'dayjs';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { classifyVisitEntry, VisitEntry, VISIT_ENTRY_FIELDS } from 'modules/Visitors/types';
import { visitorCheckInRoutes } from 'modules/Visitors/Static/visitorsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const REFRESH_MS = 3000;
const rootPath = '/visitors/check-in';

const VisitorCheckInDashboard: PageComponent = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { permissions, configs } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_visitor-check-in');

    const [entries, setEntries] = useState<VisitEntry[]>([]);
    const [activeTab, setActiveTab] = useState('pending');

    const visitTypeCode = useMemo(() => getVisitTypeCode(configs), [configs]);
    const codes = useMemo(() => getVisitStatusCodes(configs), [configs]);
    const ready =
        visitTypeCode !== undefined &&
        codes.toBeChecked !== undefined &&
        codes.checkedIn !== undefined;

    const refresh = useCallback(async () => {
        if (!ready) return;
        try {
            const res = await graphqlRequestClient.request(
                gql`
                    query listVisitorCheckIns($filters: AppointmentSearchFilters) {
                        appointments(filters: $filters, itemsPerPage: 1000) {
                            results { ${VISIT_ENTRY_FIELDS} }
                        }
                    }
                `,
                {
                    filters: {
                        appointmentType: visitTypeCode,
                        status: [
                            codes.toBeChecked,
                            codes.preRegistered,
                            codes.checkedIn,
                            codes.cancelled
                        ].filter(Boolean)
                    }
                }
            );
            const results: any[] = res?.appointments?.results ?? [];
            // only visitors who went through the tablet (signed) are in the queue
            setEntries(results.filter((entry) => entry.extras?.visitorCheckIn));
        } catch (e) {
            // keep previous data on transient errors
        }
    }, [graphqlRequestClient, ready, visitTypeCode, codes]);

    useEffect(() => {
        if (!ready) return;
        refresh();
        const id = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(id);
    }, [ready, refresh]);

    const { pending, approved, refused } = useMemo(() => {
        const isToday = (iso?: string) => iso && dayjs(iso).isSame(dayjs(), 'day');
        const buckets = {
            pending: [] as VisitEntry[],
            approved: [] as VisitEntry[],
            refused: [] as VisitEntry[]
        };
        entries.forEach((entry) => {
            const decision = classifyVisitEntry(entry, codes);
            const decidedAt = entry.extras?.visitorCheckIn?.decidedAt;
            if (decision === 'pending') buckets.pending.push(entry);
            else if (decision === 'approved' && isToday(decidedAt)) buckets.approved.push(entry);
            else if (decision === 'refused' && isToday(decidedAt)) buckets.refused.push(entry);
        });
        const byArrival = (a: VisitEntry, b: VisitEntry) =>
            (b.extras?.visitorCheckIn?.at ?? '').localeCompare(a.extras?.visitorCheckIn?.at ?? '');
        buckets.pending.sort(byArrival);
        buckets.approved.sort(byArrival);
        buckets.refused.sort(byArrival);
        return buckets;
    }, [entries, codes]);

    const columns = [
        {
            title: t('common:arrival-time'),
            key: 'arrival',
            render: (record: VisitEntry) => {
                const at = record.extras?.visitorCheckIn?.at;
                return at ? dayjs(at).format('YYYY-MM-DD HH:mm') : '-';
            }
        },
        { title: t('d:visitor-name'), dataIndex: 'driverName', key: 'driverName' },
        { title: t('d:company'), dataIndex: 'entityName', key: 'entityName' },
        { title: t('d:internal-referent'), dataIndex: 'contactName', key: 'contactName' },
        {
            title: t('common:status'),
            key: 'status',
            render: (record: VisitEntry) => {
                const decision = classifyVisitEntry(record, codes);
                const map: Record<string, { color: string; label: string }> = {
                    pending: { color: 'orange', label: t('common:status-pending') },
                    approved: { color: 'green', label: t('common:status-approved') },
                    refused: { color: 'red', label: t('common:status-refused') }
                };
                return <Tag color={map[decision].color}>{map[decision].label}</Tag>;
            }
        },
        {
            title: t('common:actions'),
            key: 'actions',
            render: (record: VisitEntry) =>
                modes.includes(ModeEnum.Read) ? (
                    <LinkButton
                        icon={<EyeTwoTone />}
                        path={pathParams(`${rootPath}/[id]`, record.id)}
                    />
                ) : null
        }
    ];

    const dataForTab =
        activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : refused;

    const headerData = {
        title: t('common:visitor-check-in'),
        routes: visitorCheckInRoutes
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
                    loading={!ready}
                    pagination={{ pageSize: 20 }}
                    locale={{ emptyText: t('common:empty') }}
                />
            </PageTableContentWrapper>
        </>
    );
};

VisitorCheckInDashboard.layout = MainLayout;

export default VisitorCheckInDashboard;
