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
import { stringify } from 'querystring';
import moment from 'moment';

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

function orderBooleanFormater(order: string) {
    if (order === 'ascend') {
        return true;
    } else if (order === 'descend') {
        return false;
    } else return order;
}

// Purge sort array/object
function purgeSorter(data: Array<any> | any): Array<any> | null {
    let newSorter;
    if (!Array.isArray(data)) {
        if (data.order === undefined) {
            return null;
        } else {
            if (Array.isArray(data.field)) {
                data.field = data.field.slice(-1)[0];
            }
            newSorter = [data];
        }
    } else {
        data.map((e) => (Array.isArray(e.field) ? (e.field = e.field.slice(-1)[0]) : e.field));
        newSorter = data;
    }

    newSorter = newSorter.map((value) => ({
        field: value.field,
        ascending: orderBooleanFormater(value.order)
    }));
    return newSorter;
}

const orderByFormater = (sorter: any) => {
    const newSorter = purgeSorter(sorter);
    return newSorter;
};

// Set index to each object in an array
function setIndex(array: Array<any>): Array<any> {
    const arrayWithIndex = array.map((object: any) => ({
        ...object,
        index: array.indexOf(object)
    }));
    return arrayWithIndex;
}

// add key pair value to each object in an array
function addKeyValueToArrayObject(array: Array<any>, key: string, value: any): Array<any> {
    const newarray = array.map((object: any) => addKeyValueToObject(object, key, value));
    return newarray;
}

// add key pair value to an object
function addKeyValueToObject(object: any, key: string, value: any): any {
    return Object.defineProperty(object, key, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    });
}

// First if statement disable fixed columns except the 2 first and last columns
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

// need to set Domain for safety

function stringToBoolean(string: string | undefined) {
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

// handle mismatch when menu is open by the user but not set as default and user settings menu is set to true
function getMenuState(isSettingMenuCollapsed: boolean) {
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

function isEmpty(object: any) {
    for (const property in object) {
        return false;
    }
    return true;
}

function formatDigits(x: number) {
    return x.toFixed(2);
}

function isFloat(value: any) {
    if (typeof value === 'number' && !Number.isNaN(value) && !Number.isInteger(value)) {
        return true;
    }

    return false;
}

function isNumeric(num: any) {
    return !isNaN(num);
}

function isUrl(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch (err) {
        return false;
    }
}

function formatDigitsForData(data: any) {
    return data.map((object: any) => {
        Object.keys(object).map((key) => {
            if (isFloat(object[key])) {
                object[key] = formatDigits(object[key]);
            }
        });
    });
}

function decodeJWT(token: string) {
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

const pathParamsFromDictionary = (pathname: string, values: any) => {
    return { pathname: pathname, query: values };
};

const checkKeyPresenceInArray = (key: any, array: any[]) =>
    array.filter((o) => o.hasOwnProperty(key));

const checkValuePresenceInArray = (value: any, array: any[]) =>
    array.some((obj) => obj.field === value);

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

function flatten(data: any) {
    let result: any = {};
    function recurse(cur: any, prop: any) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++) recurse(cur[i], prop); //  + "[" + i + "]"
            if (l == 0) result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + '_' + p : p);
            }
            if (isEmpty && prop) result[prop] = {};
        }
    }
    recurse(data, '');
    return result;
}

const isStringDateTime = (dateString: string) => {
    const dateTimeZuluRegex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/;
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/;
    const dateTimeOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
    if (
        !dateTimeZuluRegex.test(dateString) &&
        !dateTimeRegex.test(dateString) &&
        !dateTimeOffsetRegex.test(dateString)
    )
        return false;

    if (isNaN(Date.parse(dateString))) return false;

    if (!moment(dateString, moment.ISO_8601).isValid()) return false;

    return true;
};

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

function formatLocaleDateTime(date: any, locale: any) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: timezone
    });
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

function removeDuplicatesAndSort(arr: any[]) {
    return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function pascalToSnakeUpper(pascalCase: string): string {
    let snakeCase = '';
    for (let i = 0; i < pascalCase.length; i++) {
        const char = pascalCase.charAt(i);
        if (char === char.toUpperCase() && i !== 0) {
            snakeCase += '_';
        }
        snakeCase += char.toUpperCase();
    }
    return snakeCase;
}

function checkOperator(status: number, operator: string, limit: number): boolean {
    switch (operator) {
        case '>':
            return status > limit;
        case '>=':
            return status >= limit;
        case '<':
            return status < limit;
        case '<=':
            return status <= limit;
        case '===':
            return status === limit;
        case '!==':
            return status !== limit;
        default:
            throw new Error('Invalid operator');
    }
}

function pluralize(word: string) {
    const irregulars = {
        basis: 'bases',
        child: 'children',
        criterion: 'criteria',
        index: 'indices',
        matrix: 'matrices',
        parenthesis: 'parentheses',
        self: 'selves',
        series: 'series',
        person: 'people'
    };
    if (irregulars[word as keyof typeof irregulars]) {
        return irregulars[word as keyof typeof irregulars];
    }
    if (
        word.endsWith('s') ||
        word.endsWith('sh') ||
        word.endsWith('ch') ||
        word.endsWith('x') ||
        word.endsWith('z')
    ) {
        return word + 'es';
    }
    if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies';
    }
    return word + 's';
}

