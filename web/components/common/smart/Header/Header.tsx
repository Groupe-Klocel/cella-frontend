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
import { SettingOutlined } from '@ant-design/icons';
import { DrawerItems, Logo, ProfileMenu, UserSettings } from '@components';
import { Col, Layout, Row } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    useTranslationWithFallback as useTranslation,
    decodeJWT,
    showError,
    cookie
} from '@helpers';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import Link from 'next/link';
import { gql } from 'graphql-request';

const StyledHeader = styled(Layout.Header)`
    padding: 0px 10px 0px 10px;
    line-height: 50px;
    height: 53px;
`;

const StyledCol = styled(Col)`
    max-height: 50px;
    padding: 0px 5px 0px 5px;
`;

const Header: FC = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { switcher } = useThemeSwitcher();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [firstValue, setFirstValue] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const configs = state?.configs;
    const sessionTimeoutNotificationConfig = configs?.find(
        (item: any) => item.scope === 'session_timeout_notification'
    );

    const { userSettings, user: userInfo, tempTheme } = useAppState();
    const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);

    const generalUserSettingsRef = useRef<any>(null);
    const tempThemeRef = useRef<any>(null);

    useEffect(() => {
        generalUserSettingsRef.current = userSettings?.find((item: any) => {
            return 'globalParameters' === item.code;
        });
        tempThemeRef.current = tempTheme;
    }, [userSettings, tempTheme]);

    const createUsersSettings = useCallback(async () => {
        const newsSettings = {
            code: 'globalParameters',
            warehouseWorkerId: userInfo.id,
            valueJson: {
                lang: generalUserSettingsRef.current?.valueJson?.lang,
                isSettingMenuCollapsed:
                    generalUserSettingsRef.current?.valueJson?.isSettingMenuCollapsed,
                theme: tempThemeRef.current ?? generalUserSettingsRef.current?.valueJson?.theme
            }
        };
        const createQuery = gql`
            mutation ($input: CreateWarehouseWorkerSettingInput!) {
                createWarehouseWorkerSetting(input: $input) {
                    id
                    code
                    valueJson
                }
            }
        `;
        await graphqlRequestClient.request(createQuery, {
            input: newsSettings
        });
    }, [graphqlRequestClient, userInfo]);

    const updateUsersSettings = useCallback(async () => {
        const newsSettings = {
            ...generalUserSettingsRef.current,
            valueJson: {
                ...generalUserSettingsRef.current?.valueJson,
                lang: generalUserSettingsRef.current?.valueJson?.lang,
                isSettingMenuCollapsed:
                    generalUserSettingsRef.current?.valueJson?.isSettingMenuCollapsed,
                theme: tempThemeRef.current ?? generalUserSettingsRef.current?.valueJson?.theme
            }
        };
        const updateQuery = gql`
            mutation ($id: String!, $input: UpdateWarehouseWorkerSettingInput!) {
                updateWarehouseWorkerSetting(id: $id, input: $input) {
                    id
                    code
                    valueJson
                }
            }
        `;
        await graphqlRequestClient.request(updateQuery, {
            id: generalUserSettingsRef.current?.id,
            input: { valueJson: newsSettings.valueJson }
        });
    }, [graphqlRequestClient]);

    const saveSettings = useCallback(() => {
        if (generalUserSettingsRef.current?.id) {
            updateUsersSettings();
        } else {
            createUsersSettings();
        }
    }, [updateUsersSettings, createUsersSettings]);

    const saveUserSettings = async () => {
        saveSettings();
        setIsSearchDrawerOpen(false);
        switcher({
            theme: tempThemeRef.current ?? generalUserSettingsRef.current?.valueJson?.theme!
        });
    };

    function drawerProps() {
        return {
            type: 'OPEN_DRAWER',
            isOpen: isSearchDrawerOpen,
            setIsOpen: setIsSearchDrawerOpen,
            title: 'menu:user-settings',
            cancelButton: false,
            comfirmButton: true,
            comfirmButtonTitle: 'actions:save',
            content: <UserSettings />,
            onComfirm: () => saveUserSettings()
        };
    }

    const profileMenuList = [
        {
            key: 'settings',
            title: t('menu:settings'),
            icon: <SettingOutlined />,
            onClick: () => setIsSearchDrawerOpen(true)
        }
    ];

    const token = cookie.get('token');
    let interval: any;
    let sessionTimeoutNotification: any;
    let time = sessionTimeoutNotificationConfig
        ? Number(sessionTimeoutNotificationConfig.value) * 60
        : 0;

    if (token && user && !sessionTimeoutNotification && !interval && !firstValue) {
        const user = decodeJWT(token);
        const expirationTime = user.exp * 1000;
        const delay = expirationTime - Date.now() - time * 1000;
        console.log('Session timeout notification will be shown in:', delay, 'ms');

        if (delay > 0 && !sessionTimeoutNotification && time > 0) {
            sessionTimeoutNotification = setTimeout(() => {
                showError(
                    t('messages:session-timeout-notification', { time: Math.floor(time / 60) }),
                    10
                );
            }, delay);
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
            <DrawerItems {...drawerProps()} />
            <Row wrap={false} align="middle">
                <StyledCol flex="10vw">
                    <Link href="/" passHref>
                        <Logo width={45} />
                    </Link>
                </StyledCol>
                <StyledCol flex="0 1 auto">
                    {timeLeft !== null && timeLeft > 0 && timeLeft < time && (
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
                    )}
                </StyledCol>
                <StyledCol flex="0 1 auto">
                    <ProfileMenu username={user.username} profileMenu={profileMenuList} />
                </StyledCol>
            </Row>
        </StyledHeader>
    );
};

Header.displayName = 'Header';

export { Header };
