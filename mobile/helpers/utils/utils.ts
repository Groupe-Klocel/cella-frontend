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
import { LanguageType } from '@helpers';
import Cookies from 'js-cookie';
import { isoLangs } from './constant';
import { message } from 'antd';
import SecureLS from 'secure-ls';
import { IS_LS_SECURED } from '@helpers';

export const cookie = Cookies.withAttributes({ path: '/', secure: true, sameSite: 'strict' });

// description et autre
function getLanguageNameFromISOCode(ISOCode: string): LanguageType | undefined {
    const languageName: LanguageType | undefined = isoLangs.find((lang) => {
        return lang.code === ISOCode;
    });
    return languageName;
}

// Get an array of keys from array object
function getKeys(data: Array<any>): React.Key[] {
    const keys = data.map(({ key }) => key);
    return keys;
}

// Set index to each object in an array
function setIndex(array: Array<any>): Array<any> {
    const arrayWithIndex = array.map((object: Object) => ({
        ...object,
        index: array.indexOf(object)
    }));
    return arrayWithIndex;
}

// add key pair value to each object in an array
function addKeyValueToArrayObject(array: Array<any>, key: string, value: any): Array<any> {
    const newarray = array.map((object: Object) => addKeyValueToObject(object, key, value));
    return newarray;
}
// add key pair value to an object
function addKeyValueToObject(object: Object, key: string, value: any): Object {
    return Object.defineProperty(object, key, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    });
}

function setCustomColumnsProps(columnsToInitialize: any): any {
    let temp = setIndex(columnsToInitialize);
    temp = temp.map((object) => {
        if (
            object.index === 0 ||
            object.index === 1 ||
            object.index === columnsToInitialize.length - 1 ||
            object.index === columnsToInitialize.length - 2
        ) {
            return addKeyValueToObject(object, 'disabled', false);
        } else return addKeyValueToObject(object, 'disabled', true);
    });
    const finalColumns = addKeyValueToArrayObject(temp, 'fixed', false);
    return finalColumns;
}

// Check if value is inside a list
function isVisible(value: React.Key, list: Array<any>) {
    return list.includes(value);
}

const isServer = () => typeof window === 'undefined';

// need to set Domain for safety

function stringToBoolean(string: String | undefined) {
    switch (string?.toLowerCase()) {
        case 'false':
        case 'no':
        case '0':
        case '':
            return false;
        default:
            return true;
    }
}

function isCookieSet(cookieName: string) {
    switch (cookie.get(cookieName)) {
        case 'undefined':
        case '':
            return false;
        default:
            return true;
    }
}

function getDefaultTheme() {
    switch (cookie.get('theme')) {
        case 'dark':
            return 'dark';
        default:
            return 'light';
    }
}

// handle mismatch when menu is open by the user but not set as default and user settings menu is set to true
function getMenuState(isSettingMenuCollapsed: Boolean) {
    let menuState;
    if (
        isSettingMenuCollapsed === false &&
        stringToBoolean(cookie.get('isSettingMenuCollapsed')) === true
    ) {
        menuState = false;
    } else if (
        isSettingMenuCollapsed === true &&
        stringToBoolean(cookie.get('isSettingMenuCollapsed')) === false
    ) {
        menuState = !isSettingMenuCollapsed;
    } else {
        menuState = !isSettingMenuCollapsed;
    }

    return menuState;
}

function isEmpty(object: Object) {
    for (const property in object) {
        return false;
    }
    return true;
}

function decodeJWT(token: String) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
    );

    return JSON.parse(jsonPayload);
}

const showSuccess = (messageText: string) => {
    message.success(messageText);
};

const showInfo = (messageText: string) => {
    message.info(messageText);
};

const showError = (messageText: string) => {
    message.error(messageText);
};

const showWarning = (messageText: string) => {
    message.warning(messageText);
};

const pathParams = (pathname: string, id: string) => {
    return { pathname: pathname, query: { id: id } };
};

const checkKeyPresenceInArray = (key: any, array: any[]) =>
    array.filter((o) => o.hasOwnProperty(key));

const LsIsSecured = () => {
    let ls: any = new SecureLS({ encodingType: 'aes' });
    if (!IS_LS_SECURED) {
        ls = new SecureLS({ encodingType: '', isCompression: false });
    }
    return ls;
};

function generateStandardNumber(prefix: string, counter: number, totalLength = 10): string {
    const prefixLength = prefix.length;
    const zerosLength = totalLength - prefixLength - counter.toString().length;
    const zeros = '0'.repeat(zerosLength);
    return `${prefix}${zeros}${counter}`;
}

function removeDuplicatesAndSort(arr: any[]) {
    return Array.from(new Set(arr)).sort();
}

function extractGivenConfigsParams(
    json: Object,
    scope: string,
    options: {
        include?: string[];
        exclude?: string[];
        min?: number;
        max?: number;
    } = {}
): number[] {
    const values: number[] = [];
    for (const key in json) {
        if (key.startsWith(scope.toUpperCase())) {
            if (
                (options.include &&
                    options.include.some((value) => key.endsWith(value.toUpperCase()))) ||
                (options.exclude &&
                    options.exclude.some((value) => key.endsWith(value.toUpperCase()))) ||
                (options.min !== undefined &&
                    (json as { [key: string]: number })[key] <= options.min) ||
                (options.max !== undefined &&
                    (json as { [key: string]: number })[key] >= options.max)
            ) {
                continue;
            }
            values.push((json as { [key: string]: number })[key]);
        }
    }
    return values;
}

export {
    isEmpty,
    pathParams,
    setCustomColumnsProps,
    checkKeyPresenceInArray,
    setIndex,
    addKeyValueToArrayObject,
    addKeyValueToObject,
    showSuccess,
    showWarning,
    showInfo,
    showError,
    decodeJWT,
    getMenuState,
    getDefaultTheme,
    isCookieSet,
    stringToBoolean,
    isServer,
    isVisible,
    generateStandardNumber,
    getLanguageNameFromISOCode,
    getKeys,
    LsIsSecured,
    removeDuplicatesAndSort,
    extractGivenConfigsParams
};
