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
import { cookie } from 'helpers/utils/utils';
import { createCtx } from './create-context';
import { PermissionType } from 'generated/graphql';

// init from cookies
const userInfoStr = cookie.get('user') !== undefined ? cookie.get('user') : '{}';
const userInitData = JSON.parse(userInfoStr!);

// Define proper interfaces for the state
interface UserSettings {
    code: string;
    valueJson: {
        theme: string;
        [key: string]: any;
    };
    id?: string;
}

interface State {
    finish: boolean;
    userSettings: UserSettings[];
    user: Record<string, any>;
    translations: any[];
    permissions: Array<PermissionType>;
    theme?: string;
    isSessionMenuCollapsed?: boolean;
    isSettingMenuCollapsed?: boolean;
    pickAndPack: Record<string, any>;
    reception: Record<string, any>;
    returnReception: Record<string, any>;
    [key: string]: any;
}

// Define proper types for actions
type ActionTypes =
    | 'SWITCH_USER_SETTINGS'
    | 'SWITCH_THEME'
    | 'SWITCH_MENU_SESSION'
    | 'SWITCH_MENU_SETTING'
    | 'SET_USER_INFO'
    | 'SET_TRANSLATIONS'
    | 'UPDATE_BY_STEP'
    | 'UPDATE_BY_PROCESS'
    | 'DELETE_RF_PROCESS'
    | 'ON_BACK';

interface BaseAction {
    type: ActionTypes;
}

interface UserSettingsAction extends BaseAction {
    type: 'SWITCH_USER_SETTINGS';
    userSettings: UserSettings[];
}

interface ThemeAction extends BaseAction {
    type: 'SWITCH_THEME';
    theme: string;
}

interface MenuSessionAction extends BaseAction {
    type: 'SWITCH_MENU_SESSION';
    isSessionMenuCollapsed: boolean;
}

interface MenuSettingAction extends BaseAction {
    type: 'SWITCH_MENU_SETTING';
    isSettingMenuCollapsed: boolean;
}

interface UserInfoAction extends BaseAction {
    type: 'SET_USER_INFO';
    user: {
        userRoles: Array<{
            role: {
                warehouseId: number | null;
                permissions: PermissionType[];
            };
        }>;
        warehouseId: number;
        [key: string]: any;
    };
}

interface TranslationsAction extends BaseAction {
    type: 'SET_TRANSLATIONS';
    translations: any[];
}

interface UpdateStepAction extends BaseAction {
    type: 'UPDATE_BY_STEP';
    processName: string;
    stepName: string;
    object?: Record<string, any>;
    customFields?: Array<{ key: string; value: any }>;
}

interface UpdateProcessAction extends BaseAction {
    type: 'UPDATE_BY_PROCESS';
    processName: string;
    object: Record<string, any>;
}

interface DeleteProcessAction extends BaseAction {
    type: 'DELETE_RF_PROCESS';
    processName?: string;
}

interface OnBackAction extends BaseAction {
    type: 'ON_BACK';
    processName: string;
    stepToReturn: string;
}

type Action =
    | UserSettingsAction
    | ThemeAction
    | MenuSessionAction
    | MenuSettingAction
    | UserInfoAction
    | TranslationsAction
    | UpdateStepAction
    | UpdateProcessAction
    | DeleteProcessAction
    | OnBackAction;

const initialState: State = {
    finish: false,
    userSettings: [
        {
            code: 'globalParametersMobile',
            valueJson: { theme: 'light' }
        }
    ],
    user: userInitData,
    translations: [],
    permissions: [],
    pickAndPack: {},
    reception: {},
    returnReception: {}
};

function reducer(state: State, action: Action): State {
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
        case 'UPDATE_BY_STEP':
            let newStateByStep = { ...state };
            newStateByStep = {
                ...state,
                [action.processName]: {
                    ...state[action.processName],
                    [action.stepName]:
                        action.object ?? state[action.processName][action.stepName] ?? {}
                }
            };
            if (action?.customFields) {
                action.customFields.forEach((field) => {
                    newStateByStep[action.processName][field.key] = field.value;
                });
            }
            return newStateByStep;
        case 'UPDATE_BY_PROCESS':
            return {
                ...state,
                [action.processName]: {
                    ...action.object
                }
            };
        case 'DELETE_RF_PROCESS':
            let newState = { ...state };
            if (action.processName) {
                newState[action.processName] = {};
            } else {
                newState = {
                    ...newState,
                    pickAndPack: {},
                    reception: {},
                    returnReception: {}
                };
            }
            return newState;
        case 'ON_BACK':
            let newStateOnBack = { ...state };

            const allSteps = Object.keys(newStateOnBack[action.processName]);
            const stepNumber = action.stepToReturn.split('step')[1];

            const allStepToKeep = allSteps
                .map((step) => {
                    if (Number(step.split('step')[1]) <= Number(stepNumber)) {
                        return step;
                    }
                    return null;
                })
                .filter((step) => step !== null) as string[];

            allSteps.forEach((step) => {
                if (!allStepToKeep.includes(step) && step.startsWith('step')) {
                    delete newStateOnBack[action.processName][step];
                }
                if (step === allStepToKeep[allStepToKeep.length - 1]) {
                    if (!newStateOnBack[action.processName][step]?.previousStep) {
                        delete newStateOnBack[action.processName][step];
                    } else {
                        newStateOnBack[action.processName][step] = {
                            previousStep: newStateOnBack[action.processName][step].previousStep
                        };
                    }
                    newStateOnBack[action.processName].currentStep = JSON.parse(
                        step.split('step')[1]
                    );
                }
            });
            return newStateOnBack;
        default:
            return state;
    }
}

const saveUserInfo = (user: Record<string, any>): void => {
    const tmpUser = JSON.parse(JSON.stringify(user));
    delete tmpUser['userRoles'];
    cookie.set('user', JSON.stringify(tmpUser));
};

const [useAppState, useAppDispatch, AppProvider] = createCtx(initialState, reducer);

export { useAppState, useAppDispatch, AppProvider };
