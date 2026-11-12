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
import { ExportOutlined, MenuOutlined, SettingOutlined } from '@ant-design/icons';
import { DrawerItems, ProfileMenu, UserSettings } from '@components';
import { Button, Col, Layout, Row, Space } from 'antd';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    useTranslationWithFallback as useTranslation,
    decodeJWT,
    showError,
    cookie,
    getEnvironmentLabel
} from '@helpers';
import { useSeason } from 'components/layouts/SeasonProvider';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import Link from 'next/link';
import { gql } from 'graphql-request';
import { SeasonDecorLayers, SeasonLeftExtras, SeasonLogo } from './SeasonDecor';

const StyledHeader = styled(Layout.Header)`
    padding: 3px 10px 3px 10px;
    line-height: 50px;
    height: 59px;

    @media (max-width: 991px) {
        padding: 0px 8px;
    }

    /* the avatar and the user's name keep their width and their line: on a narrow screen the
       left side gives way — the season's greeting goes first (styles/seasons.css), the user's
       name on the narrowest phones */
    .ssn-controls {
        flex: 0 0 auto;
        white-space: nowrap;
    }

    @media (max-width: 359px) {
        .profile-username {
            display: none;
        }
    }
`;

const StyledCol = styled(Col)`
    min-width: 0;
    padding: 0px 5px 0px 5px;
`;

// the left side of the bar: what does not fit is clipped (sideways only: the logo's seasonal
// accessory stands above the bar's line)
const LeftCol = styled(StyledCol)`
    overflow-x: clip;
`;

export interface IHeaderProps {
    showMenuButton?: boolean;
    onMenuButtonClick?: () => void;
}

const Header: FC<IHeaderProps> = ({ showMenuButton = false, onMenuButtonClick }: IHeaderProps) => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { switcher } = useThemeSwitcher();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [firstValue, setFirstValue] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const { interval, logoutTimeout } = state;
    const dispatchHeader = useAppDispatch();
    const configs = state?.configs;
    const sessionTimeoutNotificationConfig = configs?.find(
        (item: any) => item.scope === 'session_timeout_notification'
    );

    const { userSettings, user: userInfo, tempTheme } = useAppState();
    const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);

    // seasonal decorations (helpers/utils/season.ts; AppLayout mounts the SeasonProvider) —
    // data-season* attributes on the header, the scene's layers, the logo's accessory; the
    // greeting comes from the DB translations and shows only once its row exists (the raw key
    // would show otherwise)
    const { theme: seasonTheme } = useSeason();
    const greetingKey = seasonTheme ? `common:season-greeting-${seasonTheme.season}` : '';
    const greetingLabel = greetingKey ? t(greetingKey) : '';
    const seasonGreeting = greetingLabel !== greetingKey ? greetingLabel : '';

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
                theme: tempThemeRef.current ?? generalUserSettingsRef.current?.valueJson?.theme,
                seasonalDecorations: generalUserSettingsRef.current?.valueJson?.seasonalDecorations
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
            theme: (tempThemeRef.current ??
                generalUserSettingsRef.current?.valueJson?.theme) as string
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
        },
        {
            key: 'logout',
            title: t('menu:logout'),
            icon: <ExportOutlined />,
            onClick: () => logout()
        }
    ];

    const token = cookie.get('token');
    const delayNotificationBeforeLogout = sessionTimeoutNotificationConfig
        ? Number(sessionTimeoutNotificationConfig.value) * 60
        : 0;

    if (token && user && !interval && !firstValue) {
        const user = decodeJWT(token);
        const tokenExpirationTime = user.exp * 1000;
        const logoutWarningDelay =
            tokenExpirationTime - Date.now() - delayNotificationBeforeLogout * 1000;
        console.log('Session timeout notification will be shown in:', logoutWarningDelay, 'ms');

        const updateTimer = () => {
            const diff = tokenExpirationTime - Date.now();
            console.log('🚀 ~ updateTimer ~ diff:', diff);
            if (diff <= 0) {
                if (state.interval) {
                    clearInterval(state.interval);
                    dispatchHeader({ type: 'SET_INTERVAL', interval: null });
                }
                if (state.logoutTimeout) {
                    clearTimeout(state.logoutTimeout);
                    dispatchHeader({ type: 'SET_LOGOUT_TIMEOUT', timeout: null });
                }
                setTimeLeft(0);
                logout();
            } else {
                setTimeLeft(Math.floor(diff / 1000));
            }
        };

        // Ajouter une validation pour éviter les délais aberrants
        if (
            delayNotificationBeforeLogout > 0 &&
            logoutWarningDelay > 0 &&
            logoutWarningDelay < 86400000
        ) {
            // Maximum 24 heures (86400000 ms)

            if (state.logoutTimeout) {
                clearTimeout(state.logoutTimeout);
                dispatchHeader({ type: 'SET_LOGOUT_TIMEOUT', timeout: null });
            }

            const timeout = setTimeout(() => {
                showError(
                    t('messages:session-timeout-notification', {
                        time: Math.floor(delayNotificationBeforeLogout / 60)
                    }),
                    10
                );
                const newInterval = setInterval(updateTimer, 1000);
                dispatchHeader({ type: 'SET_INTERVAL', interval: newInterval });
            }, logoutWarningDelay);

            dispatchHeader({ type: 'SET_LOGOUT_TIMEOUT', timeout });
        } else {
            console.log('Délai trop grand pas de notification configurée:', {
                delayNotificationBeforeLogout,
                logoutWarningDelay
            });
        }

        setFirstValue(true);
    }
    return (
        <StyledHeader data-season={seasonTheme?.season} data-season-tone={seasonTheme?.tone}>
            <DrawerItems {...drawerProps()} />
            {seasonTheme && <SeasonDecorLayers theme={seasonTheme} />}
            <Row wrap={false} align="middle" justify="space-between">
                <LeftCol flex="1 1 auto">
                    <Space size="small" align="center">
                        {showMenuButton && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                onClick={() => onMenuButtonClick?.()}
                                aria-label="Open navigation menu"
                            />
                        )}
                        <Link href="/" passHref>
                            <SeasonLogo theme={seasonTheme} />
                        </Link>
                        {(() => {
                            const envLabel = getEnvironmentLabel();
                            return envLabel ? (
                                <span
                                    style={{
                                        background:
                                            envLabel === 'DEV'
                                                ? '#f5222d'
                                                : envLabel === 'STAGING'
                                                  ? '#fa8c16'
                                                  : '#722ed1',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        lineHeight: 'normal'
                                    }}
                                >
                                    {envLabel}
                                </span>
                            ) : null;
                        })()}
                        {seasonTheme && (
                            <SeasonLeftExtras theme={seasonTheme} greeting={seasonGreeting} />
                        )}
                    </Space>
                </LeftCol>
                <StyledCol
                    flex="0 0 auto"
                    style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
                >
                    {/* ssn-controls: on a frosted plate over a seasonal scene (styles/seasons.css) */}
                    <Space size="middle" align="center" className="ssn-controls">
                        {timeLeft !== null &&
                            timeLeft > 0 &&
                            timeLeft < delayNotificationBeforeLogout && (
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
                                    {Math.floor(timeLeft / 60)}:
                                    {String(timeLeft % 60).padStart(2, '0')}
                                </span>
                            )}
                        <ProfileMenu username={user.username} profileMenu={profileMenuList} />
                    </Space>
                </StyledCol>
            </Row>
        </StyledHeader>
    );
};

Header.displayName = 'Header';

export { Header };
