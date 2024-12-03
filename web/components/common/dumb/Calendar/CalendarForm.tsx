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
import { FC, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import enUS from 'antd/es/locale/en_US';
import frFR from 'antd/es/locale/fr_FR';
import router from 'next/router';
import { ConfigProvider, DatePicker, Form } from 'antd';

export interface ICalendarFormProps {
    label: string;
    name: string;
    hidden?: boolean;
    format?: any;
    key?: any;
    defaultValue: any;
    rules?:
        | any
        | {
              required: boolean;
              message: string;
          };
    showTime?:
        | any
        | {
              defaultValue: any;
          };
}
const locales: any = {
    en: {
        antdLocale: enUS,
        dayjsLocale: 'en'
    },
    fr: {
        antdLocale: frFR,
        dayjsLocale: 'fr'
    }
};

const CalendarForm: FC<ICalendarFormProps> = ({
    label,
    name,
    rules,
    defaultValue,
    format,
    showTime,
    hidden
}) => {
    const [languageDate, setLanguageDate] = useState('en');

    const changeLanguage = (lang: 'en' | 'fr') => {
        setLanguageDate(lang);
        dayjs.locale(locales[lang].dayjsLocale);
    };

    const languageCalendar = () => {
        if (router.locale === 'en-US' || router.locale === 'en') {
            changeLanguage('en');
        } else if (router.locale === 'fr-FR' || router.locale === 'fr') {
            changeLanguage('fr');
        }
    };
    useEffect(() => {
        languageCalendar();
    }, [router.locale]);

    return (
        <ConfigProvider locale={locales[languageDate].antdLocale}>
            <Form.Item
                label={label}
                name={name}
                rules={rules}
                initialValue={dayjs()}
                hidden={hidden}
            >
                <DatePicker
                    allowClear
                    format={format}
                    defaultValue={defaultValue}
                    showTime={showTime}
                />
            </Form.Item>
        </ConfigProvider>
    );
};
export { CalendarForm };
