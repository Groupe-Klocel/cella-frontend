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
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';
import de_DE from 'antd/lib/date-picker/locale/de_DE';
import { getLanguageCode, useTranslationWithFallback as useTranslation } from '@helpers';
import { FormOptionType } from '../../../../../models/ModelsV2';
import { FC, useMemo } from 'react';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';

export interface IDraggerDatePickerInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        disabled?: boolean;
        subOptions?: FormOptionType[];
        rules?: any[];
    };
    format?: string;
    key?: string;
    mode?: 'multiple' | undefined;
    disabledDate?: any;
    disabledTime?: any;
    showTime?: any;
    disabled?: boolean;
}

const getLocaleDatePicker = (locale: string) => {
    switch (locale) {
        case 'fr':
            return fr_FR;
        case 'de':
            return de_DE;
        default:
            return en_US;
    }
};

const DatePickerInput: FC<IDraggerDatePickerInputProps> = ({
    item,
    format,
    disabledDate,
    disabledTime,
    showTime,
    disabled
}) => {
    const { t } = useTranslation();

    const router = useRouter();
    const language = getLanguageCode(router);

    const mergedShowTime = useMemo(() => {
        const baseDefault = { defaultValue: dayjs('00:00:00', 'HH:mm:ss') };
        if (!showTime) return baseDefault;
        return typeof showTime === 'object' ? { ...baseDefault, ...showTime } : showTime;
    }, [showTime]);

    const isDisabled = disabled !== undefined ? disabled : item.disabled;

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => (value ? value : undefined)}
            initialValue={item?.initialValue ? dayjs(item?.initialValue) : undefined}
            rules={item.rules!}
        >
            {item.initialValue ? (
                <DatePicker
                    format={format}
                    locale={getLocaleDatePicker(language)}
                    showTime={mergedShowTime}
                    defaultValue={item.initialValue}
                    disabled={isDisabled}
                    disabledDate={disabledDate}
                    disabledTime={disabledTime}
                />
            ) : (
                <DatePicker
                    format={format}
                    locale={getLocaleDatePicker(language)}
                    showTime={mergedShowTime}
                    disabled={isDisabled}
                    disabledDate={disabledDate}
                    disabledTime={disabledTime}
                />
            )}
        </Form.Item>
    );
};

DatePickerInput.displayName = 'DatePickerInput';

export default DatePickerInput;
