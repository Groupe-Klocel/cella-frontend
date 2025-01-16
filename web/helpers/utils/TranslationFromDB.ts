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

export function useTranslationWithFallback(keyInfo?: string): TranslationResponse {
    const { t, lang } = useTranslation();

    const { translations } = useAppState();

    const translationFiltered = (key: any) => {
        return (
            translations.find(
                (translation: any) =>
                    translation.language === (lang === 'fr' ? 'fr-FR' : lang) &&
                    translation.category === key.split(':')[0] &&
                    translation.code === key.split(':')[1]
            )?.value ?? key
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
                        return args[0][part] || part;
                    })
                    .join('');
            }
        },
        lang
    };
}
