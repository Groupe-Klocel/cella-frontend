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

import { FC, ReactNode, useMemo } from 'react';
import { Button, Space, Typography } from 'antd';
import {
    AimOutlined,
    CalendarOutlined,
    CarOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    DislikeOutlined,
    FileAddOutlined,
    QuestionCircleOutlined,
    SendOutlined,
    StopOutlined,
    ThunderboltOutlined,
    TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslationWithFallback as useTranslation } from '@helpers';

dayjs.extend(utc);

export type ScheduleStatusEntry = {
    label: string;
    value: string;
    icon: ReactNode;
    color: string;
    bgColor: string;
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
    StopOutlined: <StopOutlined />
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
                bgColor: c.extras?.color ?? '#8c8c8c'
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
