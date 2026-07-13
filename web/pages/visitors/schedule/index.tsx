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
import { Calendar, dayjsLocalizer, View } from 'react-big-calendar';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import('dayjs/locale/en');
import('dayjs/locale/fr');
import('dayjs/locale/de');

dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
import MainLayout from 'components/layouts/MainLayout';
import { CSSProperties, FC, useState, useEffect, useMemo } from 'react';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import { Button, Descriptions, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
    getModesFromPermissions,
    getVisitTypeCode,
    getVisitStatusLabel,
    getVisitZoneLabel,
    useTranslationWithFallback as useTranslation,
    VISIT_STATUS_SCOPE
} from '@helpers';
import {
    AppHead,
    HeaderContent,
    LinkButton,
    ScheduleSidePanel,
    ScheduleStatusConfig,
    ScheduleStatusLegend,
    buildScheduleStatusConfig,
    parseUtcToLocalDate,
    useCalendarMessages
} from '@components';
import { ModeEnum } from 'generated/graphql';
import { visitorsScheduleRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

const localizer = dayjsLocalizer(dayjs);

// displayed time range of the week view (only the time of day matters)
const DAY_START = dayjs().hour(6).minute(0).second(0).toDate();
const DAY_END = dayjs().hour(22).minute(0).second(0).toDate();

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = string;

type VisitEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    status: VisitStatus;
    name: string;
    driverName?: string;
    entityName?: string;
    contactName?: string;
    comment?: string;
    allowedZones: string[];
    escortRequired?: boolean;
    extras?: any;
};

