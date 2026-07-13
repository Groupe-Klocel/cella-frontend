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

// DESCRIPTION: visitor-entry step 60 - waiting screen while the security desk
// reviews the visit (the page polls the visit status).

import { WrapperForm } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Result, Space, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export interface IVisitorWaitingScreenProps {
    timedOut: boolean;
    onCancel: () => void;
}

export const VisitorWaitingScreen = ({ timedOut, onCancel }: IVisitorWaitingScreenProps) => {
    const { t } = useTranslation();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(id);
    }, []);

    if (timedOut) {
        return (
            <Result
                status="warning"
                title={t('common:timeout-title')}
                subTitle={t('common:timeout-msg')}
                extra={
                    <Button type="primary" size="large" onClick={onCancel}>
                        {t('common:contact-security')}
                    </Button>
                }
            />
        );
    }

    const extraMsg =
        elapsed > 60
            ? t('common:waiting-verylong')
            : elapsed > 30
              ? t('common:waiting-long')
              : t('common:waiting-extra');

    return (
        <WrapperForm style={{ textAlign: 'center', marginTop: '20%' }}>
            <Space direction="vertical" size="large" align="center" style={{ width: '100%' }}>
                <Spin size="large" />
                <Title level={3} style={{ margin: 0 }}>
                    {t('common:waiting-title')}
                </Title>
                <Text type="secondary" style={{ fontSize: 18 }}>
                    {t('common:visitor-waiting-subtitle')}
                </Text>
                <Text type="secondary">{extraMsg}</Text>
                <Button type="text" onClick={onCancel}>
                    {t('common:cancel')}
                </Button>
            </Space>
        </WrapperForm>
    );
};

VisitorWaitingScreen.displayName = 'VisitorWaitingScreen';
