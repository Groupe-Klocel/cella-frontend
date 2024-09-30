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
import { stringToBoolean, cookie } from '@helpers';
import { PermissionType } from 'generated/graphql';
import { createCtx } from './create-context';

// init from cookies
const menuInitialState = cookie.get('isSettingMenuCollapsed')
    ? stringToBoolean(cookie.get('isSettingMenuCollapsed'))
    : true;
const themeInitialState = cookie.get('mobile_theme') ? cookie.get('mobile_theme') : 'light';

const userInfoStr = cookie.get('user') !== undefined ? cookie.get('user') : '{}';
const userInitData = JSON.parse(userInfoStr!);

type State = {
    theme: string | undefined;
    isSettingMenuCollapsed: boolean;
    isSessionMenuCollapsed: boolean;
    globalLocale: string;
    finish: boolean;
    user: any;
    permissions: Array<PermissionType> | undefined;
};

const initialState: State = {
    theme: themeInitialState,
    isSettingMenuCollapsed: menuInitialState,
    isSessionMenuCollapsed: menuInitialState,
    globalLocale: 'fr',
    finish: false,
    user: userInitData,
    permissions: undefined
};

type Action = any;

function reducer(state: State, action: Action) {
    switch (action.type) {
        case 'SWITCH_THEME':
            return {
                ...state,
                theme: action.theme
            };
        case 'SWITCH_LOCALE':
            return {
                ...state,
                globalLocale: action.globalLocale
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
        case 'SAVE_SETTINGS':
            saveUserSettings(state.isSettingMenuCollapsed, state.theme!, state.globalLocale);
            return {
                ...state
            };
        case 'SET_USER_INFO': {
            saveUserInfo(action.user);
            const userWithoutRole = JSON.parse(JSON.stringify(action.user));
            delete userWithoutRole['userRoles'];
            const allPermissions: Array<PermissionType> = [];
            action.user.userRoles.forEach((userRole: any) => {
                if (
                    userRole.role.warehouseId == null ||
                    userRole.role.warehouseId == action.user.warehouseId
                ) {
                    allPermissions.push(userRole.role.permissions);
                }
            });
            return {
                ...state,
                user: userWithoutRole,
                permissions: allPermissions.flat()
            };
        }
        default:
            return state;
    }
}

const saveUserSettings = (menu: boolean, theme: string, locale: string) => {
    cookie.set('isSettingMenuCollapsed', menu.toString());
    cookie.set('theme', theme);
    cookie.set('NEXT_LOCALE', locale);
};

const saveUserInfo = (user: any) => {
    const tmpUser = JSON.parse(JSON.stringify(user));
    delete tmpUser['userRoles'];
    cookie.set('user', JSON.stringify(tmpUser));
};

const [useAppState, useAppDispatch, AppProvider] = createCtx(initialState, reducer);

export { useAppState, useAppDispatch, AppProvider };
