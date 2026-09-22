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

// Tablet sizing only. The two language buttons sit in a grid near the top of the
// screen (like GateEntry/PagesContainer/SelectLanguage.tsx) and are taller, with bigger flags and
// text, so they read from standing height at the reception desk. Behaviour is unchanged. The sizes
// are classes styled by modules/Common/Kiosk/KioskSkin.tsx (kiosk-welcome-*, kiosk-lang-btn) so the
// phone variant can shrink them.

// DESCRIPTION: visitor-entry step 10 - the visitor chooses the kiosk language.
// Only German and English are offered on the visitor tablet.

import { WrapperForm } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Typography } from 'antd';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { GateButton } from '../../GateEntry/Elements/GateButton';

const { Title, Text } = Typography;

export interface ISelectVisitorLanguageProps {
    processName: string;
    stepNumber: number;
}

const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
    { code: 'de-DE', label: 'Deutsch', flag: '/images/de.png' },
    { code: 'en-US', label: 'English', flag: '/images/usa.png' }
];

export const SelectVisitorLanguage = ({ processName, stepNumber }: ISelectVisitorLanguageProps) => {
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
        <WrapperForm style={{ textAlign: 'center', marginTop: 48 }}>
            <Title level={1} className="kiosk-welcome-title">
                {t('common:visitor-welcome-title')}
            </Title>
            <Text type="secondary" className="kiosk-welcome-subtitle">
                {t('common:visitor-welcome-subtitle')}
            </Text>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 24,
                    width: '100%',
                    maxWidth: 680,
                    margin: '0 auto'
                }}
            >
                {LANGUAGES.map((l) => (
                    <GateButton
                        key={l.code}
                        className="kiosk-lang-btn"
                        onClick={() => onSelect(l.code)}
                    >
                        <img
                            src={l.flag}
                            alt={l.label}
                            style={{
                                width: 40,
                                height: 'auto',
                                verticalAlign: 'middle',
                                border: '1px solid rgba(0,0,0,0.15)',
                                borderRadius: 3
                            }}
                        />
                        &nbsp;&nbsp;&nbsp;{l.label}
                    </GateButton>
                ))}
            </div>
        </WrapperForm>
    );
};

SelectVisitorLanguage.displayName = 'SelectVisitorLanguage';
