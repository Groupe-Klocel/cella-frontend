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
import { stringToBoolean } from '@helpers';
import { cookie } from 'helpers/utils/utils';
import { createCtx } from './create-context';

// init from cookies
const userInfoStr = cookie.get('user') !== undefined ? cookie.get('user') : '{}';
const userInitData = JSON.parse(userInfoStr!);

const initialState = {
    finish: false,
    userSettings: [
        {
            code: 'globalParametersMobile',
            valueJson: { lang: 'fr', theme: 'light' }
        }
    ],
    user: userInitData
};

type State = typeof initialState;
type Action = any;

function reducer(state: State, action: Action) {
    switch (action.type) {
        case 'SWITCH_USER_SETTINGS':
            return {
                ...state,
                userSettings: action.userSettings
            };
        case 'SWITCH_THEME':
            return {
                ...state,
                theme: action.theme
            };
        case 'SWITCH_MENU_SESSION':
            return {
                ...state,
                isSessionMenuCollapsed: action.isSessionMenuCollapsed
            };
        case 'SWITCH_MENU_SETTING':
            return {
                ...state,
                isSettingMenuCollapsed: action.isSettingMenuCollapsed,
                isSessionMenuCollapsed: action.isSettingMenuCollapsed
            };
        case 'SET_USER_INFO':
            return {
                ...state,
                user: action.user
            };
        default:
            return state;
    }
}

const [useAppState, useAppDispatch, AppProvider] = createCtx(initialState, reducer);

export { useAppState, useAppDispatch, AppProvider };
