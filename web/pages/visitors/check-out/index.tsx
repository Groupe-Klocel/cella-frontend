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

import { AppHead, HeaderContent, PageTableContentWrapper } from '@components';
import {
    getModesFromPermissions,
    getVisitStatusCodes,
    getVisitTypeCode,
    getVisitZoneLabel,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Input, Modal, Table, Tooltip } from 'antd';
import { LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import { gql } from 'graphql-request';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { VisitEntry, VISIT_ENTRY_FIELDS } from 'modules/Visitors/types';
import { visitorCheckOutRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { checkOutVisit } from 'modules/Visitors/Functions/visitorActions';

type PageComponent = FC & { layout: typeof MainLayout };

const REFRESH_MS = 5000;

const VisitorCheckOutPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { permissions, configs, parameters } = useAppState();
    const modes = getModesFromPermissions(permissions, 'wm_visitor-check-out');
    const language = router.locale ?? 'en-US';

    const [entries, setEntries] = useState<VisitEntry[]>([]);
    const [search, setSearch] = useState('');
    const [checkingOutId, setCheckingOutId] = useState<string | undefined>();

    const visitTypeCode = useMemo(() => getVisitTypeCode(configs), [configs]);
    const codes = useMemo(() => getVisitStatusCodes(configs), [configs]);
    const ready = visitTypeCode !== undefined && codes.checkedIn !== undefined;

    const refresh = useCallback(async () => {
        if (!ready) return;
        try {
            const res = await graphqlRequestClient.request(
                gql`
                    query onSiteVisitors($filters: AppointmentSearchFilters) {
                        appointments(filters: $filters, itemsPerPage: 1000) {
                            results { ${VISIT_ENTRY_FIELDS} }
                        }
                    }
                `,
                { filters: { appointmentType: visitTypeCode, status: codes.checkedIn } }
            );
            const results: VisitEntry[] = res?.appointments?.results ?? [];
            // sorted by real entry time so the guard sees arrivals in order
            results.sort((a, b) => (a.extraText1 ?? '').localeCompare(b.extraText1 ?? ''));
            setEntries(results);
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

    const filteredEntries = useMemo(() => {
        if (!search) return entries;
        const term = search.toLowerCase();
        return entries.filter(
            (entry) =>
                (entry.driverName ?? '').toLowerCase().includes(term) ||
                (entry.entityName ?? '').toLowerCase().includes(term)
        );
    }, [entries, search]);

    const onCheckOut = (record: VisitEntry) => {
        Modal.confirm({
            title: t('messages:check-out-confirm'),
            content: `${record.driverName ?? ''} ${record.entityName ? `— ${record.entityName}` : ''}`,
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel'),
            onOk: async () => {
                setCheckingOutId(record.id);
                try {
                    await checkOutVisit(graphqlRequestClient, record, codes.checkedOut!);
                    showSuccess(t('messages:success-updated'));
                    // stay on the list, ready for the next visitor (group exits)
                    await refresh();
                } catch (error) {
                    console.error('Error during check-out:', error);
                    showError(t('messages:error-update-data'));
                } finally {
                    setCheckingOutId(undefined);
                }
            }
        });
    };

    const columns = [
        {
            title: t('d:checked-in-date'),
            key: 'entry',
            render: (record: VisitEntry) =>
                record.extraText1 ? dayjs(record.extraText1).format('YYYY-MM-DD HH:mm') : '-'
        },
        { title: t('d:visitor-name'), dataIndex: 'driverName', key: 'driverName' },
        { title: t('d:company'), dataIndex: 'entityName', key: 'entityName' },
        { title: t('d:internal-referent'), dataIndex: 'contactName', key: 'contactName' },
        {
            title: t('d:allowed-zones'),
            key: 'zones',
            render: (record: VisitEntry) =>
                (record.allowedZones ?? [])
                    .map((zone: string) => getVisitZoneLabel(parameters, zone, language))
                    .join(', ')
        },
        {
            title: t('common:actions'),
            key: 'actions',
            render: (record: VisitEntry) =>
                modes.includes(ModeEnum.Update) ? (
                    <Tooltip
                        placement="top"
                        title={t('actions:visitor-check-out')}
                        align={{ offset: [0, 0] }}
                        overlayStyle={{ pointerEvents: 'none' }}
                    >
                        <Button
                            type="primary"
                            icon={<LogoutOutlined />}
                            loading={checkingOutId === record.id}
                            onClick={() => onCheckOut(record)}
                        />
                    </Tooltip>
                ) : null
        }
    ];

    const headerData = {
        title: t('common:visitor-check-out'),
        routes: visitorCheckOutRoutes
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <HeaderContent title={headerData.title} routes={headerData.routes} />
            <PageTableContentWrapper>
                <Input
                    allowClear
                    autoFocus
                    prefix={<SearchOutlined />}
                    placeholder={t('messages:search-visitor-placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 360, marginBottom: 12 }}
                />
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredEntries}
                    loading={!ready}
                    pagination={{ pageSize: 20 }}
                    locale={{ emptyText: t('common:empty') }}
                />
            </PageTableContentWrapper>
        </>
    );
};

VisitorCheckOutPage.layout = MainLayout;

export default VisitorCheckOutPage;
