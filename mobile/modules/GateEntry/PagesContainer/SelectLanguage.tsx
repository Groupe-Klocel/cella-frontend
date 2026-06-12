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
import { Space, Typography } from 'antd';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { GateButton } from '../Elements/GateButton';

const { Title, Text } = Typography;

export interface ISelectLanguageProps {
    processName: string;
    stepNumber: number;
}

const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
    { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
    { code: 'en-US', label: 'English', flag: '🇬🇧' },
    { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' }
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
        <WrapperForm style={{ textAlign: 'center', marginTop: '15%' }}>
            <Title level={2}>{t('common:welcome-title')}</Title>
            <Text type="secondary" style={{ fontSize: 18, display: 'block', marginBottom: 32 }}>
                {t('common:welcome-subtitle')}
            </Text>
            <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 360 }}>
                {LANGUAGES.map((l) => (
                    <GateButton key={l.code} onClick={() => onSelect(l.code)}>
                        {l.flag}&nbsp;&nbsp;{l.label}
                    </GateButton>
                ))}
            </Space>
        </WrapperForm>
    );
};

SelectLanguage.displayName = 'SelectLanguage';
