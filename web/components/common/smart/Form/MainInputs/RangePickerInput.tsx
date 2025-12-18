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
//     >
//         <RangePicker
//             showTime={{ format: 'HH:mm' }}
//             format={localeDateTimeFormat}
//             locale={router.locale === 'fr' ? fr_FR : en_US}
//             value={[null, null]}
//             allowEmpty={[true, true]}
//             onChange={onChange}
//             onOk={onOk}
//             placeholder={[t('common:start-date'), t('common:end-date')]}
//             allowClear
//             defaultValue={[startDate, endDate]}
//         />
//     </Form.Item>
// );

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

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => (value ? value : undefined)}
            rules={item.rules!}
            initialValue={
                item?.initialValue
                    ? [
                          item.initialValue[0] ? dayjs(item.initialValue[0]) : null,
                          item.initialValue[1] ? dayjs(item.initialValue[1]) : null
                      ]
                    : undefined
            }
        >
            <RangePicker
                showTime={item.showTime}
                format={item.localeDateTimeFormat}
                locale={router.locale === 'fr' ? fr_FR : en_US}
                value={[null, null]}
                allowEmpty={[true, true]}
                placeholder={[t('common:start-date'), t('common:end-date')]}
                allowClear
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