type PageComponent = FC & { layout: typeof MainLayout };

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const normalizeZones = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.map((z) => String(z));
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map((z) => String(z));
        } catch {
            // not JSON: treat as comma-separated
        }
        return raw
            .split(',')
            .map((z) => z.trim())
            .filter((z) => z !== '');
    }
    return [];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const EventCard: FC<{ event: VisitEvent }> = ({ event }) => (
    <div style={{ lineHeight: 1.3 }}>
        <div
            style={{
                fontWeight: 600,
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}
        >
            {event.title}
        </div>
    </div>
);

const AgendaEventCard: FC<{ event: VisitEvent; statusConfig: ScheduleStatusConfig }> = ({
    event,
    statusConfig
}) => (
    <Space size={16}>
        <Typography.Text strong>{event.title}</Typography.Text>
        <Tag icon={statusConfig[event.status]?.icon} color={statusConfig[event.status]?.bgColor}>
            {statusConfig[event.status]?.label}
        </Tag>
    </Space>
);

// ─── Main component ───────────────────────────────────────────────────────────

const VisitorsSchedulePage: PageComponent = () => {
    const { configs, parameters, permissions } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const locale = router?.locale?.split('-')[0] || 'en';
    dayjs.locale(locale);

    const modes = getModesFromPermissions(permissions, 'wm_visitors');

    // ── State ──────────────────────────────────────────────────────────────────
    const [events, setEvents] = useState<VisitEvent[]>([]);
    const [visitsLoading, setVisitsLoading] = useState(false);
    const [refetch, setRefetch] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<VisitEvent | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('week');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    // ── Derived config ─────────────────────────────────────────────────────────
    const visitTypeCode = useMemo(() => getVisitTypeCode(configs as any[]), [configs]);

    const statusConfig = useMemo(() => {
        const allConfigs = (configs as any[]) ?? [];
        const visitStatusConfigs = allConfigs.filter((c) => c.scope === VISIT_STATUS_SCOPE);
        const source =
            visitStatusConfigs.length > 0
                ? visitStatusConfigs
                : allConfigs.filter((c) => c.scope === 'appointment_status');
        return buildScheduleStatusConfig(source, locale);
    }, [configs, locale]);

    const calendarMessages = useCalendarMessages();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const getAllVisits = async (startDate: Date, endDate: Date, visitCode: number) => {
        setVisitsLoading(true);
        const { appointments } = await graphqlRequestClient.request(
            gql`
                query appointments(
                    $filters: AppointmentSearchFilters
                    $advancedFilters: [AppointmentAdvancedSearchFilters!]
                    $orderBy: [AppointmentOrderByCriterion!]
                    $page: Int!
                    $itemsPerPage: Int!
                ) {
                    appointments(
                        filters: $filters
                        advancedFilters: $advancedFilters
                        orderBy: $orderBy
                        page: $page
                        itemsPerPage: $itemsPerPage
                    ) {
                        results {
                            id
                            name
                            appointmentDateBegin
                            appointmentDateEnd
                            status
                            appointmentType
                            driverName
                            entityName
                            contactName
                            comment
                            allowedZones
                            escortRequired
                            extras
                        }
                    }
                }
            `,
            {
                filters: { appointmentType: visitCode },
                orderBy: [{ field: 'appointmentDateBegin', ascending: true }],
                advancedFilters: [
                    {
                        filter: [
                            {
                                field: { appointmentDateBegin: startDate },
                                searchType: 'SUPERIOR_OR_EQUAL'
                            }
                        ]
                    },
                    {
                        filter: [
                            {
                                field: { appointmentDateBegin: endDate },
                                searchType: 'INFERIOR_OR_EQUAL'
                            }
                        ]
                    }
                ],
                page: 1,
                itemsPerPage: 100
            }
        );

        const formattedVisits: VisitEvent[] = appointments.results.map((a: any) => ({
            id: String(a.id),
            title: a.driverName
                ? `${a.driverName}${a.entityName ? ` – ${a.entityName}` : ''}`
                : a.name,
            start: parseUtcToLocalDate(a.appointmentDateBegin),
            end: parseUtcToLocalDate(a.appointmentDateEnd),
            status: String(a.status) as VisitStatus,
            name: a.name,
            driverName: a.driverName ?? undefined,
            entityName: a.entityName ?? undefined,
            contactName: a.contactName ?? undefined,
            comment: a.comment ?? undefined,
            allowedZones: normalizeZones(a.allowedZones),
            escortRequired: a.escortRequired ?? undefined,
            extras: a.extras
        }));

        setEvents(formattedVisits);
        setSelectedEvent((prev) =>
            prev ? (formattedVisits.find((e) => e.id === prev.id) ?? prev) : null
        );
        setVisitsLoading(false);
    };

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        // wait until configs are loaded and the Visit appointment type is resolved
        if (!configs || configs.length === 0 || visitTypeCode === undefined) return;
        // agenda view covers the whole month of the current date
        const rangeUnit = currentView === 'agenda' ? 'month' : 'week';
        const rangeStart = dayjs(currentDate).startOf(rangeUnit).toDate();
        const rangeEnd = dayjs(currentDate).endOf(rangeUnit).toDate();
        getAllVisits(rangeStart, rangeEnd, visitTypeCode);
    }, [currentView, currentDate, refetch, visitTypeCode, configs]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ────────────────────────────────────────────────────────────────
    const handleClose = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedEvent(null), 300);
    };

    const handleSelectEvent = (event: VisitEvent) => {
        setSelectedEvent(event);
        setDrawerOpen(true);
    };

    // ── Derived view state ─────────────────────────────────────────────────────
    const isAgendaView = currentView === 'agenda';
    const selectedStatusLabel = selectedEvent
        ? (getVisitStatusLabel(configs as any[], selectedEvent.status, locale) ??
          statusConfig[selectedEvent.status]?.label)
        : undefined;

    if (!modes.includes(ModeEnum.Read)) return <></>;

    return (
        <>
            <AppHead title={t('common:agenda')} />
            <HeaderContent title={t('common:agenda')} routes={visitorsScheduleRoutes} />
            <div
                style={{
                    display: 'flex',
                    gap: drawerOpen ? 16 : 0,
                    transition: 'gap 0.3s ease',
                    margin: '0 30px'
                }}
            >
                {/* globals.css sizes the calendar columns from --rbc-col-width
                    (shared with the truck schedule); without it the 7 day columns
                    collapse to their minimum width */}
                <div
                    style={
                        {
                            flex: 1,
                            minWidth: 0,
                            '--rbc-col-width': 'calc((100vw - 110px) / 7)'
                        } as CSSProperties
                    }
                >
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title={t('actions:reload')}>
                            <Button
                                icon={<ReloadOutlined />}
                                loading={visitsLoading}
                                onClick={() => setRefetch((prev) => !prev)}
                            />
                        </Tooltip>
                    </div>
                    <Spin spinning={visitsLoading} tip={t('messages:loading')}>
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            min={DAY_START}
                            max={DAY_END}
                            style={{ height: 900 }}
                            onSelectEvent={handleSelectEvent}
                            views={['week', 'agenda']}
                            defaultView="week"
                            date={
                                isAgendaView
                                    ? dayjs(currentDate).startOf('month').toDate()
                                    : currentDate
                            }
                            length={isAgendaView ? dayjs(currentDate).daysInMonth() - 1 : undefined}
                            view={currentView}
                            messages={calendarMessages}
                            components={{
                                event: ({ event }: { event: VisitEvent }) => (
                                    <EventCard event={event} />
                                ),
                                agenda: {
                                    event: ({ event }: { event: VisitEvent }) => (
                                        <AgendaEventCard
                                            event={event}
                                            statusConfig={statusConfig}
                                        />
                                    )
                                }
                            }}
                            eventPropGetter={(event: VisitEvent) =>
                                isAgendaView
                                    ? {}
                                    : {
                                          style: {
                                              backgroundColor: statusConfig[event.status]?.bgColor,
                                              borderColor: statusConfig[event.status]?.bgColor,
                                              color: '#fff',
                                              borderRadius: 4
                                          }
                                      }
                            }
                            onView={(view: any) => {
                                setCurrentView(view);
                                handleClose();
                            }}
                            onNavigate={(date: Date, _view: any, action: any) => {
                                // agenda spans a calendar month: prev/next move by month
                                if (isAgendaView && (action === 'PREV' || action === 'NEXT')) {
                                    setCurrentDate(
                                        dayjs(currentDate)
                                            .add(action === 'NEXT' ? 1 : -1, 'month')
                                            .startOf('month')
                                            .toDate()
                                    );
                                } else {
                                    setCurrentDate(date);
                                }
                            }}
                        />
                    </Spin>
                    <ScheduleStatusLegend statusConfig={statusConfig} />
                </div>

                {/* inline side panel (same pattern as the truck schedule): it
                    squeezes the calendar instead of overlaying it */}
                <ScheduleSidePanel
                    open={drawerOpen}
                    title={selectedEvent?.title}
                    onClose={handleClose}
                >
                    {selectedEvent && (
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label={t('d:name')}>
                                    {selectedEvent.name}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:visitor')}>
                                    {selectedEvent.driverName ?? '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:company')}>
                                    {selectedEvent.entityName ?? '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:internal-referent')}>
                                    {selectedEvent.contactName ?? '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:comment')}>
                                    {selectedEvent.comment ?? '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('common:schedule')}>
                                    {dayjs(selectedEvent.start).format('DD/MM/YYYY HH:mm')} -{' '}
                                    {dayjs(selectedEvent.end).format('HH:mm')}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:allowedZones')}>
                                    {selectedEvent.allowedZones.length > 0
                                        ? selectedEvent.allowedZones
                                              .map((zone) =>
                                                  getVisitZoneLabel(
                                                      parameters as any[],
                                                      zone,
                                                      locale
                                                  )
                                              )
                                              .join(', ')
                                        : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('d:escortRequired')}>
                                    {selectedEvent.escortRequired
                                        ? t('d:bool-yes')
                                        : t('d:bool-no')}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('common:status')}>
                                    <Tag
                                        icon={statusConfig[selectedEvent.status]?.icon}
                                        color={statusConfig[selectedEvent.status]?.color}
                                    >
                                        {selectedStatusLabel ?? selectedEvent.status}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>
                            <LinkButton
                                title={t('common:detail')}
                                path={`/visitors/${selectedEvent.id}`}
                                type="primary"
                            />
                        </Space>
                    )}
                </ScheduleSidePanel>
            </div>
        </>
    );
};

VisitorsSchedulePage.layout = MainLayout;

export default VisitorsSchedulePage;
