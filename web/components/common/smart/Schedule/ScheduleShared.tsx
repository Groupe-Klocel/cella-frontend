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

// Shared building blocks for the react-big-calendar schedule pages
// (truck appointments and visitors): status config derived from the DB
// configs, calendar i18n messages, the inline side panel shell and the
// status color legend.

import { FC, ReactNode, useMemo, useState } from 'react';
import { Button, DatePicker, Space, Typography } from 'antd';
import {
    AimOutlined,
    CalendarOutlined,
    CarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    DislikeOutlined,
    FileAddOutlined,
    FileExclamationOutlined,
    QuestionCircleOutlined,
    SendOutlined,
    StopOutlined,
    ThunderboltOutlined,
    TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { isOffFlowAppointmentStatus, useTranslationWithFallback as useTranslation } from '@helpers';

dayjs.extend(utc);

export type ScheduleStatusEntry = {
    label: string;
    value: string;
    icon: ReactNode;
    color: string;
    bgColor: string;
    // true for statuses that sit outside the linear progression (waiting area, blocked on
    // paperwork). The schedule derives "the next step" from the numeric code order, so these
    // must be skipped or the advance button would offer to deny a confirmed appointment.
    offFlow?: boolean;
};

export type ScheduleStatusConfig = Record<string, ScheduleStatusEntry>;

export const SCHEDULE_ICON_MAP: Record<string, ReactNode> = {
    FileAddOutlined: <FileAddOutlined />,
    SendOutlined: <SendOutlined />,
    CalendarOutlined: <CalendarOutlined />,
    CarOutlined: <CarOutlined />,
    AimOutlined: <AimOutlined />,
    ThunderboltOutlined: <ThunderboltOutlined />,
    CheckCircleOutlined: <CheckCircleOutlined />,
    TrophyOutlined: <TrophyOutlined />,
    DislikeOutlined: <DislikeOutlined />,
    QuestionCircleOutlined: <QuestionCircleOutlined />,
    StopOutlined: <StopOutlined />,
    ClockCircleOutlined: <ClockCircleOutlined />,
    FileExclamationOutlined: <FileExclamationOutlined />
};

// code → { label, value, icon, color } from a list of DB config rows
// (label = translation for the short locale, falling back to en then value)
export const buildScheduleStatusConfig = (
    configItems: any[],
    locale: string
): ScheduleStatusConfig => {
    return [...(configItems ?? [])]
        .sort((a, b) => Number(a.code) - Number(b.code))
        .reduce((acc, c) => {
            acc[String(c.code)] = {
                label: c.translation?.[locale] ?? c.translation?.en ?? c.value,
                value: c.value as string,
                icon: SCHEDULE_ICON_MAP[c.extras?.icon] ?? <QuestionCircleOutlined />,
                color: c.extras?.color ?? '#8c8c8c',
                bgColor: c.extras?.color ?? '#8c8c8c',
                // statuses outside the linear progression (waiting area, blocked on
                // paperwork): the schedule must not offer them as "the next step". Resolved
                // through the shared helper, which accepts EITHER `extras.offFlow` or a known
                // `extras.statusRole` — a warehouse that creates the row with only the role
                // (the marker the status resolver treats as authoritative) would otherwise get
                // the wrong "next step" offered here.
                offFlow: isOffFlowAppointmentStatus(c)
            };
            return acc;
        }, {} as ScheduleStatusConfig);
};

// API dates are naive UTC strings: parse as UTC so the calendar renders
// them in the user's local time
export const parseUtcToLocalDate = (value: string): Date => {
    return dayjs.utc(value).local().toDate();
};

export const useCalendarMessages = () => {
    const { t } = useTranslation();
    return useMemo(
        () => ({
            today: t('common:today'),
            previous: t('common:previous'),
            next: t('common:next'),
            month: t('d:month'),
            week: t('common:week'),
            day: t('common:day'),
            agenda: t('common:agenda'),
            date: t('d:date'),
            time: t('common:time'),
            event: t('common:event'),
            noEventsInRange: t('messages:no events in range')
        }),
        [t]
    );
};

export interface IScheduleToolbarProps {
    // react-big-calendar ToolbarProps (typed loosely to avoid depending on its generics)
    date: Date;
    view: string;
    views: string[];
    label: string;
    localizer: { messages: Record<string, string> };
    onNavigate: (action: string, newDate?: Date) => void;
    onView: (view: string) => void;
    // day picker for the truck schedule, week picker for the visitor schedule
    picker?: 'date' | 'week';
}

// Drop-in replacement for the default react-big-calendar toolbar: same three
// sections (navigate / label / views), but the date label opens a picker so
// the user can jump straight to a day or week.
export const ScheduleToolbar: FC<IScheduleToolbarProps> = ({
    date,
    view,
    views,
    label,
    localizer: { messages },
    onNavigate,
    onView,
    picker = 'date'
}) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    return (
        <div className="rbc-toolbar">
            <span className="rbc-btn-group">
                <button type="button" onClick={() => onNavigate('TODAY')}>
                    {messages.today}
                </button>
                <button type="button" onClick={() => onNavigate('PREV')}>
                    {messages.previous}
                </button>
                <button type="button" onClick={() => onNavigate('NEXT')}>
                    {messages.next}
                </button>
            </span>
            <span
                className="rbc-toolbar-label"
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setPickerOpen(true)}
            >
                <CalendarOutlined style={{ marginRight: 6 }} />
                {label}
                {/* invisible zero-size input: only the popup calendar is shown,
                    anchored under the label */}
                <DatePicker
                    picker={picker}
                    open={pickerOpen}
                    value={dayjs(date)}
                    onOpenChange={setPickerOpen}
                    onChange={(d) => {
                        if (d) {
                            onNavigate(
                                'DATE',
                                (picker === 'week' ? d.startOf('week') : d).toDate()
                            );
                        }
                        setPickerOpen(false);
                    }}
                    allowClear={false}
                    inputReadOnly
                    tabIndex={-1}
                    suffixIcon={null}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 0,
                        width: 0,
                        height: 0,
                        padding: 0,
                        margin: 0,
                        border: 'none',
                        visibility: 'hidden',
                        pointerEvents: 'none'
                    }}
                />
            </span>
            <span className="rbc-btn-group">
                {views.map((name) => (
                    <button
                        type="button"
                        key={name}
                        className={view === name ? 'rbc-active' : ''}
                        onClick={() => onView(name)}
                    >
                        {messages[name] ?? name}
                    </button>
                ))}
            </span>
        </div>
    );
};

