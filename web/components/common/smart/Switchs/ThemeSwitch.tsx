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
import { Switch } from 'antd';
import { FC, useCallback } from 'react';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import { useAppDispatch, useAppState } from 'context/AppContext';

const LightThemeIcon = () => (
    <span role="img" aria-label="light">
        🌔
    </span>
);
const DarkThemeIcon = () => (
    <span role="img" aria-label="dark">
        🌘
    </span>
);

const ThemeSwitch: FC = () => {
    const { themes } = useThemeSwitcher();

    const { theme } = useAppState();

    const dispatchMenu = useAppDispatch();

    const switchTheme = useCallback(
        (isChecked) =>
            dispatchMenu({
                type: 'SWITCH_THEME',
                theme: isChecked ? themes.dark : themes.light
            }),
        [dispatchMenu, theme]
    );

    const toggleTheme = (isChecked: boolean) => {
        switchTheme(isChecked);
    };

    return (
        <Switch
            checked={theme === 'dark' ? true : false}
            onChange={toggleTheme}
            checkedChildren={<LightThemeIcon />}
            unCheckedChildren={<DarkThemeIcon />}
        />
    );
};

ThemeSwitch.displayName = 'ThemeSwitch';

export { ThemeSwitch };
