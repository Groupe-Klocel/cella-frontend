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
import { Spin } from 'antd';
import { useAppState } from 'context/AppContext';
import { FC } from 'react';

const ScreenSpin: FC = () => {
    const { userSettings, tempTheme } = useAppState();

    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });

    const theme = tempTheme ?? generalUserSettings?.valueJson?.theme;
    const isDarkTheme = theme !== 'light';
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                position: 'absolute',
                backgroundColor: isDarkTheme ? '#303030' : '#fff'
            }}
        >
            {' '}
            {/* Div because this component is render server side wich sends an error if we use styleDiv from ant design */}
            <Spin />
        </div>
    );
};

ScreenSpin.displayName = 'ScreenSpin';

export { ScreenSpin };
