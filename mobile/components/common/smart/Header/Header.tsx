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
import { Logo, UserSettings } from '@components';
import { Button, Col, Divider, Layout, Row } from 'antd';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useDrawerDispatch } from 'context/DrawerContext';
import useTranslation from 'next-translate/useTranslation';
import React, { FC, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { cookie, LsIsSecured, META_DEFAULTS } from '@helpers';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import Typography from 'antd/lib/typography/Typography';
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
    const { switcher } = useThemeSwitcher();
    const storage = LsIsSecured();

    const [finishSaving, setFinishSaving] = useState(false);

    const dispatchDrawer = useDrawerDispatch();
    const dispatchSettings = useAppDispatch();

    const closeDrawer = useCallback(
        () => dispatchDrawer({ type: 'CLOSE_DRAWER' }),
        [dispatchDrawer]
    );
    const { theme } = useAppState();

    const saveSettings = useCallback(
        () =>
            dispatchSettings({
                type: 'SAVE_SETTINGS'
            }),
        [dispatchSettings]
    );

    const saveUserSettings = async () => {
        saveSettings();
        closeDrawer();
        await setFinishSaving(true);
    };

    useEffect(() => {
        const onfinish = async () => {
            if (finishSaving) {
                switcher({ theme: theme! });
                await setFinishSaving(false);
            }
        };
        onfinish();
    }, [finishSaving]);

    const openUserSettingsDrawer = useCallback(
        () =>
            dispatchDrawer({
                type: 'OPEN_DRAWER',
                title: t('menu:user-settings'),
                cancelButton: false,
                comfirmButton: true,
                comfirmButtonTitle: t('actions:save'),
                content: <UserSettings />,
                onComfirm: () => saveUserSettings()
            }),
        [dispatchDrawer]
    );

    const profileMenuList = [
        {
            key: 'settings',
            title: t('menu:settings'),
            icon: <SettingOutlined />,
            onClick: () => openUserSettingsDrawer()
        }
    ];

    const handleHomeClick = () => {
        storage.removeAll();
    };

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
