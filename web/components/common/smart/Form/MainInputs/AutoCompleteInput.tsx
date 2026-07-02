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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState, useEffect, useCallback } from 'react';
import { FilterFieldType } from '../../../../../models/Models';
import {
    getRulesWithNoSpacesValidator,
    pluralize,
    buildListQuery,
    reportSubOptions
} from '@helpers';
import { useAuth } from 'context/AuthContext';

export interface IFormGroupProps {
    item: FilterFieldType;
    key: string;
    setAllSubOptions?: any;
    advancedFilters?: any[];
    isMultipleSelect?: boolean;
    style?: React.CSSProperties;
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
    const { item } = props;
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const [autoCompleteValue, setAutoCompleteValue] = useState<AutoCompleteValueType>(item as any);
    const [filteredOptions, setFilteredOptions] = useState<any>({});
    // subOptions is undefined until options are received; this drives the hidden state of the field
    const [subOptions, setSubOptions] = useState<FormOptionType[] | undefined>(undefined);
    const optionTable: any = (item as any)?.optionTable ?? {};
    // Advanced filters narrowing the option list can be provided generically through the field's
    // optionTable (constraint set by the calling page), via props, or on the item itself.
    const advancedFilters =
        optionTable?.advancedFilters ?? props?.advancedFilters ?? (item as any)?.advancedFilters;
    const isAdvancedFilters = Array.isArray(advancedFilters) && advancedFilters.length > 0;

    // a dynamic filter is "not yet sent" while its value is still the placeholder (value contained in its key),
    // (see processedOptions in AddEditItemComponentV2) -> hide the field until the real value arrives
    const filtersToApply: { [key: string]: any } = optionTable?.filtersToApply ?? {};
    const isFilterPending = Object.entries(filtersToApply).some(
        ([key, value]) => typeof value === 'string' && key.includes(value as string)
    );

    useEffect(() => {
        // while the filter that depends on another field is not sent yet, keep the field hidden and skip the query,
        // but still report to the parent so the form's global loading gate can resolve
        if (isFilterPending) {
            setSubOptions(undefined);
            reportSubOptions(props.setAllSubOptions, item.name as string, []);
            return;
        }

        async function fetchData() {
            const tableName = optionTable?.table;

            const queryName = tableName
                ? pluralize(tableName.charAt(0).toLowerCase() + tableName.slice(1))
                : '';
            const queriedFields =
                autoCompleteValue && optionTable ? optionTable.fieldToDisplay : [];
            const query = buildListQuery({
                tableName,
                queryName,
                fields: `id, ${queriedFields}`,
                withAdvancedFilters: isAdvancedFilters
            });

            // Modify the filters to use a "startsWith" condition
            const modifiedFilters = {
                ...optionTable.filtersToApply,
                [optionTable.fieldToDisplay]:
                    (filteredOptions[optionTable.fieldToDisplay] ?? '') + '%'
            };

            const variables = {
                filters: modifiedFilters,
                advancedFilters: isAdvancedFilters ? advancedFilters : undefined,
                orderBy: [
                    {
                        field: optionTable.fieldToDisplay,
                        ascending: true
                    }
                ],
                page: 1,
                itemsPerPage: 100
            };
            const options = await graphqlRequestClient.request(query, variables);

            const results = options[queryName].results;
            // the current value (edit mode) must always have a matching option, otherwise the
            // Select displays the raw id; fetch it separately when outside the first page
            const initialIds = (
                Array.isArray(item.initialValue) ? item.initialValue : [item.initialValue]
            ).filter((id: any) => id && !results.some((result: any) => result.id === id));
            if (initialIds.length > 0) {
                const initialOptions = await graphqlRequestClient.request(query, {
                    ...variables,
                    filters: { id: initialIds }
                });
                results.push(...initialOptions[queryName].results);
            }
            setSubOptions(results);
            setAutoCompleteValue((prev) => ({ ...prev, subOptions: results }));
            if (props.setAllSubOptions) {
                props.setAllSubOptions((prev: any) => {
                    const existingIndex = prev.findIndex((obj: any) =>
                        obj.hasOwnProperty(item.name)
                    );
                    const newValue = results.map((v: any) => {
                        return {
                            key: v.id,
                            text: v[optionTable.fieldToDisplay]
                        };
                    });
                    if (existingIndex !== -1) {
                        const newArray = [...prev];
                        // Merge and remove duplicates by 'key'
                        const merged = [
                            ...newArray[existingIndex][item.name as string],
                            ...newValue
                        ];
                        const unique = merged.filter(
                            (item, idx, arr) => arr.findIndex((i) => i.key === item.key) === idx
                        );
                        newArray[existingIndex] = {
                            [item.name as string]: unique
                        };
                        return newArray;
                    }
                    return [...prev, { [item.name as string]: newValue }];
                });
            }
        }
        fetchData();
    }, [filteredOptions, JSON.stringify(filtersToApply)]);

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
            initialValue={autoCompleteValue.initialValue}
            normalize={(value) => (value ? value : undefined)}
            rules={item.rules!}
            style={props.style}
            hidden={subOptions ? false : true}
        >
            <Select
                showSearch
                value={autoCompleteValue.value}
                mode={props.isMultipleSelect ? 'multiple' : undefined}
                filterOption={false}
                onSearch={handleSearch}
                allowClear
                disabled={(item as any).disabled ? true : false}
            >
                {subOptions?.map((option: FormOptionType, index: number) => {
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
