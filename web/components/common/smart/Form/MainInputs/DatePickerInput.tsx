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
import { FC } from 'react';

// return (
//     <Form.Item
//         name={item.name}
//         label={item.displayName ? item.displayName : t(`d:${item.name}`)}
//         key={item.name}
//         rules={item.rules!}
//         normalize={(value) => (value ? value : undefined)}
//         initialValue={item?.initialValue ? dayjs(item?.initialValue) : undefined}
//     >
//         <DatePicker
//             format={localeDateTimeFormat}
//             locale={router.locale === 'fr' ? fr_FR : en_US}
//             showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
//             allowClear
//         />
//     </Form.Item>
// );

{
    /* <Form.Item
    name={item.name}
    label={item.displayName ? item.displayName : t(`d:${item.name}`)}
    key={item.name}
    rules={item.rules!}
>
    {item.initialValue ? (
        <DatePicker
            format={localeDateTimeFormat}
            locale={router.locale === 'fr' ? fr_FR : en_US}
            showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
            defaultValue={item.initialValue}
        />
    ) : (
        <DatePicker
            format={localeDateTimeFormat}
            locale={router.locale === 'fr' ? fr_FR : en_US}
            showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
        />
    )}
</Form.Item>; */
}

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
}

const DatePickerInput: FC<IDraggerDatePickerInputProps> = ({ item, format }) => {
    const { t } = useTranslation();

    const router = useRouter();
    moment.locale(router.locale);

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
                    locale={router.locale === 'fr' ? fr_FR : en_US}
                    showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                    defaultValue={item.initialValue}
                />
            ) : (
                <DatePicker
                    format={format}
                    locale={router.locale === 'fr' ? fr_FR : en_US}
                    showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                />
            )}
        </Form.Item>
    );
};

DatePickerInput.displayName = 'DatePickerInput';

export default DatePickerInput;
