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

// DESCRIPTION: gate-entry step 10 - the driver chooses the kiosk language.

import { WrapperForm } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Typography } from 'antd';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { GateButton } from '../Elements/GateButton';

const { Title, Text } = Typography;

export interface ISelectLanguageProps {
    processName: string;
    stepNumber: number;
}

// The kiosk language list is deliberately LOCAL to this step and much wider than the rest of the
// app: drivers come from all over Europe, while the back-office UI stays at four languages. Adding
// a language here must NOT touch `isoLangs` (helpers/utils/constant.ts), which drives the global
// header selector on every RF screen.
//
// Every code must also be declared in mobile/i18n.json, because `onSelect` switches the
// next-translate router locale and Next.js rejects an unknown one.
const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
    { code: 'en-US', label: 'English', flag: '/images/usa.png' },
    { code: 'de-DE', label: 'Deutsch', flag: '/images/de.png' },
    { code: 'fr-FR', label: 'Français', flag: '/images/fr.png' },
    { code: 'es-ES', label: 'Español', flag: '/images/es.png' },
    { code: 'pl-PL', label: 'Polski', flag: '/images/flags/pl.svg' },
    { code: 'ro-RO', label: 'Română', flag: '/images/flags/ro.svg' },
    { code: 'tr-TR', label: 'Türkçe', flag: '/images/flags/tr.svg' },
    { code: 'lt-LT', label: 'Lietuvių', flag: '/images/flags/lt.svg' },
    { code: 'bg-BG', label: 'Български', flag: '/images/flags/bg.svg' },
    { code: 'hu-HU', label: 'Magyar', flag: '/images/flags/hu.svg' },
    { code: 'ru-RU', label: 'Русский', flag: '/images/flags/ru.svg' },
    { code: 'uk-UA', label: 'Українська', flag: '/images/flags/ua.svg' },
    { code: 'bs-BA', label: 'Bosanski', flag: '/images/flags/ba.svg' }
];

export const SelectLanguage = ({ processName, stepNumber }: ISelectLanguageProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const state = useAppState();
    const storedObject = state[processName] || {};

    const onSelect = (lang: string) => {
        // Switch the whole app language (next-translate locale routing), then
        // advance to the search step. AppContext state survives the transition.
        if (lang !== router.locale) {
            router.push(router.asPath, router.asPath, { locale: lang });
        }
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { previousStep: storedObject.currentStep ?? 0, data: { lang } },
            customFields: [{ key: 'currentStep', value: 20 }]
        });
    };

    return (
        <WrapperForm style={{ textAlign: 'center', marginTop: 16 }}>
            <Title level={2} style={{ marginBottom: 4 }}>
                {t('common:welcome-title')}
            </Title>
            <Text type="secondary" style={{ fontSize: 18, display: 'block', marginBottom: 16 }}>
                {t('common:welcome-subtitle')}
            </Text>
            {/* This step runs on a wall-mounted tablet, so the whole block sits near the top of the
                screen and the languages are laid out three per row: thirteen buttons then take five
                rows and every language is visible at once, without scrolling, in portrait or
                landscape. `auto-fit` keeps it usable if the kiosk is ever a narrow handheld — the
                grid drops to two columns rather than squeezing three. */}
            <div
                style={{
                    display: 'grid',
                    // 170px track + 12px gap against a 680px cap => a 4th column can never fit
                    // (4x170+36=716 > 680), so a tablet always lands on exactly three per row,
                    // while a narrow handheld still gets two instead of one.
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: 12,
                    width: '100%',
                    maxWidth: 680,
                    margin: '0 auto'
                }}
            >
                {LANGUAGES.map((l) => (
                    <GateButton key={l.code} onClick={() => onSelect(l.code)}>
                        <img
                            src={l.flag}
                            alt={l.label}
                            style={{
                                width: 22,
                                height: 'auto',
                                verticalAlign: 'middle',
                                border: '1px solid rgba(0,0,0,0.15)'
                            }}
                        />
                        &nbsp;&nbsp;{l.label}
                    </GateButton>
                ))}
            </div>
        </WrapperForm>
    );
};

SelectLanguage.displayName = 'SelectLanguage';
