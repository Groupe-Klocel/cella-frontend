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
import moment from 'moment';
import { difference } from 'lodash';

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

const getModesFromPermissions = (permissions: any, tableName: string) => {
    let modes: Array<string> = [];
    if (permissions) {
        permissions
            .filter((p: any) => {
                return p.table.toUpperCase() == tableName.toUpperCase();
            })
            .forEach((p: any) => {
                modes.push(p.mode.toUpperCase());
            });
    }
    return modes;
};

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
    switch (cookie.get('mobile_theme')) {
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
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
    );

    return JSON.parse(jsonPayload);
}

const showSuccess = (messageText: string, duration?: number) => {
    message.success(messageText, duration);
};

const showInfo = (messageText: string, duration?: number) => {
    message.info(messageText, duration);
};

const showError = (messageText: string, duration?: number) => {
    message.error(messageText, duration);
};

const showWarning = (messageText: string, duration?: number) => {
    message.warning(messageText, duration);
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
                    !options.include.some((value) => key.endsWith(value.toUpperCase()))) ||
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

function formatLocaleDateTime(date: any, locale: any) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: timezone
    });
}

function setUTCDateTime(date: string) {
    const dateValue = new Date(date);
    return moment(
        new Date(
            Date.UTC(
                dateValue.getFullYear(),
                dateValue.getMonth(),
                dateValue.getDate(),
                dateValue.getHours(),
                dateValue.getMinutes(),
                dateValue.getSeconds()
            )
        )
    ).format();
}

function formatUTCLocaleDateTime(date: any, locale: any) {
    date = new Date(date);
    const dateUTC = new Date(setUTCDateTime(date));
    return formatLocaleDateTime(dateUTC, locale);
}

const isStringDate = (dateString: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    if (isNaN(Date.parse(dateString))) return false;

    if (!moment(dateString, moment.ISO_8601).isValid()) return false;

    return true;
};

const isStringDateTime = (dateString: string) => {
    const dateTimeZuluRegex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/;
    const dateTimeTRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/;
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}$/;
    const dateTimeOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
    if (
        !dateTimeZuluRegex.test(dateString) &&
        !dateTimeTRegex.test(dateString) &&
        !dateTimeRegex.test(dateString) &&
        !dateTimeOffsetRegex.test(dateString)
    )
        return false;

    if (isNaN(Date.parse(dateString))) return false;

    if (!moment(dateString, moment.ISO_8601).isValid()) return false;
    return true;
};

function setUTCDate(date: string) {
    const dateValue = new Date(date);
    return moment(
        new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()))
    ).format();
}

function formatLocaleDate(date: any, locale: any) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString(locale, {
        dateStyle: 'short',
        timeZone: timezone
    });
}

function formatUTCLocaleDate(date: any, locale: any) {
    date = new Date(date);
    const dateUTC = new Date(setUTCDate(date));
    return formatLocaleDate(dateUTC, locale);
}

function getDatesDifference(date1: any, date2: any, type: any = 'months') {
    const diff = moment(date1).diff(date2, type, true);
    return diff;
}

function isNonUniqueAndMatches(feature: any, features: any) {
    const matchingFeature = features.find(
        (ft: any) =>
            ft.featureCode.name === feature.featureCode.name &&
            ft.featureCode.unique === false &&
            ft.value === feature.value
    );
    //Note: !!matchingFeature is to convert found object matchingFeature to a boolean format
    return !!matchingFeature;
}

const pathParamsFromDictionary = (pathname: string, values: any) => {
    return { pathname: pathname, query: values };
};

// Helper function to find the last step with previousStep property
const getLastStepWithPreviousStep = (storedObject: Record<string, any>) => {
    let lastStepNumber = 0;

    Object.keys(storedObject).forEach((key) => {
        if (key.startsWith('step') && storedObject[key]?.previousStep) {
            const stepNumber = parseInt(key.replace('step', ''));
            if (stepNumber > lastStepNumber) {
                lastStepNumber = stepNumber;
            }
        }
    });

    return lastStepNumber;
};

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
    extractGivenConfigsParams,
    isNonUniqueAndMatches,
    getModesFromPermissions,
    isStringDate,
    setUTCDateTime,
    formatLocaleDateTime,
    formatUTCLocaleDateTime,
    isStringDateTime,
    setUTCDate,
    formatLocaleDate,
    formatUTCLocaleDate,
    getDatesDifference,
    pathParamsFromDictionary,
    getLastStepWithPreviousStep
};
