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
import { Logo } from '@components';
import { Button, Col, Layout, Row } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import React, { FC, useState } from 'react';
import styled from 'styled-components';
import {
    useTranslationWithFallback as useTranslation,
    cookie,
    LsIsSecured,
    META_DEFAULTS,
    decodeJWT,
    showError
} from '@helpers';
import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import Link from 'next/link';
import Text from 'antd/lib/typography/Text';
import { LanguageSelector } from 'components/common/smart/LanguageSelector/LanguageSelector';

const StyledHeader = styled(Layout.Header)`
    padding: 0px 0px 0px 0px !important;
    line-height: 40px !important;
    height: 40px !important;
`;

const StyledCol = styled(Col)`
    height: 40px;
    min-width: 40px;
    padding: 0px 5px 0px 5px;
    border-right: 1px solid;
    border-color: black;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Header: FC = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const storage = LsIsSecured();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [firstValue, setFirstValue] = useState<boolean>(false);
    const state = useAppState();
    const configs = state?.configs;
    const sessionTimeoutNotificationConfig = configs?.find(
        (item: any) => item.scope === 'session_timeout_notification'
    );

    const handleHomeClick = () => {
        storage.removeAll();
    };

    const token = cookie.get('token');
    let interval: any;
    let sessionTimeoutNotification: any;
    let time = sessionTimeoutNotificationConfig
        ? Number(sessionTimeoutNotificationConfig.value) * 60
        : 0;

    if (token && user && !sessionTimeoutNotification && !interval && !firstValue) {
        const user = decodeJWT(token);
        const expirationTime = user.exp * 1000;

        if (time !== 0) {
            sessionTimeoutNotification = setTimeout(
                () => {
                    showError(
                        t('messages:session-timeout-notification', { time: Math.floor(time / 60) }),
                        10
                    );
                },
                expirationTime - Date.now() - time * 1000
            );
        }

        const updateTimer = () => {
            const diff = expirationTime - Date.now();
            if (diff <= 0) {
                clearInterval(interval);
                setTimeLeft(0);
                logout();
            } else {
                setTimeLeft(Math.floor(diff / 1000));
            }
        };
        interval = setInterval(updateTimer, 1000);
        setFirstValue(true);
    }

    return (
        <StyledHeader>
            <Row wrap={false} align="middle" style={{ height: '40px' }}>
                <Link href="/" passHref>
                    <StyledCol onClick={handleHomeClick}>
                        <Logo />
                    </StyledCol>
                </Link>
                <StyledCol flex="auto">
                    <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {META_DEFAULTS.title}
                    </Text>
                </StyledCol>
                {timeLeft !== null && timeLeft > 0 && timeLeft < time && (
                    <StyledCol>
                        <span
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                                showError(
                                    t('messages:session-timeout-notification', {
                                        time: `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                                    })
                                )
                            }
                        >
                            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </span>
                    </StyledCol>
                )}
                <StyledCol>
                    <LanguageSelector />
                </StyledCol>
                <StyledCol>
                    <Button type="text" icon={<LogoutOutlined />} onClick={() => logout()} />
                </StyledCol>
            </Row>
        </StyledHeader>
    );
};

Header.displayName = 'Header';

export { Header };
