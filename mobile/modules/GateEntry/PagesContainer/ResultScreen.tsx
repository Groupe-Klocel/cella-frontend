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

// DESCRIPTION: gate-entry step 70 - final result. Four outcomes: approved (proceed to the dock),
// waiting (park in the waiting area, keep the pager), documents (entry deferred until the
// paperwork is attached) and refused.

import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Button, Result, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { GateButton } from '../Elements/GateButton';

export interface IResultScreenProps {
    processName: string;
    onContinue: () => void;
    onContact: () => void;
}

export const ResultScreen = ({ processName, onContinue, onContact }: IResultScreenProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const storedObject = state[processName] || {};
    const data = storedObject['step70']?.data ?? {};

    const approved = data.decision === 'approved';

    // Parked in the waiting area: the pager number is the one thing the driver must carry away,
    // so it is the whole message. The "proceed to dock X" call comes later, physically via the
    // pager — the driver has already left the kiosk by then.
    if (data.decision === 'waiting') {
        return (
            <Result
                status="info"
                icon={<ClockCircleOutlined />}
                title={t('common:parked-title')}
                subTitle={
                    data.pagerNumber
                        ? t('common:parked-pager', { pager: data.pagerNumber })
                        : t('common:parked-msg')
                }
                extra={
                    <GateButton style={{ maxWidth: 320, margin: '0 auto' }} onClick={onContinue}>
                        {t('common:continue')}
                    </GateButton>
                }
            />
        );
    }

    // Entry deferred, not denied: warning rather than error. Retry is genuinely useful here —
    // once someone attaches the documents the appointment returns to Confirmed, which is the only
    // status the search step accepts, so the retry succeeds exactly when it should.
    if (data.decision === 'documents') {
        return (
            <Result
                status="warning"
                title={t('common:documents-required-title')}
                subTitle={
                    <Space direction="vertical">
                        {data.denyReason && (
                            <span>{t('common:refused-reason', { reason: data.denyReason })}</span>
                        )}
                        <span>{t('common:documents-required-msg')}</span>
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
    }

    if (approved) {
        return (
            <Result
                status="success"
                title={t('common:approved-title')}
                subTitle={`${t('common:approved-subtitle', { dock: data.dockName ?? '-' })} ${t('common:welcome-msg')}`}
                extra={
                    <GateButton style={{ maxWidth: 320, margin: '0 auto' }} onClick={onContinue}>
                        {t('common:continue')}
                    </GateButton>
                }
            />
        );
    }

    return (
        <Result
            status="error"
            title={t('common:refused-title')}
            subTitle={
                <Space direction="vertical">
                    {data.denyReason && (
                        <span>{t('common:refused-reason', { reason: data.denyReason })}</span>
                    )}
                    <span>{t('common:refused-msg')}</span>
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

ResultScreen.displayName = 'ResultScreen';
