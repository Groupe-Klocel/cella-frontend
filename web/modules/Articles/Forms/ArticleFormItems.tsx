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
import { FormDataType } from 'models/Models';

const articleFormStep1 = (errorMessageEmptyInput: string) => {
    return [
        {
            name: 'name',
            type: FormDataType.String,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        },
        { name: 'additionalDescription', type: FormDataType.TextArea },
        { name: 'supplierName', type: FormDataType.String },
        {
            name: 'status',
            type: FormDataType.Dropdown,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        },
        {
            name: 'code',
            type: FormDataType.String,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        },
        {
            name: 'stockOwnerId',
            type: FormDataType.Dropdown,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        },
        {
            name: 'cubingType',
            type: FormDataType.Dropdown,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        }
    ];
};

const articleFormStep2 = (errorMessageEmptyInput: string) => {
    return [
        {
            name: 'length',
            type: FormDataType.Number,
            numberPrecision: 2
        },
        {
            name: 'width',
            type: FormDataType.Number,
            numberPrecision: 2
        },
        {
            name: 'height',
            type: FormDataType.Number,
            numberPrecision: 2
        },
        {
            name: 'baseUnitWeight',
            type: FormDataType.Number,
            numberPrecision: 2
        },
        {
            name: 'baseUnitPicking',
            type: FormDataType.Boolean
        },
        {
            name: 'baseUnitPrice',
            type: FormDataType.Number
        },
        {
            name: 'baseUnitRotation',
            type: FormDataType.Dropdown
        }
    ];
};
const articleFormStep3 = (errorMessageEmptyInput: string) => {
    return [
        {
            name: 'family',
            type: FormDataType.String
        },
        {
            name: 'subfamily',
            type: FormDataType.String
        },
        {
            name: 'tariffClassification',
            type: FormDataType.String
        },
        {
            name: 'groupingId',
            type: FormDataType.Number
        },
        {
            name: 'featureType',
            type: FormDataType.Dropdown
        },
        {
            name: 'permanentProduct',
            type: FormDataType.Boolean
        }
    ];
};
export { articleFormStep1, articleFormStep2, articleFormStep3 };
