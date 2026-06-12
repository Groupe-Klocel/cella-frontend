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

// DESCRIPTION: timing alert tag comparing the planned slot to the current time.

import { Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { FC } from 'react';

export interface ITimingTagProps {
    dateBegin?: string | Dayjs | null;
    t: (key: string, vars?: Record<string, any>) => string;
}

export const TimingTag: FC<ITimingTagProps> = ({ dateBegin, t }) => {
    if (!dateBegin) return null;

    // Positive = late (arrived after the planned start), negative = early.
    // dateBegin is a true UTC instant; diffing two instants is timezone-independent.
    const diffMin = Math.round(dayjs().diff(dayjs(dateBegin), 'minute'));

    if (Math.abs(diffMin) <= 15) {
        return <Tag color="green">{t('common:on-time')}</Tag>;
    }
    if (diffMin < 0) {
        return <Tag color="blue">{t('common:early', { min: Math.abs(diffMin) })}</Tag>;
    }
    if (diffMin <= 60) {
        return <Tag color="orange">{t('common:late', { min: diffMin })}</Tag>;
    }
    return <Tag color="red">{t('common:very-late', { min: diffMin })}</Tag>;
};

TimingTag.displayName = 'TimingTag';
