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
import { AppContent, DrawerItems, Header, ProtectRoute, ScreenSpin, SideMenu } from '@components';
import { Layout } from 'antd';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { DrawerProvider } from 'context/DrawerContext';
import { FC, ReactNode, useCallback, useEffect } from 'react';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import styled from 'styled-components';

const StyledMainLayout = styled(Layout)`
    height: 100vh;
`;

export interface IMainLayoutProps {
    children?: ReactNode;
}

const MainLayout: FC<IMainLayoutProps> = ({ children }: IMainLayoutProps) => {
    // get from app context
    const { userSettings } = useAppState();
    const { status } = useThemeSwitcher();
    const dispatchUserSettings = useAppDispatch();

    const isSettingMenuCollapsed = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    })?.valueJson?.isSettingMenuCollapsed;

    const switchMenuSetting = useCallback(
        (newMenuSetting: boolean) =>
            dispatchUserSettings({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: userSettings.map((item: any) => {
                    if ('globalParameters' === item.code) {
                        return {
                            ...item,
                            valueJson: {
                                ...item.valueJson,
                                isSettingMenuCollapsed: newMenuSetting
                            }
                        };
                    }
                    return item;
                })
            }),
        [dispatchUserSettings, userSettings]
    );


    if (status !== 'loaded') {
        return <ScreenSpin />;
    }

    return (
        <ProtectRoute>
            <StyledMainLayout>
                <DrawerProvider>
                    <Header />
                    <StyledMainLayout>
                        <Layout.Sider
                            width={250}
                            collapsible
                            collapsed={isSettingMenuCollapsed}
                            onCollapse={() => switchMenuSetting(!isSettingMenuCollapsed)}
                            className="scrollbar"
                        >
                            <SideMenu />
                        </Layout.Sider>
                        <AppContent>{children}</AppContent>
                    </StyledMainLayout>
                    <DrawerItems />
                </DrawerProvider>
            </StyledMainLayout>
        </ProtectRoute>
    );
};

export const getLayout = (page: any) => <MainLayout>{page}</MainLayout>;

export default MainLayout;
