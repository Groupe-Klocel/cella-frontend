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
import {
    isNumeric,
    pascalToSnakeUpper,
    pluralize,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { FormOptionType } from '../../../../../models/ModelsV2';
import { FC, useEffect, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';

export interface IDraggerSelectProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        disabled?: boolean;
        optionTable?: {
            table: string;
            fieldToDisplay: string;
            filtersToApply?: { [key: string]: any };
        };
        subOptions?: FormOptionType[];
        rules?: any[];
        config?: { [key: string]: any };
        param?: { [key: string]: any };
        scope?: string;
        type?: number;
        filterConfigParam?: any;
    };
    key?: string;
    defaultSubOptions?: any;
    setAllSubOptions?: any;
    setValues?: any;
    setFormInfos?: any;
    mode?: 'multiple' | undefined;
}

const SelectInput: FC<IDraggerSelectProps> = ({
    item,
    setValues,
    defaultSubOptions,
    setAllSubOptions,
    mode,
    setFormInfos
}) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { configs, parameters } = useAppState();
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;

    const [oldSubOptions, setOldSubOptions] = useState<FormOptionType[]>();
    const [subOptions, setSubOptions] = useState<FormOptionType[]>();

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined,
        filtersToApply?: { [key: string]: any }
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName) {
            const statusToRemove = configs.find((conf: any) => {
                return (
                    conf.scope === `${tableName.toLowerCase()}_status` && conf.value === 'closed'
                );
            })?.code;

            const queryName = pluralize(tableName.charAt(0).toLowerCase() + tableName.slice(1));
            const queriedFields: any = statusToRemove
                ? ['id', `${fieldToDisplay}`, 'status']
                : ['id', `${fieldToDisplay}`];

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
                        ${queriedFields.join(', ')}
                    }
                }
            }
        `;

            const variables = {
                filters: filtersToApply,
                orderBy: null,
                page: 1,
                itemsPerPage: 100000
            };
            const options = await graphqlRequestClient.request(query, variables);

            const result: { [key: string]: any } = {};

            options[queryName].results.forEach((item: any) => {
                let valueToDisplay: any = item[`${fieldToDisplay}`];

                // check if fieldToDisplay is a nested field (example: fieldToDisplay = 'barcode{name}')
                const match = fieldToDisplay?.match(/\{(.+?)\}/);
                fieldToDisplay = match ? match[1] : fieldToDisplay;

                Object.values(item).forEach((subItem: any) => {
                    subItem == null
                        ? item.id
                        : (valueToDisplay = subItem[`${fieldToDisplay}`]
                              ? subItem[`${fieldToDisplay}`]
                              : valueToDisplay);
                });

                if (!result[tableName]) {
                    result[tableName] = [];
                }
                if (!statusToRemove || item.status !== statusToRemove) {
                    result[tableName].push({
                        key: item.id,
                        text: valueToDisplay
                    });
                }
            });

            return result;
        }
        return;
    }

    function setParentSubOptions(options: FormOptionType[]) {
        setAllSubOptions((prev: any) => {
            const existingIndex = prev.findIndex((obj: any) => obj.hasOwnProperty(item.name));
            if (existingIndex !== -1) {
                const newArray = [...prev];
                newArray[existingIndex] = {
                    [item.name]: options
                };
                return newArray;
            }
            return [
                ...prev,
                {
                    [item.name]: options
                }
            ];
        });
    }

    useEffect(() => {
        const defaultOptionsForItem = defaultSubOptions
            ? defaultSubOptions.find((obj: any) => obj.hasOwnProperty(item.name))?.[item.name]
            : null;
        if (defaultOptionsForItem) {
            setSubOptions(defaultOptionsForItem);
            setParentSubOptions(defaultOptionsForItem);
            return;
        }
        let filteredParameters = parameters;
        let filteredConfigs = configs;
        if (item.filterConfigParam && !item.initialValue) {
            const isExcluded = item.filterConfigParam.values.split('[')[0] === '!';
            const filterConfigParam = JSON.parse('[' + item.filterConfigParam.values.split('[')[1]);
            if (isExcluded) {
                filteredParameters = parameters.filter(
                    (param: any) =>
                        !filterConfigParam.includes(
                            isNumeric(param[item.filterConfigParam.field])
                                ? parseInt(param[item.filterConfigParam.field])
                                : param[item.filterConfigParam.field]
                        )
                );
                filteredConfigs = configs.filter(
                    (config: any) =>
                        !filterConfigParam.includes(
                            isNumeric(config[item.filterConfigParam.field])
                                ? parseInt(config[item.filterConfigParam.field])
                                : config[item.filterConfigParam.field]
                        )
                );
            } else {
                filteredParameters = parameters.filter((param: any) =>
                    filterConfigParam.includes(
                        isNumeric(param[item.filterConfigParam.field])
                            ? parseInt(param[item.filterConfigParam.field])
                            : param[item.filterConfigParam.field]
                    )
                );
                filteredConfigs = configs.filter((config: any) =>
                    filterConfigParam.includes(
                        isNumeric(config[item.filterConfigParam.field])
                            ? parseInt(config[item.filterConfigParam.field])
                            : config[item.filterConfigParam.field]
                    )
                );
            }
        }
        switch (true) {
            case !!item.optionTable: {
                const optionTable = item.optionTable;
                const tableName = optionTable.table;
                const fieldToDisplay = optionTable.fieldToDisplay;
                const filtersToApply = optionTable.filtersToApply;
                getOptions(tableName, fieldToDisplay, filtersToApply).then((options) => {
                    setSubOptions(options ? options[tableName] : []);
                    setAllSubOptions
                        ? setParentSubOptions(options ? options[tableName] : [])
                        : null;
                });
                break;
            }
            case !!item.config: {
                const configFilters = item.config;
                const inputsConfigs = filteredConfigs
                    .map((item: any) => {
                        if (configFilters !== item.scope) return;
                        const value =
                            filterLanguage &&
                            item.translation &&
                            item.translation[`${filterLanguage}`]
                                ? item.translation[`${filterLanguage}`]
                                : item.value;
                        return {
                            key: !isNumeric(item.code) ? item.code : parseInt(item.code),
                            text: value
                        };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => {
                        return parseInt(a.key) - parseInt(b.key);
                    });
                setSubOptions(inputsConfigs);
                setAllSubOptions ? setParentSubOptions(inputsConfigs) : null;
                break;
            }
            case !!item.param: {
                const paramsFilters = item.param;
                const inputsParams = filteredParameters
                    .map((item: any) => {
                        if (paramsFilters !== item.scope) return;
                        const value =
                            filterLanguage &&
                            item.translation &&
                            item.translation[`${filterLanguage}`]
                                ? item.translation[`${filterLanguage}`]
                                : item.value;
                        return {
                            key: !isNumeric(item.code) ? item.code : parseInt(item.code),
                            text: value
                        };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => {
                        return parseInt(a.key) - parseInt(b.key);
                    });
                setSubOptions(inputsParams);
                setAllSubOptions ? setParentSubOptions(inputsParams) : null;
                break;
            }
            case !!(item.type === 2): {
                const booleanOptions = [
                    {
                        key: true,
                        text: t('common:bool-yes')
                    },
                    {
                        key: false,
                        text: t('common:bool-no')
                    }
                ];
                setSubOptions(booleanOptions);
                setAllSubOptions ? setParentSubOptions(booleanOptions) : null;
                break;
            }
            default: {
                setSubOptions([]);
                setAllSubOptions ? setParentSubOptions([]) : null;
                break;
            }
        }
    }, [item]);

    useEffect(() => {
        if (!subOptions && oldSubOptions) {
            setFormInfos((prev: any) => ({ ...prev, [item.name]: null }));
            setValues({ [item.name]: null });
        }
        if (
            subOptions &&
            oldSubOptions &&
            JSON.stringify(subOptions) !== JSON.stringify(oldSubOptions)
        ) {
            setFormInfos((prev: any) => ({ ...prev, [item.name]: null }));
            setValues({ [item.name]: null });
        }
        setOldSubOptions(subOptions);
    }, [subOptions]);

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            initialValue={item?.initialValue}
            rules={item.rules!}
            hidden={subOptions ? false : true}
        >
            <Select
                disabled={item.disabled ? true : false}
                mode={mode}
                loading={
                    item.optionTable && subOptions && subOptions.length > 0
                        ? false
                        : item.optionTable
                          ? true
                          : false
                }
                allowClear
                showSearch
                defaultValue={item?.initialValue}
                filterOption={(inputValue, option) =>
                    option!.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
            >
                {subOptions?.map((option: FormOptionType, selectIndex: number) => (
                    <Select.Option key={option.text + selectIndex} value={option.key}>
                        {option.text}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>
    );
};

SelectInput.displayName = 'SelectInput';

export default SelectInput;
