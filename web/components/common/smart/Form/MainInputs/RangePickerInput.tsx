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
import { Form, DatePicker } from 'antd';
import moment from 'moment';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FormOptionType } from '../../../../../models/ModelsV2';
import { FC, useRef } from 'react';

export const RANGE_PRESET_TODAY = 'today';
export const RANGE_PRESET_TOMORROW = 'tommorow';

export function resolveRangePreset(value: any): any {
    if (!Array.isArray(value) || value.length !== 2) return value;
    const [start] = value;
    if (start === RANGE_PRESET_TODAY) {
        return [dayjs().startOf('day'), dayjs().endOf('day')];
    }
    if (start === RANGE_PRESET_TOMORROW) {
        return [dayjs().add(1, 'day').startOf('day'), dayjs().add(1, 'day').endOf('day')];
    }
    return value;
}

// display format of a range that takes a time (`item.showTime`)
const DATE_TIME_RANGE_FORMAT = 'YYYY-MM-DD HH:mm';

// A range picked to the minute covers its whole end minute: the API compares both bounds
// inclusively against values stored to the microsecond, so an end bound at 10:30:00 would miss a
// document of 10:30:42. Applied to the form value itself, so that the list, the export and the
// filter tags all read the same bounds.
function toMinuteBounds(dates: any): any {
    if (!Array.isArray(dates)) return dates;
    const [start, end] = dates;
    return [start ? start.startOf('minute') : start, end ? end.endOf('minute') : end];
}

export interface IDraggerRangePickerInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        disabled?: boolean;
        localeDateTimeFormat?: string;
        subOptions?: FormOptionType[];
        startDate?: string | null;
        endDate?: string | null;
        // the range also takes a time (see FieldInfo.filterWithTime)
        showTime?: { format: 'HH:mm' };
        rules?: any[];
    };
    key?: string;
    mode?: 'multiple' | undefined;
}

const RangePickerInput: FC<IDraggerRangePickerInputProps> = ({ item, mode }) => {
    const { t } = useTranslation();

    const { RangePicker } = DatePicker;

    const router = useRouter();
    moment.locale(router.locale);

    const presetKeyRef = useRef<string | null>(null);

    // Until the user sets a time, the first bound starts at 00:00 and the last one ends at 23:59:
    // picking days only still covers them whole (only the time of these values is used)
    const showTime = item.showTime
        ? { defaultOpenValue: [dayjs().startOf('day'), dayjs().endOf('day')], ...item.showTime }
        : undefined;

    const todayLabel = t('common:today');
    const tomorrowLabel = t('common:tomorrow');

    const presets = [
        {
            label: (
                <span
                    onMouseDown={() => {
                        presetKeyRef.current = RANGE_PRESET_TODAY;
                    }}
                >
                    {todayLabel}
                </span>
            ),
            value: [dayjs().startOf('day'), dayjs().endOf('day')] as [
                ReturnType<typeof dayjs>,
                ReturnType<typeof dayjs>
            ]
        },
        {
            label: (
                <span
                    onMouseDown={() => {
                        presetKeyRef.current = RANGE_PRESET_TOMORROW;
                    }}
                >
                    {tomorrowLabel}
                </span>
            ),
            value: [dayjs().add(1, 'day').startOf('day'), dayjs().add(1, 'day').endOf('day')] as [
                ReturnType<typeof dayjs>,
                ReturnType<typeof dayjs>
            ]
        }
    ];

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => (value ? value : undefined)}
            rules={item.rules!}
            getValueFromEvent={(dates) => {
                const preset = presetKeyRef.current;
                presetKeyRef.current = null;
                if (preset) {
                    return [preset, preset];
                }
                return showTime ? toMinuteBounds(dates) : dates;
            }}
            getValueProps={(value) => ({ value: resolveRangePreset(value) })}
            initialValue={
                item?.initialValue
                    ? resolveRangePreset([
                          item.initialValue[0] ?? null,
                          item.initialValue[1] ?? null
                      ])
                    : undefined
            }
        >
            <RangePicker
                showTime={showTime}
                format={
                    item.localeDateTimeFormat ?? (showTime ? DATE_TIME_RANGE_FORMAT : undefined)
                }
                locale={router.locale === 'fr-FR' ? fr_FR : en_US}
                allowEmpty={[true, true]}
                placeholder={[t('common:start-date'), t('common:end-date')]}
                allowClear
                presets={presets}
                defaultValue={[
                    item.startDate ? dayjs(item.startDate) : null,
                    item.endDate ? dayjs(item.endDate) : null
                ]}
            />
        </Form.Item>
    );
};

RangePickerInput.displayName = 'RangePickerInput';

export default RangePickerInput;
