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
import { AppContent, Header, ProtectRoute, ScreenSpin, SideMenu } from '@components';
import { Drawer, Grid, Layout } from 'antd';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { DrawerProvider } from 'context/DrawerContext';
import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const StyledMainLayout = styled(Layout)`
    height: 100vh;
    min-height: 0;
`;

const StyledBodyLayout = styled(Layout)`
    min-height: 0;
`;

const ResponsiveMenuDrawer = styled(Drawer)`
    .ant-drawer-header {
        background-color: #001529;
        border-bottom-color: rgba(255, 255, 255, 0.2);
    }

    .ant-drawer-close {
        color: #ffffff;
    }

    .ant-drawer-body {
        padding: 0;
        background-color: #001529;
    }
`;

export interface IMainLayoutProps {
    children?: ReactNode;
}

const MainLayout: FC<IMainLayoutProps> = ({ children }: IMainLayoutProps) => {
    // get from app context
    const { userSettings } = useAppState();
    const { status } = useThemeSwitcher();
    const dispatchUserSettings = useAppDispatch();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const [isResponsiveMenuOpen, setIsResponsiveMenuOpen] = useState<boolean>(false);
    const safeUserSettings = userSettings ?? [];

    const isSettingMenuCollapsed =
        safeUserSettings.find((item: any) => {
            return 'globalParameters' === item.code;
        })?.valueJson?.isSettingMenuCollapsed ?? false;
    const isCompactDesktop = screens.xl === false;

    useEffect(() => {
        setIsResponsiveMenuOpen(false);
    }, [router.asPath]);

    useEffect(() => {
        if (!isCompactDesktop) {
            setIsResponsiveMenuOpen(false);
        }
    }, [isCompactDesktop]);

    const switchMenuSetting = useCallback(
        (newMenuSetting: boolean) =>
            dispatchUserSettings({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: safeUserSettings.map((item: any) => {
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
        [dispatchUserSettings, safeUserSettings]
    );

    const openResponsiveMenu = useCallback(() => {
        setIsResponsiveMenuOpen(true);
    }, []);

    const closeResponsiveMenu = useCallback(() => {
        setIsResponsiveMenuOpen(false);
    }, []);

    if (status !== 'loaded') {
        return <ScreenSpin />;
    }

    return (
        <ProtectRoute>
            <StyledMainLayout>
                <DrawerProvider>
                    <Header
                        showMenuButton={isCompactDesktop}
                        onMenuButtonClick={openResponsiveMenu}
                    />
                    <StyledBodyLayout>
                        {!isCompactDesktop && (
                            <Layout.Sider
                                width={250}
                                collapsible
                                collapsed={isSettingMenuCollapsed}
                                onCollapse={switchMenuSetting}
                                className="scrollbar"
                            >
                                <SideMenu />
                            </Layout.Sider>
                        )}
                        <AppContent>{children}</AppContent>
                    </StyledBodyLayout>
                    <ResponsiveMenuDrawer
                        placement="left"
                        width={280}
                        onClose={closeResponsiveMenu}
                        open={isCompactDesktop && isResponsiveMenuOpen}
                    >
                        <div className="scrollbar" style={{ height: '100%' }}>
                            <SideMenu />
                        </div>
                    </ResponsiveMenuDrawer>
                </DrawerProvider>
            </StyledMainLayout>
        </ProtectRoute>
    );
};

export const getLayout = (page: any) => <MainLayout>{page}</MainLayout>;

export default MainLayout;
