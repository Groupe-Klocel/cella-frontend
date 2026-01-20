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
// Used for CRUD form field type declarations.
export enum FormDataType {
    Number,
    String,
    Boolean,
    TextArea,
    Dropdown,
    CheckBox,
    Calendar,
    CalendarRange,
    AutoComplete,
    Password,
    File
}
// Used for CRUD form validation rule definitions
export type FormRuleType = {
    required?: boolean;
    message?: string;
    type?: any;
    min?: number;
    max?: number;
};
// Used for CRUD form options definition (e.g. for dropdown <Select />)
export type FormOptionType = {
    key: any;
    text: string;
};
// Used for CRUD form item definitons
export type FilterFieldType = {
    name: string;
    displayName?: string;
    type: FormDataType;
    numberPrecision?: number;
    rulesInfos?: any;
    extraRules?: any;
    rules?: Array<FormRuleType>;
    disabled?: boolean;
    subOptions?: Array<FormOptionType>;
    initialValue?: any;
    mode?: any;
    value?: any;
    setName?: any;
    setId?: any;
    maxLength?: number;
    min?: number;
    max?: number;
    config?: { [key: string]: any };
    param?: { [key: string]: any };
    optionTable?: {
        table: string;
        fieldToDisplay: string;
        filtersToApply?: { [key: string]: any };
    };
    isMultipleSearch?: boolean;
};

// Used for defining endpoints inside ModelType
export type EndpointsType = {
    list: string;
    export?: boolean | null;
    detail: string;
    create: string;
    update: string;
    delete: string;
    softDelete?: string | null;
};
export type CustomizedTitlesType = {
    [key: string]: string;
};
// Used for model definition of CRUD operations.
export type ModelType = {
    tableName: string;
    modelName?: string | null;
    resolverName: string;
    isEditable: boolean;
    isDeletable: boolean;
    isSoftDeletable: boolean;
    endpoints: EndpointsType;
    fieldsInfo: FieldsInfo;
    moreInfos?: string;
};

export type idNameObjectType = {
    id: string;
    name: string;
};

export type FieldInfo = {
    isListRequested: boolean;
    isDefaultHiddenList: boolean;
    isExcludedFromList: boolean;
    isSortable: boolean;
    searchingFormat: string | null;
    isDetailRequested: boolean;
    isExcludedFromDetail: boolean;
    detailGroup: string | null;
    link: string | null;
    addEditFormat: string | null;
    addEditStep: number | null;
    maxLength: number | null;
    displayName: string | null;
    isMandatory: boolean;
    minRule: number | null;
    maxRule: number | null;
    config: string | null;
    param: string | null;
    optionTable?: string | null;
    defaultSort?: string;
    isEditDisabled?: boolean;
    addEditInitialValue?: any;
    numberPrecision?: number;
    toBeEditDisabled?: string;
    isMultipleSearch?: boolean;
    filterConfigParam?: string;
};

export type FieldsInfo = {
    [key: string]: FieldInfo;
};
