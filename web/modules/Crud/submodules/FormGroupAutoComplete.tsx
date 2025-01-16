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

import { Form, Select } from 'antd';
import { debounce } from 'lodash';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState, useEffect, useCallback } from 'react';
import { FilterFieldType } from '../../../models/Models';
import { getRulesWithNoSpacesValidator, pluralize } from '@helpers';
import { useAuth } from 'context/AuthContext';

export interface IFormGroupProps {
    item: FilterFieldType;
    key: string;
}

interface OptionTableType {
    table?: string;
    fieldToDisplay?: string;
    filtersToApply?: any;
}

interface FormOptionType {
    [key: string]: any;
}

interface AutoCompleteValueType {
    optionTable?: OptionTableType;
    displayName?: string;
    name?: string;
    rules?: any[];
    initialValue?: any;
    subOptions?: FormOptionType[];
    value?: string;
}

const AutoComplete: FC<IFormGroupProps> = (props: IFormGroupProps) => {
    const { item, key } = props;
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const [autoCompleteValue, setAutoCompleteValue] = useState<AutoCompleteValueType>(item as any);
    const [filteredOptions, setFilteredOptions] = useState<any>({});
    const optionTable =
        typeof autoCompleteValue?.optionTable === 'string'
            ? JSON.parse(autoCompleteValue.optionTable)
            : {};

    useEffect(() => {
        async function fetchData() {
            const tableName = optionTable.table;

            const queryName = tableName
                ? pluralize(tableName.charAt(0).toLowerCase() + tableName.slice(1))
                : '';
            const queriedFields =
                autoCompleteValue && optionTable ? optionTable.fieldToDisplay : [];
            const query = gql`
            query CustomListQuery(
                $filters: ${tableName}SearchFilters
                $orderBy: [${tableName}OrderByCriterion!]
                $page: Int!
                $itemsPerPage: Int!
                $language: String = "en"
            ) {
                ${queryName}(
                    filters: $filters
                    orderBy: $orderBy
                    page: $page
                    itemsPerPage: $itemsPerPage
                    language: $language
                ) {
                    count
                    results {
                        id,
                        ${queriedFields}
                    }
                }
            }
        `;

            // Modify the filters to use a "startsWith" condition
            const modifiedFilters = {
                ...optionTable.filtersToApply,
                [optionTable.fieldToDisplay]:
                    (filteredOptions[optionTable.fieldToDisplay] ?? '') + '%'
            };

            const variables = {
                filters: modifiedFilters,
                orderBy: null,
                page: 1,
                itemsPerPage: 100
            };

            const options = await graphqlRequestClient.request(query, variables);

            console.log(options);

            setAutoCompleteValue({ ...autoCompleteValue, subOptions: options[queryName].results });
        }
        fetchData();
    }, [filteredOptions]);

    //useCallback to avoid re-rendering
    const handleSearch = useCallback(
        debounce((data: string) => {
            const filteredData = {
                ...filteredOptions,
                [optionTable.fieldToDisplay]: data
            };
            setFilteredOptions(filteredData);
        }, 400),
        [filteredOptions, optionTable.fieldToDisplay]
    );

    return (
        <Form.Item
            label={
                autoCompleteValue.displayName
                    ? autoCompleteValue.displayName
                    : t(`d:${autoCompleteValue.name}`)
            }
            name={autoCompleteValue.name}
            rules={getRulesWithNoSpacesValidator(
                autoCompleteValue.rules!,
                t('messages:error-space')
            )}
            initialValue={autoCompleteValue.initialValue}
            normalize={(value) => (value ? value : undefined)}
        >
            <Select
                showSearch
                value={autoCompleteValue.value}
                filterOption={false}
                onSearch={handleSearch}
                allowClear
            >
                {autoCompleteValue.subOptions?.map((option: FormOptionType, index: number) => {
                    const firstKeyOfOtpion = Object.keys(option)[1] as keyof FormOptionType;
                    return (
                        <Select.Option key={option.id || index} value={option.id}>
                            {option[firstKeyOfOtpion]}
                        </Select.Option>
                    );
                })}
            </Select>
        </Form.Item>
    );
};

export default AutoComplete;
