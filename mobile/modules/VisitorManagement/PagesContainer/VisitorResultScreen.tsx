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

// DESCRIPTION: visitor-entry step 70 - final result (approved / refused). When
// an escort is required the visitor is prominently reminded to wait for it.

import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Button, Result, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { GateButton } from '../../GateEntry/Elements/GateButton';

export interface IVisitorResultScreenProps {
    processName: string;
    onContinue: () => void;
    onContact: () => void;
}

export const VisitorResultScreen = ({
    processName,
    onContinue,
    onContact
}: IVisitorResultScreenProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const storedObject = state[processName] || {};
    const data = storedObject['step70']?.data ?? {};

    const approved = data.decision === 'approved';

    if (approved) {
        return (
            <Result
                status="success"
                title={t('common:visitor-approved-title')}
                subTitle={t('common:visitor-approved-msg')}
                extra={
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {data.escortRequired && (
                            <Alert
                                type="warning"
                                showIcon
                                message={t('common:escort-required-title')}
                                description={t('common:escort-required-msg')}
                                style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}
                            />
                        )}
                        <GateButton
                            style={{ maxWidth: 320, margin: '0 auto' }}
                            onClick={onContinue}
                        >
                            {t('common:continue')}
                        </GateButton>
                    </Space>
                }
            />
        );
    }

    return (
        <Result
            status="error"
            title={t('common:visitor-refused-title')}
            subTitle={
                <Space direction="vertical">
                    {data.denyReason && (
                        <span>{t('common:refused-reason', { reason: data.denyReason })}</span>
                    )}
                    <span>{t('common:visitor-refused-msg')}</span>
                </Space>
            }
            extra={
                <Space direction="vertical" style={{ width: '100%' }}>
                    <GateButton style={{ maxWidth: 320, margin: '0 auto' }} onClick={onContact}>
                        {t('common:contact-security')}
                    </GateButton>
                    <Button type="link" onClick={onContinue}>
                        {t('common:retry')}
                    </Button>
                </Space>
            }
        />
    );
};

VisitorResultScreen.displayName = 'VisitorResultScreen';
