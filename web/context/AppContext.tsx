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

const userInfoStr = cookie.get('user') !== undefined ? cookie.get('user') : '{}';
const userInitData = JSON.parse(userInfoStr!);

type State = {
    firstLoad: boolean;
    isSessionMenuCollapsed: boolean;
    finish: boolean;
    user: any;
    permissions: Array<PermissionType> | undefined;
    userSettings: any;
    tempTheme: string | undefined;
    translations: any;
};

const initialState: State = {
    firstLoad: true,
    isSessionMenuCollapsed: menuInitialState,
    finish: false,
    user: userInitData,
    permissions: undefined,
    userSettings: [
        {
            code: 'globalParameters',
            valueJson: { isSettingMenuCollapsed: true, theme: 'light' }
        }
    ],
    tempTheme: undefined,
    translations: []
};

type Action = any;

function reducer(state: State, action: Action) {
    switch (action.type) {
        case 'SWITCH_USER_SETTINGS':
            return {
                ...state,
                userSettings: action.userSettings
            };
        case 'SWITCH_TEMP_THEME':
            return {
                ...state,
                tempTheme: action.tempTheme
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
        case 'SET_TRANSLATIONS':
            return {
                ...state,
                translations: action.translations
            };
        default:
            return state;
    }
}

const saveUserInfo = (user: any) => {
    const tmpUser = JSON.parse(JSON.stringify(user));
    delete tmpUser['userRoles'];
    cookie.set('user', JSON.stringify(tmpUser));
};

const [useAppState, useAppDispatch, AppProvider] = createCtx(initialState, reducer);

export { useAppState, useAppDispatch, AppProvider };
