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

import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';

interface TranslationResponse {
    t: (key: string, ...args: any[]) => string;
    lang: string;
    // Add other properties if needed based on your use case
}

// Helper function to map frontend locale codes to database language codes.
// The identity fallback means a newly supported locale needs no entry here.
const mapLocaleToDbLanguage = (locale: string): string => {
    const localeMap: { [key: string]: string } = {
        'en-US': 'en-US',
        'fr-FR': 'fr-FR',
        'de-DE': 'de-DE',
        'es-ES': 'es-ES'
    };
    return localeMap[locale] || locale;
};

// Locale used when the active one has no row for a key. The truck-entry kiosk offers thirteen
// languages while most DB translations exist in four, so without this a Polish driver would see
// raw keys like `common:menu` all over the screen. Falling back to English is strictly better than
// showing the key, and it degrades per key rather than per screen.
//
// NOTE this is the one intentional divergence from web/helpers/utils/TranslationFromDB.ts, which
// the two files otherwise mirror: the wide language list is a mobile-only concern.
const FALLBACK_DB_LANGUAGE = 'en-US';

export function useTranslationWithFallback(keyInfo?: string): TranslationResponse {
    const { t, lang } = useTranslation();

    const { translations } = useAppState();

    const dbLanguage = mapLocaleToDbLanguage(lang);

    const translationFiltered = (key: any) => {
        const parts = key.split(':');
        const category = parts.length === 1 ? keyInfo : parts[0];
        const code = parts.length === 1 ? key : parts[1];
        if (parts.length > 2) return key;

        const lookup = (language: string) =>
            translations.find(
                (translation: any) =>
                    translation.language === language &&
                    translation.category === category &&
                    translation.code === code
            )?.value;

        // active locale -> default locale -> the key itself
        return (
            lookup(dbLanguage) ??
            (dbLanguage === FALLBACK_DB_LANGUAGE ? undefined : lookup(FALLBACK_DB_LANGUAGE)) ??
            key
        );
    };

    return {
        t: (key, ...args) => {
            if (args[0] === undefined) {
                return translationFiltered(key);
            } else {
                return translationFiltered(key)
                    .split(/{{([^}]+)}}/)
                    .filter((part: any) => part)
                    .map((part: any) => {
                        // ?? keeps falsy values like 0 (e.g. "0 of 2 confirmed")
                        return args[0][part] ?? part;
                    })
                    .join('');
            }
        },
        lang
    };
}