const getRulesWithNoSpacesValidator = (existingRules: Array<any> | undefined, message: string) => {
    const noSpacesValidator = (_: any, value: string) => {
        if (value && value.trim().length === 0) {
            return Promise.reject(new Error(message));
        }
        return Promise.resolve();
    };

    const rules = existingRules || [];

    return [
        ...rules,
        {
            validator: noSpacesValidator,
            message: message
        }
    ];
};

// this checks for all key, value pair of an object if the content of the value is present in the key too
// (e.g. key: 'xxxtestxxx' or 'test', value: 'test') will returns the matching keys
function checkValueInKey(obj: any): string[] {
    const keys = Object.keys(obj);
    const matchingKeys: string[] = [];
    keys.forEach((key) => {
        if (typeof obj[key] === 'object') {
            const subMatchingKeys = checkValueInKey(obj[key]);
            matchingKeys.push(...subMatchingKeys);
        } else if (typeof obj[key] === 'string' && key.includes(obj[key])) {
            matchingKeys.push(key);
        }
    });
    return matchingKeys;
}

function extractComparisonValues(string: string) {
    const pattern = /(===|!==|>|>=|<|<=)\s*(\w+)/g;
    const matches = [];

    let match;
    while ((match = pattern.exec(string)) !== null) {
        const sign = match[1];
        const valueToCompare = match[2];
        matches.push({ sign, valueToCompare });
    }

    return matches;
}

function queryString(
    queryName: string,
    fields: Array<string>,
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language?: string,
    defaultModelSort?: any
): string {
    let newSort: any;

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    const defaultSort = defaultModelSort ? defaultModelSort : sortByDate;

    if (sort === null) {
        newSort = defaultSort;
    } else if (sort != null) {
        newSort = sort;
    }

    const queryString = `query{
        ${queryName}(
            filters: ${search ? JSON.stringify(search).replace(/"(\w+)":/g, '$1:') : undefined}
            orderBy: ${newSort ? JSON.stringify(newSort).replace(/"/g, '') : undefined}
            page: ${page}
            itemsPerPage: ${itemsPerPage}
            language: ${language ? JSON.stringify(language) : undefined}
        ) {
            count
            itemsPerPage
            totalPages
            results {
                ${fields.join('\n')}
            }
        }
    }`;

    return queryString;
}

function areObjectsIdentical(arr: Array<any>) {
    if (arr.length === 0) return true;

    const firstObject = JSON.stringify(arr[0]);

    for (let i = 1; i < arr.length; i++) {
        if (JSON.stringify(arr[i]) !== firstObject) {
            return false;
        }
    }
    return true;
}

//check fields if contain undefined value and set field to null
const checkUndefinedValues = (form: any) => {
    const tmpFieldsValues = { ...form.getFieldsValue(true) };

    for (const [key, value] of Object.entries(tmpFieldsValues)) {
        if (value === undefined) {
            tmpFieldsValues[key] = null;
        }
    }
    form.setFieldsValue(tmpFieldsValues);
};

const formatFeatures = (hucfs: any[]): Record<string, any> => {
    const updated_features: any[] = [];
    if (hucfs && hucfs.length > 0) {
        hucfs.forEach((hucf: any) => {
            const featureName =
                hucf.featureCode_name || (hucf.featureCode && hucf.featureCode.name);
            const single_feature = {
                [featureName]: {
                    id: hucf.id,
                    value: hucf.value
                }
            };
            updated_features.push(single_feature);
        });
    }
    return updated_features;
};

export {
    isNumeric,
    formatDigitsForData,
    isFloat,
    isUrl,
    formatDigits,
    isEmpty,
    orderByFormater,
    purgeSorter,
    checkValuePresenceInArray,
    pathParams,
    pathParamsFromDictionary,
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
    isCookieSet,
    stringToBoolean,
    isVisible,
    getLanguageNameFromISOCode,
    getKeys,
    getModesFromPermissions,
    flatten,
    isStringDateTime,
    setUTCDateTime,
    formatLocaleDateTime,
    formatUTCLocaleDateTime,
    isStringDate,
    setUTCDate,
    formatLocaleDate,
    formatUTCLocaleDate,
    removeDuplicatesAndSort,
    pascalToSnakeUpper,
    checkOperator,
    pluralize,
    getRulesWithNoSpacesValidator,
    checkValueInKey,
    extractComparisonValues,
    queryString,
    areObjectsIdentical,
    checkUndefinedValues,
    formatFeatures
};
