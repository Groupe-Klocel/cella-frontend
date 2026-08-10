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
import('dayjs/locale/es');

dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
import MainLayout from 'components/layouts/MainLayout';
import { FC, useState, useEffect, ReactNode, useMemo, CSSProperties } from 'react';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import {
    Button,
    Collapse,
    Descriptions,
    Modal,
    Space,
    Popconfirm,
    Tabs,
    Typography,
    Select,
    Steps,
    Tag,
    Tooltip,
    Spin,
    List,
    Result
} from 'antd';
import { ReloadOutlined, FileOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import {
    getModesFromPermissions,
    getVisitTypeCode,
    fetchInboundMaxPalettesPerDay,
    fetchInboundPalletsUsedForDay,
    resolveAppointmentStatusCodes,
    buildGateQueueReturnInput,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { ModeEnum } from 'generated/graphql';
import {
    LinkButton,
    ScheduleSidePanel,
    ScheduleStatusConfig,
    ScheduleStatusEntry,
    ScheduleToolbar,
    buildScheduleStatusConfig,
    parseUtcToLocalDate,
    useCalendarMessages
} from '@components';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

const localizer = dayjsLocalizer(dayjs);

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = string;

type AppointmentLine = {
    id: string;
    loadId?: string;
    loadName?: string;
    carrierName?: string;
};

type DocumentAttachment = {
    id: string;
    name: string;
    filename: string;
    fileCategory: string;
    fileContent: string;
};

type CalendarEvent = {
    title: string;
    start: Date;
    end: Date;
    resourceId?: number;
    status: AppointmentStatus;
    appointmentTypeCode?: string;
    id?: string;
    extraStatus1?: number | null;
    extraStatus1Text?: string | null;
    appointmentLines?: AppointmentLine[];
    documentAttachments?: DocumentAttachment[];
};

type DaySchedule = { open: boolean; periods: Array<{ start: string; end: string }> };
type WeekSchedule = Record<string, DaySchedule>;

type Ramp = {
    id: number;
    title: string;
    buildingId: number;
    schedule?: WeekSchedule;
    dockType?: string;
    authorizedCarriers?: string[];
    authorizedTruckTypes?: string[];
};

type Building = { id: number; title: string };

type StatusEntry = ScheduleStatusEntry;

type StatusConfig = ScheduleStatusConfig;

type ActionButton = {
    key: string;
    label: string;
    buttonType: 'primary' | 'default';
    danger?: boolean;
    confirm?: string;
    onClick: () => void;
};

type PageComponent = FC & { layout: typeof MainLayout };

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ─── File preview helpers ────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv'
};

const getMimeType = (filename: string, fileCategory: string): string => {
    if (fileCategory?.includes('/')) return fileCategory;
    const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
    return MIME_MAP[ext] ?? 'application/octet-stream';
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// "The next step" is derived from the numeric code order, so any status that sits outside the
// linear progression (waiting area, blocked on paperwork) has to be skipped: their codes fall
// between Confirmed and On Site, and without this the advance button on a confirmed appointment
// would offer to deny it.
const getNextStatus = (
    statusFlow: AppointmentStatus[],
    status: AppointmentStatus,
    statusConfig?: StatusConfig
): AppointmentStatus | null => {
    const idx = statusFlow.indexOf(status);
    if (idx === -1) return null;
    for (let i = idx + 1; i < statusFlow.length; i++) {
        if (!statusConfig?.[statusFlow[i]]?.offFlow) return statusFlow[i];
    }
    return null;
};

const isTerminalStatus = (statusConfig: StatusConfig, status: AppointmentStatus): boolean =>
    ['Refused', 'No Show', 'Cancelled', 'Completed'].includes(statusConfig[status]?.value ?? '');

const getDisplayFlow = (
    statusFlow: AppointmentStatus[],
    statusConfig: StatusConfig,
    currentStatus: AppointmentStatus
): AppointmentStatus[] => {
    const standardFlow = statusFlow.filter(
        (s) =>
            !['Refused', 'No Show', 'Cancelled'].includes(statusConfig[s]?.value ?? '') &&
            !statusConfig[s]?.offFlow
    );
    const currentValue = statusConfig[currentStatus]?.value ?? '';
    // NOTE the slice indices below assume the first three rail entries are In Creation / Submitted
    // / Confirmed. That still holds because every off-flow status code sorts after Confirmed — do
    // not introduce a status numbered below it without revisiting this.
    if (currentValue === 'No Show') return [...standardFlow.slice(0, 3), currentStatus];
    if (currentValue === 'Refused')
        return [...standardFlow.slice(0, 2), currentStatus, ...standardFlow.slice(2)];
    // An off-flow status is shown in its natural numeric position rather than at a hard-coded
    // index, so the Steps rail reads Confirmed -> On site (waiting) -> On Site.
    if (statusConfig[currentStatus]?.offFlow)
        return [...standardFlow, currentStatus].sort((a, b) => Number(a) - Number(b));
    return standardFlow;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const EventCard: FC<{ event: CalendarEvent; typeConfig: Record<string, string> }> = ({
    event,
    typeConfig
}) => (
    <div style={{ lineHeight: 1.3 }}>
        {event.appointmentTypeCode && (
            <div
                style={{
                    fontSize: 11,
                    opacity: 0.9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {typeConfig[event.appointmentTypeCode] ?? event.appointmentTypeCode}
            </div>
        )}
        <div
            style={{
                fontWeight: 600,
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}
        >
            {event.extraStatus1 != null && (
                // docs & references validation marker (✔ OK / ✖ Not OK)
                <span
                    title={event.extraStatus1Text ?? ''}
                    style={{
                        marginRight: 4,
                        color: /not.?ok|non.?ok|ko/i.test(event.extraStatus1Text ?? '')
                            ? '#cf1322'
                            : '#389e0d'
                    }}
                >
                    {/not.?ok|non.?ok|ko/i.test(event.extraStatus1Text ?? '') ? '✖' : '✔'}
                </span>
            )}
            {event.title}
        </div>
    </div>
);

const AgendaEventCard: FC<{
    event: CalendarEvent;
    statusConfig: StatusConfig;
    ramps: Ramp[];
    buildings: Building[];
}> = ({ event, statusConfig, ramps, buildings }) => {
    const ramp = ramps.find((r) => r.id === event.resourceId);
    const building = buildings.find((b) => b.id === ramp?.buildingId);
    return (
        <Space size={16}>
            <Typography.Text type="secondary" style={{ minWidth: 90, display: 'inline-block' }}>
                {building?.title ?? '—'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ minWidth: 70, display: 'inline-block' }}>
                {ramp?.title ?? '—'}
            </Typography.Text>
            <Typography.Text strong>{event.title}</Typography.Text>
            <Tag
                icon={statusConfig[event.status]?.icon}
                color={statusConfig[event.status]?.bgColor}
            >
                {statusConfig[event.status]?.label}
            </Tag>
        </Space>
    );
};

const FilePreview: FC<{ file: DocumentAttachment }> = ({ file }) => {
    const mimeType = getMimeType(file.filename, file.fileCategory);
    const dataUrl = `data:${mimeType};base64,${file.fileContent}`;

    if (mimeType.startsWith('image/')) {
        return (
            <img
                src={dataUrl}
                alt={file.name}
                style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }}
            />
        );
    }
    if (mimeType === 'application/pdf') {
        return (
            <iframe
                src={dataUrl}
                title={file.name}
                style={{ width: '100%', height: '70vh', border: 'none' }}
            />
        );
    }
    return null;
};

// ─── Main component ───────────────────────────────────────────────────────────

const MyCalendar: PageComponent = () => {
    const { configs, permissions } = useAppState();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    // fail closed: menu gating alone doesn't stop a direct URL hit — never fetch without READ.
    const canRead = getModesFromPermissions(permissions, 'wm_appointments-schedule').includes(
        ModeEnum.Read
    );
    const locale = router?.locale?.split('-')[0] || 'en';
    dayjs.locale(locale);

    // ── State ──────────────────────────────────────────────────────────────────
    const [ramps, setRamps] = useState<Ramp[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);
    const [refetch, setRefetch] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<DocumentAttachment | null>(null);
    const [selectedRampId, setSelectedRampId] = useState<number | null>(null);
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
    const [currentView, setCurrentView] = useState<View>('day');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    // ── Derived config ─────────────────────────────────────────────────────────
    const { statusConfig, statusFlow, typeConfig, locationCategoryDocksConfig } = useMemo(() => {
        const appointmentConfigs = (configs as any[])
            .filter((c) => c.scope === 'appointment_status')
            .sort((a, b) => Number(a.code) - Number(b.code));

        const statusFlow: AppointmentStatus[] = appointmentConfigs.map((c) => String(c.code));

        const statusConfig = buildScheduleStatusConfig(appointmentConfigs, locale);

        const typeConfig = (configs as any[])
            .filter((c) => c.scope === 'appointment_type')
            .reduce(
                (acc, c) => {
                    acc[String(c.code)] = c.translation?.[locale] ?? c.translation?.en ?? c.value;
                    return acc;
                },
                {} as Record<string, string>
            );

        // `?.` matters: a warehouse without a location_category row valued exactly "Dock" used to
        // crash the whole page here rather than degrade.
        const locationCategoryDocksConfig = (configs as any[]).find(
            (c) => c.scope === 'location_category' && c.value === 'Dock'
        )?.code;

        return { statusConfig, statusFlow, typeConfig, locationCategoryDocksConfig };
    }, [configs, locale]);

    // ── Inbound daily capacity (INBOUND_MAX_CAPACITY rule) ─────────────────────
    // Reference figure for the day in view. Rendered only when the warehouse actually configured
    // the rule; most never will, and an empty state would just be noise.
    //
    // Deliberately NOT derived from `events`: that query is capped at itemsPerPage and drops
    // visit/cancelled rows client-side, so reusing it would under-count exactly when the day is
    // busy enough to matter. The dedicated helper carries its own `truncated` flag.
    const [capacity, setCapacity] = useState<{
        used: number;
        max: number;
        truncated: boolean;
    } | null>(null);
    useEffect(() => {
        if (!canRead) return;
        let active = true;
        const day = dayjs(currentDate);
        (async () => {
            const max = await fetchInboundMaxPalettesPerDay(graphqlRequestClient, day);
            if (!active || max == null) {
                if (active) setCapacity(null);
                return;
            }
            try {
                const usage = await fetchInboundPalletsUsedForDay(
                    graphqlRequestClient,
                    configs as any[],
                    day
                );
                if (active) setCapacity({ used: usage.used, max, truncated: usage.truncated });
            } catch (e) {
                if (active) setCapacity(null);
            }
        })();
        return () => {
            active = false;
        };
    }, [graphqlRequestClient, configs, currentDate, canRead, refetch]);

    // Visit-type appointments are shown on the visitors schedule, not here.
    // When the Visit config does not exist, visitTypeCode is undefined and no filtering occurs.
    const visitTypeCode = useMemo(() => getVisitTypeCode(configs as any[]), [configs]);

    const calendarMessages = useCalendarMessages();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const getRamps = async () => {
        const { locations } = await graphqlRequestClient.request(
            gql`
                query locations(
                    $filters: LocationSearchFilters
                    $orderBy: [LocationOrderByCriterion!]
                    $page: Int!
                    $itemsPerPage: Int!
                ) {
                    locations(
                        filters: $filters
                        orderBy: $orderBy
                        page: $page
                        itemsPerPage: $itemsPerPage
                    ) {
                        results {
                            id
                            name
                            extras
                            block {
                                id
                                building {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            `,
            {
                filters: { category: locationCategoryDocksConfig },
                orderBy: [{ field: 'id', ascending: true }],
                page: 1,
                itemsPerPage: 100
            }
        );

        const buildingsMap = new Map<number, Building>();
        const formattedRamps: Ramp[] = locations.results.map((r: any) => {
            const { id: buildingId, name: buildingName } = r.block.building;
            if (!buildingsMap.has(buildingId)) {
                buildingsMap.set(buildingId, { id: buildingId, title: buildingName });
            }
            const extras = r.extras ?? {};
            let schedule: WeekSchedule | undefined;
            try {
                const raw = extras.operating_schedules;
                if (raw) schedule = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch {
                schedule = undefined;
            }
            return {
                id: r.id,
                title: r.name,
                buildingId,
                schedule,
                dockType: extras.dock_type,
                authorizedCarriers: extras.authorized_carriers?.split(','),
                authorizedTruckTypes: extras.authorized_truck_types?.split(',')
            };
        });

        setBuildings(Array.from(buildingsMap.values()));
        setRamps(formattedRamps);
        setSelectedRampId(formattedRamps[0]?.id ?? null);
        setLoading(false);
    };

    const getAllApointments = async (startDate?: Date, endDate?: Date) => {
        setAppointmentsLoading(true);
        const start = startDate ?? dayjs().startOf('day').toDate();
        const end = endDate ?? dayjs().endOf('day').toDate();

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
                            extraStatus1
                            extraStatus1Text
                            location {
                                id
                            }
                            appointmentLines {
                                id
                                load {
                                    id
                                    name
                                    carrier {
                                        id
                                        name
                                    }
                                }
                            }
                            documentAttachments {
                                id
                                name
                                filename
                                fileCategory
                                fileContent
                            }
                        }
                    }
                }
            `,
            {
                filters: {},
                orderBy: [{ field: 'appointmentDateBegin', ascending: true }],
                advancedFilters: [
                    {
                        filter: [
                            {
                                field: { appointmentDateBegin: start },
                                searchType: 'SUPERIOR_OR_EQUAL'
                            }
                        ]
                    },
                    {
                        filter: [
                            {
                                field: { appointmentDateBegin: end },
                                searchType: 'INFERIOR_OR_EQUAL'
                            }
                        ]
                    }
                ],
                page: 1,
                itemsPerPage: 100
            }
        );

        const formattedAppointments: CalendarEvent[] = appointments.results.map((a: any) => ({
            title: a.name,
            // API dates are naive UTC strings: parse as UTC so the calendar
            // renders them in the user's local time
            start: parseUtcToLocalDate(a.appointmentDateBegin),
            end: parseUtcToLocalDate(a.appointmentDateEnd),
            resourceId: a?.location?.id,
            status: String(a.status) as AppointmentStatus,
            appointmentTypeCode: a.appointmentType != null ? String(a.appointmentType) : undefined,
            id: String(a.id),
            extraStatus1: a.extraStatus1 ?? null,
            extraStatus1Text: a.extraStatus1Text ?? null,
            appointmentLines: a.appointmentLines.map((al: any) => ({
                id: al.id,
                loadId: al.load?.id,
                loadName: al.load?.name,
                carrierName: al.load?.carrier?.name
            })),
            documentAttachments: a.documentAttachments.map((d: any) => ({
                id: d.id,
                name: d.name,
                filename: d.filename,
                fileCategory: d.fileCategory,
                fileContent: d.fileContent
            }))
        }));

        setEvents(formattedAppointments);
        setSelectedEvent((prev) =>
            prev ? (formattedAppointments.find((e) => e.id === prev.id) ?? prev) : null
        );
        setAppointmentsLoading(false);
    };

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!canRead) return;
        getRamps();
    }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!canRead) return;
        const rangeStart = dayjs(currentDate)
            .startOf(currentView === 'week' ? 'week' : 'day')
            .toDate();
        const rangeEnd =
            currentView === 'agenda'
                ? dayjs(currentDate).add(30, 'days').endOf('day').toDate()
                : dayjs(currentDate)
                      .endOf(currentView === 'week' ? 'week' : 'day')
                      .toDate();
        getAllApointments(rangeStart, rangeEnd);
    }, [currentView, currentDate, refetch, canRead]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ────────────────────────────────────────────────────────────────
    const updateAppointmentStatus = async (
        id: string,
        status: string,
        extraInput?: Record<string, any>
    ) => {
        await graphqlRequestClient.request(
            gql`
                mutation updateAppointment($id: String!, $input: UpdateAppointmentInput!) {
                    updateAppointment(id: $id, input: $input) {
                        id
                        status
                    }
                }
            `,
            { id, input: { status: Number(status), ...(extraInput ?? {}) } }
        );
        setRefetch((prev) => !prev);
    };

    const handleAdvanceStatus = async () => {
        if (!selectedEvent?.id) return;
        const nextStatus = getNextStatus(statusFlow, selectedEvent.status, statusConfig);
        if (!nextStatus) return;
        await updateAppointmentStatus(selectedEvent.id, nextStatus);
    };

    const handleClose = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedEvent(null), 300);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setDrawerOpen(true);
    };

    const handleSelectSlot = ({
        start,
        end,
        resourceId
    }: {
        start: Date;
        end: Date;
        resourceId?: number | string;
    }) => {
        const dayName = DAY_NAMES[dayjs(start).day()];
        const ramp = resourceId
            ? ramps.find((r) => r.id === resourceId)
            : ramps.find((r) => r.id === selectedRampId);
        const daySchedule = ramp?.schedule?.[dayName];
        if (!daySchedule?.open) return;

        if (daySchedule.periods.length > 0) {
            const slotTime = dayjs(start).format('HH:mm');
            if (!daySchedule.periods.some((p) => slotTime >= p.start && slotTime < p.end)) return;
        }

        const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
        if (resourceId != null) params.set('locationId', String(resourceId));
        router.push(`/appointments/add?${params.toString()}`);
    };

    const slotPropGetter = (date: Date, resourceId?: number | string) => {
        const dayName = DAY_NAMES[dayjs(date).day()];
        const ramp = resourceId
            ? ramps.find((r) => r.id === resourceId)
            : ramps.find((r) => r.id === selectedRampId);
        const daySchedule = ramp?.schedule?.[dayName];

        if (!daySchedule?.open)
            return { className: 'slot-unavailable', style: { backgroundColor: '#f0f0f0' } };
        if (daySchedule.periods.length === 0) return { className: 'slot-available' };

        const slotTime = dayjs(date).format('HH:mm');
        return daySchedule.periods.some((p) => slotTime >= p.start && slotTime < p.end)
            ? { className: 'slot-available' }
            : { className: 'slot-unavailable', style: { backgroundColor: '#f0f0f0' } };
    };

    // ── Derived view state ─────────────────────────────────────────────────────
    const isDayView = currentView === 'day';
    const isAgendaView = currentView === 'agenda';
    const visibleRamps = selectedBuildingId
        ? ramps.filter((r) => r.buildingId === selectedBuildingId)
        : ramps;

    // Column widths expressed in vw so they scale with the screen.
    // For docks (day view) we keep a minimum width per column: when there are
    // few docks they stretch to fill the table, and when there are many they
    // keep that minimum and the table scrolls horizontally instead of shrinking.
    const GUTTER_VW = 4;
    const MIN_COL_PX = 110;
    const colWidthCss =
        currentView === 'week'
            ? `calc((100vw - 110px) / 7)`
            : `max(${MIN_COL_PX}px, calc((90vw - ${GUTTER_VW}vw) / ${Math.max(1, visibleRamps.length)}))`;

    const cancelledCode = statusFlow.find((s) => statusConfig[s]?.value === 'Cancelled');
    const confirmedCode = statusFlow.find((s) => statusConfig[s]?.value === 'Confirmed');
    // resolved by role rather than by value so a renamed row still works
    const documentsPendingCode = String(
        resolveAppointmentStatusCodes(configs as any[]).documentsPending ?? ''
    );
    const refusedCode = statusFlow.find((s) => statusConfig[s]?.value === 'Refused');
    const next = selectedEvent
        ? getNextStatus(statusFlow, selectedEvent.status, statusConfig)
        : null;
    const isSubmitted = selectedEvent
        ? statusConfig[selectedEvent.status]?.value === 'Submitted'
        : false;

    const eventRamp = ramps.find((r) => r.id === selectedEvent?.resourceId);
    const eventBuilding = buildings.find((b) => b.id === eventRamp?.buildingId);
    const displayFlow = selectedEvent
        ? getDisplayFlow(statusFlow, statusConfig, selectedEvent.status)
        : [];

    const filteredEvents = (
        isDayView
            ? events.filter((e) => visibleRamps.some((r) => r.id === e.resourceId))
            : isAgendaView
              ? events.filter((e) =>
                    selectedBuildingId ? visibleRamps.some((r) => r.id === e.resourceId) : true
                )
              : events.filter((e) => e.resourceId === selectedRampId)
    )
        .filter((e) => statusConfig[e.status]?.value !== 'Cancelled')
        .filter(
            (e) =>
                visitTypeCode === undefined ||
                e.appointmentTypeCode === undefined ||
                Number(e.appointmentTypeCode) !== visitTypeCode
        );

    // Blocked on paperwork: the only move is BACKWARD, into the gate queue. `next` would point at
    // On Site here (numeric order), which would wave the truck through without the documents.
    const isDocumentsPending = !!(
        selectedEvent &&
        documentsPendingCode &&
        selectedEvent.status === documentsPendingCode
    );

    const actionButtons: ActionButton[] =
        selectedEvent && !isTerminalStatus(statusConfig, selectedEvent.status)
            ? isDocumentsPending
                ? [
                      ...(confirmedCode
                          ? [
                                {
                                    key: 'return-to-gate',
                                    label: t('actions:return-to-gate-queue'),
                                    buttonType: 'primary' as const,
                                    confirm: t('messages:return-to-gate-queue'),
                                    onClick: async () => {
                                        if (selectedEvent.id) {
                                            // Status alone is not enough: `classifyGateEntry` and
                                            // the kiosk both read a non-null `denyReason` as
                                            // "refused", so the truck would come back Confirmed
                                            // yet still look denied to the guard and the driver.
                                            // Shared with the detail page so the two screens
                                            // cannot drift apart.
                                            await updateAppointmentStatus(
                                                selectedEvent.id,
                                                confirmedCode,
                                                await buildGateQueueReturnInput(
                                                    graphqlRequestClient,
                                                    selectedEvent.id
                                                )
                                            );
                                        }
                                    }
                                }
                            ]
                          : []),
                      ...(cancelledCode
                          ? [
                                {
                                    key: 'cancel',
                                    label: t('actions:cancel'),
                                    buttonType: 'default' as const,
                                    danger: true,
                                    confirm: t('messages:cancel this appointment?'),
                                    onClick: async () => {
                                        if (selectedEvent.id) {
                                            await updateAppointmentStatus(
                                                selectedEvent.id,
                                                cancelledCode
                                            );
                                        }
                                    }
                                }
                            ]
                          : [])
                  ]
                : [
                      ...(isSubmitted
                          ? [
                                {
                                    key: 'confirm',
                                    label: t('actions:confirm'),
                                    buttonType: 'primary' as const,
                                    onClick: handleAdvanceStatus
                                },
                                ...(refusedCode
                                    ? [
                                          {
                                              key: 'refuse',
                                              label: t('actions:refuse'),
                                              buttonType: 'default' as const,
                                              danger: true,
                                              confirm: t('messages:refuse this appointment?'),
                                              onClick: async () => {
                                                  if (selectedEvent.id) {
                                                      await updateAppointmentStatus(
                                                          selectedEvent.id,
                                                          refusedCode
                                                      );
                                                  }
                                              }
                                          }
                                      ]
                                    : [])
                            ]
                          : next
                            ? [
                                  {
                                      key: 'advance',
                                      label: `${t('actions:advance-to')} « ${statusConfig[next]?.label} »`,
                                      buttonType: 'primary' as const,
                                      onClick: handleAdvanceStatus
                                  }
                              ]
                            : []),
                      ...(cancelledCode
                          ? [
                                {
                                    key: 'cancel',
                                    label: t('actions:cancel'),
                                    buttonType: 'default' as const,
                                    danger: true,
                                    confirm: t('messages:cancel this appointment?'),
                                    onClick: async () => {
                                        if (selectedEvent.id) {
                                            await updateAppointmentStatus(
                                                selectedEvent.id,
                                                cancelledCode
                                            );
                                        }
                                    }
                                }
                            ]
                          : [])
                  ]
            : [];

    if (!canRead) {
        return <Result status="403" title={t('messages:access-denied')} />;
    }

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    gap: drawerOpen ? 16 : 0,
                    transition: 'gap 0.3s ease',
                    margin: 30
                }}
            >
                <div
                    style={
                        {
                            flex: 1,
                            minWidth: 0,
                            '--rbc-col-width': colWidthCss
                        } as CSSProperties
                    }
                >
                    <div
                        style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                        <Typography.Text strong>{t('common:building')} :</Typography.Text>
                        <Select
                            value={selectedBuildingId}
                            onChange={(val) => {
                                setSelectedBuildingId(val);
                                const firstRamp = ramps.find((r) => !val || r.buildingId === val);
                                if (firstRamp) setSelectedRampId(firstRamp.id);
                                handleClose();
                            }}
                            options={[
                                { value: null, label: t('common:all') },
                                ...buildings.map((b) => ({ value: b.id, label: b.title }))
                            ]}
                            style={{ width: 160 }}
                        />
                        {!isDayView && !isAgendaView && (
                            <>
                                <Typography.Text strong>{t('common:dock')} :</Typography.Text>
                                <Select
                                    value={selectedRampId}
                                    onChange={(val) => {
                                        setSelectedRampId(val);
                                        handleClose();
                                    }}
                                    options={visibleRamps.map((r) => ({
                                        value: r.id,
                                        label: r.title
                                    }))}
                                    style={{ width: 160 }}
                                />
                            </>
                        )}
                        {capacity && (
                            <Tooltip
                                title={
                                    capacity.truncated
                                        ? t('messages:inbound-capacity-partial')
                                        : t('common:inbound-capacity')
                                }
                            >
                                <Tag
                                    color={
                                        capacity.used >= capacity.max
                                            ? 'red'
                                            : capacity.used >= capacity.max * 0.8
                                              ? 'orange'
                                              : 'default'
                                    }
                                >
                                    {t('common:inbound-capacity')}: {capacity.used} / {capacity.max}
                                    {capacity.truncated ? ' +' : ''}
                                </Tag>
                            </Tooltip>
                        )}
                        <div style={{ marginLeft: 'auto' }}>
                            <Tooltip title={t('actions:reload')}>
                                <Button
                                    icon={<ReloadOutlined />}
                                    loading={appointmentsLoading}
                                    onClick={() => setRefetch((prev) => !prev)}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <Spin spinning={appointmentsLoading} tip={t('messages:loading')}>
                        <Calendar
                            localizer={localizer}
                            events={filteredEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 1250 }}
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            views={['day', 'week', 'agenda']}
                            date={currentDate}
                            view={currentView}
                            messages={calendarMessages}
                            slotPropGetter={slotPropGetter}
                            components={{
                                toolbar: (tp: any) => <ScheduleToolbar {...tp} picker="date" />,
                                // Dock name in a fixed-height header cell (see globals.css): the
                                // label is clamped to two lines, so keep the full name in a title
                                // tooltip for docks whose name does not fit.
                                resourceHeader: ({ label }: any) => (
                                    <span className="rbc-header-label" title={String(label ?? '')}>
                                        {label}
                                    </span>
                                ),
                                event: ({ event }: { event: CalendarEvent }) => (
                                    <EventCard event={event} typeConfig={typeConfig} />
                                ),
                                agenda: {
                                    event: ({ event }: { event: CalendarEvent }) => (
                                        <AgendaEventCard
                                            event={event}
                                            statusConfig={statusConfig}
                                            ramps={ramps}
                                            buildings={buildings}
                                        />
                                    )
                                }
                            }}
                            eventPropGetter={(event: CalendarEvent) =>
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
                            onNavigate={(date: Date) => {
                                setCurrentDate(date);
                            }}
                            {...(isDayView
                                ? {
                                      resources: visibleRamps,
                                      resourceIdAccessor: 'id' as keyof Ramp,
                                      resourceTitleAccessor: 'title' as keyof Ramp
                                  }
                                : {})}
                        />
                    </Spin>
                    <div
                        style={{
                            marginTop: 12,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px 12px',
                            padding: '10px 12px',
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 6
                        }}
                    >
                        {statusFlow
                            .filter(
                                (code) =>
                                    statusConfig[code] && statusConfig[code].value !== 'Cancelled'
                            )
                            .map((code) => {
                                const cfg = statusConfig[code];
                                if (!cfg) return null;
                                return (
                                    <Space key={code} size={6} style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                background: cfg.bgColor,
                                                flexShrink: 0
                                            }}
                                        />
                                        <Typography.Text style={{ fontSize: 12 }}>
                                            {cfg.label}
                                        </Typography.Text>
                                    </Space>
                                );
                            })}
                    </div>
                </div>

                <ScheduleSidePanel
                    open={drawerOpen}
                    title={selectedEvent?.title}
                    onClose={handleClose}
                >
                    <Tabs
                        size="small"
                        style={{ marginTop: -8 }}
                        items={[
                            {
                                key: 'details',
                                label: t('common:detail'),
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                        <Descriptions column={1} bordered size="small">
                                            <Descriptions.Item label={t('common:title')}>
                                                {selectedEvent?.title}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:status')}>
                                                {selectedEvent && (
                                                    <Tag
                                                        icon={
                                                            statusConfig[selectedEvent.status]?.icon
                                                        }
                                                        color={
                                                            statusConfig[selectedEvent.status]
                                                                ?.color
                                                        }
                                                    >
                                                        {statusConfig[selectedEvent.status]?.label}
                                                    </Tag>
                                                )}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:building')}>
                                                {eventBuilding?.title}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:schedule')}>
                                                {selectedEvent
                                                    ? dayjs(selectedEvent.start).format(
                                                          'DD/MM/YYYY HH:mm'
                                                      )
                                                    : ''}{' '}
                                                -{' '}
                                                {selectedEvent
                                                    ? dayjs(selectedEvent.end).format('HH:mm')
                                                    : ''}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:duration')}>
                                                {selectedEvent
                                                    ? dayjs(selectedEvent.end).diff(
                                                          dayjs(selectedEvent.start),
                                                          'minute'
                                                      )
                                                    : 0}{' '}
                                                min
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:type')}>
                                                {typeConfig[
                                                    selectedEvent?.appointmentTypeCode ?? ''
                                                ] ??
                                                    selectedEvent?.appointmentTypeCode ??
                                                    '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={t('common:dock')}>
                                                {eventRamp?.title}
                                            </Descriptions.Item>
                                        </Descriptions>

                                        {selectedEvent?.appointmentLines &&
                                            selectedEvent.appointmentLines.length > 0 && (
                                                <Collapse
                                                    size="small"
                                                    ghost
                                                    items={[
                                                        {
                                                            key: 'loads',
                                                            label: (
                                                                <Typography.Text
                                                                    strong
                                                                    style={{ fontSize: 13 }}
                                                                >
                                                                    Chargements (
                                                                    {
                                                                        selectedEvent
                                                                            .appointmentLines.length
                                                                    }
                                                                    )
                                                                </Typography.Text>
                                                            ),
                                                            children: (
                                                                <Space
                                                                    direction="vertical"
                                                                    style={{ width: '100%' }}
                                                                    size={4}
                                                                >
                                                                    {selectedEvent.appointmentLines.map(
                                                                        (line) => (
                                                                            <div
                                                                                key={line.id}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    justifyContent:
                                                                                        'space-between',
                                                                                    fontSize: 12,
                                                                                    padding: '2px 0'
                                                                                }}
                                                                            >
                                                                                <Typography.Text>
                                                                                    {line.loadName ??
                                                                                        '—'}
                                                                                </Typography.Text>
                                                                                <Typography.Text type="secondary">
                                                                                    {line.carrierName ??
                                                                                        '—'}
                                                                                </Typography.Text>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </Space>
                                                            )
                                                        }
                                                    ]}
                                                />
                                            )}
                                    </Space>
                                )
                            },
                            {
                                key: 'status',
                                label: t('common:status'),
                                children: selectedEvent && (
                                    <div>
                                        {statusConfig[selectedEvent.status]?.value ===
                                        'Cancelled' ? (
                                            <Tag
                                                icon={statusConfig[selectedEvent.status]?.icon}
                                                color={statusConfig[selectedEvent.status]?.color}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'center',
                                                    padding: '6px 0',
                                                    fontSize: 13
                                                }}
                                            >
                                                {statusConfig[selectedEvent.status]?.label}
                                            </Tag>
                                        ) : (
                                            <>
                                                <Steps
                                                    direction="vertical"
                                                    size="small"
                                                    current={displayFlow.indexOf(
                                                        selectedEvent.status
                                                    )}
                                                    style={{ marginBottom: 12 }}
                                                    items={displayFlow.map((s) => ({
                                                        title: statusConfig[s]?.label,
                                                        icon: (
                                                            <Tooltip title={statusConfig[s]?.label}>
                                                                <span>{statusConfig[s]?.icon}</span>
                                                            </Tooltip>
                                                        )
                                                    }))}
                                                />
                                                {actionButtons.length > 0 && (
                                                    <Space
                                                        direction="vertical"
                                                        style={{ width: '100%' }}
                                                    >
                                                        {actionButtons.map((btn) =>
                                                            btn.confirm ? (
                                                                <Popconfirm
                                                                    key={btn.key}
                                                                    title={btn.confirm}
                                                                    onConfirm={btn.onClick}
                                                                    okText={t('d:bool-yes')}
                                                                    cancelText={t('d:bool-no')}
                                                                >
                                                                    <Button
                                                                        danger={btn.danger}
                                                                        block
                                                                    >
                                                                        {btn.label}
                                                                    </Button>
                                                                </Popconfirm>
                                                            ) : (
                                                                <Button
                                                                    key={btn.key}
                                                                    type={btn.buttonType}
                                                                    danger={btn.danger}
                                                                    block
                                                                    onClick={btn.onClick}
                                                                >
                                                                    {btn.label}
                                                                </Button>
                                                            )
                                                        )}
                                                    </Space>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'files',
                                label: t('common:files'),
                                children: (
                                    <List
                                        size="small"
                                        bordered
                                        locale={{ emptyText: t('messages:no files attached') }}
                                        dataSource={selectedEvent?.documentAttachments ?? []}
                                        renderItem={(file) => {
                                            const mimeType = getMimeType(
                                                file.filename,
                                                file.fileCategory
                                            );
                                            const canPreview =
                                                mimeType.startsWith('image/') ||
                                                mimeType === 'application/pdf';
                                            const handleDownload = () => {
                                                const link = document.createElement('a');
                                                link.href = `data:application/octet-stream;base64,${file.fileContent}`;
                                                link.download = file.filename || file.name;
                                                link.click();
                                            };
                                            return (
                                                <List.Item
                                                    key={file.id}
                                                    style={{ padding: '8px 12px' }}
                                                    actions={[
                                                        <Button
                                                            key="preview"
                                                            type="text"
                                                            size="small"
                                                            icon={<EyeOutlined />}
                                                            onClick={() => setPreviewFile(file)}
                                                            title={t('actions:preview')}
                                                            disabled={!canPreview}
                                                        />,
                                                        <Button
                                                            key="dl"
                                                            type="text"
                                                            size="small"
                                                            icon={<DownloadOutlined />}
                                                            onClick={handleDownload}
                                                            title={t('actions:download')}
                                                        />
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        avatar={
                                                            <FileOutlined
                                                                style={{
                                                                    fontSize: 20,
                                                                    color: '#8c8c8c',
                                                                    marginTop: 2
                                                                }}
                                                            />
                                                        }
                                                        title={
                                                            <Typography.Text
                                                                ellipsis
                                                                style={{ maxWidth: 180 }}
                                                            >
                                                                {file.name || file.filename}
                                                            </Typography.Text>
                                                        }
                                                        description={
                                                            <Space direction="vertical" size={0}>
                                                                <Typography.Text
                                                                    type="secondary"
                                                                    style={{ fontSize: 11 }}
                                                                >
                                                                    {file.filename}
                                                                </Typography.Text>
                                                                {file.fileCategory && (
                                                                    <Typography.Text
                                                                        type="secondary"
                                                                        style={{ fontSize: 11 }}
                                                                    >
                                                                        {file.fileCategory}
                                                                    </Typography.Text>
                                                                )}
                                                            </Space>
                                                        }
                                                    />
                                                </List.Item>
                                            );
                                        }}
                                    />
                                )
                            }
                        ]}
                    />
                    {selectedEvent?.id && (
                        <LinkButton
                            title={t('common:detail')}
                            path={`/appointments/${selectedEvent.id}`}
                            type="primary"
                        />
                    )}
                </ScheduleSidePanel>
            </div>

            {/* File preview modal */}
            <Modal
                open={!!previewFile}
                title={previewFile?.name || previewFile?.filename}
                onCancel={() => setPreviewFile(null)}
                footer={null}
                width={800}
                centered
                destroyOnClose
            >
                {previewFile ? <FilePreview file={previewFile} /> : null}
            </Modal>
        </>
    );
};

MyCalendar.layout = MainLayout;

export default MyCalendar;
