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
import { Logo, ProfileMenu, UserSettings } from '@components';
import { Col, Layout, Row } from 'antd';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useDrawerDispatch } from 'context/DrawerContext';
import useTranslation from 'next-translate/useTranslation';
import { FC, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useThemeSwitcher } from 'react-css-theme-switcher';

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
    const { user } = useAuth();
    const { switcher } = useThemeSwitcher();

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
                title: 'menu:user-settings',
                cancelButton: false,
                comfirmButton: true,
                comfirmButtonTitle: 'actions:save',
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

    return (
        <StyledHeader>
            <Row wrap={false} align="middle">
                <StyledCol flex="10vw">
                    <Logo width={45} />
                </StyledCol>
                <StyledCol flex="0 1 auto" offset={8}>
                    <ProfileMenu username={user.username} profileMenu={profileMenuList} />
                </StyledCol>
            </Row>
        </StyledHeader>
    );
};

Header.displayName = 'Header';

export { Header };