export interface IScheduleSidePanelProps {
    open: boolean;
    title?: ReactNode;
    onClose: () => void;
    width?: number;
    children?: ReactNode;
}

// Inline side panel that squeezes the calendar instead of overlaying it.
// Place it as the second child of a `display: flex` container whose first
// child (the calendar) has `flex: 1; min-width: 0`.
export const ScheduleSidePanel: FC<IScheduleSidePanelProps> = ({
    open,
    title,
    onClose,
    width = 320,
    children
}) => (
    <div
        style={{
            width: open ? width : 0,
            opacity: open ? 1 : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 0.3s ease, opacity 0.3s ease'
        }}
    >
        <div
            style={{
                width,
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 20,
                background: '#fff',
                boxShadow: '-2px 0 8px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Typography.Title level={5} style={{ margin: 0 }}>
                    {title}
                </Typography.Title>
                <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
            </div>
            {children}
        </div>
    </div>
);

export interface IScheduleStatusLegendProps {
    statusConfig: ScheduleStatusConfig;
}

export const ScheduleStatusLegend: FC<IScheduleStatusLegendProps> = ({ statusConfig }) => {
    const statusCodes = Object.keys(statusConfig).sort((a, b) => Number(a) - Number(b));
    return (
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
            {statusCodes.map((code) => {
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
                        <Typography.Text style={{ fontSize: 12 }}>{cfg.label}</Typography.Text>
                    </Space>
                );
            })}
        </div>
    );
};
