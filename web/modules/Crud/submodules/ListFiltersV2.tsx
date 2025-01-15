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
import {
    Form,
    Input,
    InputNumber,
    Checkbox,
    Select,
    DatePicker,
    AutoComplete,
    ConfigProvider
} from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import { debounce } from 'lodash';
import moment from 'moment';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { FilterFieldType, FormDataType, FormOptionType } from '../../../models/ModelsV2';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { isNumeric, pluralize } from '@helpers';
import { gql } from 'graphql-request';
import { ContentSpin } from '@components';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';
import 'moment/locale/fr';

export interface IGeneralSearchProps {
    form: any;
    columns: Array<FilterFieldType>;
    handleSubmit?: any;
    resetForm?: boolean;
    allFieldsInitialValue?: string;
}

const ListFilters: FC<IGeneralSearchProps> = ({
    form,
    columns,
    handleSubmit,
    resetForm,
    allFieldsInitialValue
}: IGeneralSearchProps) => {
    const { t } = useTranslation();
    const { RangePicker } = DatePicker;
    const router = useRouter();
    const [columnsInfos, setColumnsInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;
    const [configParamOptionsList, setConfigParamOptionsList] = useState<any>();
    const [optionsList, setOptionsList] = useState<any>();
    const [isLoading, setIsLoading] = useState<boolean>(true);

    moment.locale(router.locale);

    const localeData = moment.localeData();
    const localeDateTimeFormat =
        localeData.longDateFormat('L') + ' ' + localeData.longDateFormat('LT');

    const onChange = (value: RangePickerProps['value'], dateString: [string, string] | string) => {
        console.log('Selected Time: ', value);
        console.log('Formatted Selected Time: ', dateString);
    };

    const onOk = (value: RangePickerProps['value']) => {
        console.log('onOk: ', value);
    };

    useEffect(() => {
        if (resetForm) {
            form.resetFields();
        }
    }, [resetForm]);

    // #region handle configs/params options if any
    async function getConfigsAndParametersByScopes(
        columns: any[]
    ): Promise<{ [key: string]: any }> {
        const configsQuery = gql`
            query GetConfigs($filters: ConfigSearchFilters, $itemsPerPage: Int!) {
                configs(filters: $filters, itemsPerPage: $itemsPerPage) {
                    results {
                        id
                        scope
                        code
                        value
                        translation
                    }
                }
            }
        `;
        const paramsQuery = gql`
            query GetParams($filters: ParameterSearchFilters, $itemsPerPage: Int!) {
                parameters(filters: $filters, itemsPerPage: $itemsPerPage) {
                    results {
                        id
                        scope
                        code
                        value
                        translation
                    }
                }
            }
        `;

        const configScopes = columns
            .filter((obj) => obj.hasOwnProperty('config') && obj.config !== undefined)
            .map((obj) => obj.config);

        const paramScopes = columns
            .filter((obj) => obj.hasOwnProperty('param') && obj.param !== undefined)
            .map((obj) => obj.param);

        const configsInput = {
            filters: {
                scope: configScopes.length > 0 ? configScopes : ''
            },
            itemsPerPage: 1000
        };

        const paramsInput = {
            filters: {
                scope: paramScopes.length > 0 ? paramScopes : ''
            },
            itemsPerPage: 1000
        };

        const config = await graphqlRequestClient.request(configsQuery, configsInput);
        const param = await graphqlRequestClient.request(paramsQuery, paramsInput);

        const result: { [key: string]: any } = {};

        config?.configs?.results.sort(
            (a: { [key: string]: any }, b: { [key: string]: any }) =>
                parseInt(a.code) - parseInt(b.code)
        );
        config.configs.results.forEach((item: any) => {
            if (!result[item.scope]) {
                result[item.scope] = [];
            }
            const value =
                filterLanguage && item.translation && item.translation[`${filterLanguage}`]
                    ? item.translation[`${filterLanguage}`]
                    : item.value;
            result[item.scope].push({
                key: isNumeric(item.code) ? parseInt(item.code) : item.code,
                text: value
            });
        });
        param?.parameters.results.sort(
            (a: { [key: string]: any }, b: { [key: string]: any }) =>
                parseInt(a.code) - parseInt(b.code)
        );
        param?.parameters.results.forEach((item: any) => {
            if (!result[item.scope]) {
                result[item.scope] = [];
            }
            const value =
                filterLanguage && item.translation
                    ? item.translation[`${filterLanguage}`]
                    : item.value;
            result[item.scope].push({
                key: isNumeric(item.code) ? parseInt(item.code) : item.code,
                text: value
            });
        });

        return result;
    }

    useEffect(() => {
        const fetchData = async () => {
            const configParamOptions = await getConfigsAndParametersByScopes(columns);
            if (configParamOptions) {
                setConfigParamOptionsList(configParamOptions);
            }
        };
        fetchData();
    }, []);

    // #region handle options for dropdowns
    const optionsTables = columns
        .filter((obj) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj) => obj.optionTable);

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName && fieldToDisplay) {
            const queryName = pluralize(tableName.charAt(0).toLowerCase() + tableName.slice(1));
            const queriedFields: any = ['id', `${fieldToDisplay}`];
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
                filters: {},
                orderBy: null,
                page: 1,
                itemsPerPage: 100000
            };
            const options = await graphqlRequestClient.request(query, variables);
            const result: { [key: string]: any } = {};

            options[queryName].results.forEach((item: any) => {
                if (!result[tableName]) {
                    result[tableName] = [];
                }
                result[tableName].push({
                    key: item.id,
                    text: item[`${fieldToDisplay}`]
                });
            });
            return result;
        }
        return;
    }

    useEffect(() => {
        async function fetchData() {
            const promises = optionsTables.map((element) =>
                getOptions(JSON.parse(element!).table, JSON.parse(element!).fieldToDisplay)
            );
            const options = await Promise.all(promises);
            const optionsObject: { [key: string]: any } = {};

            options.forEach((item: any) => {
                if (item) {
                    const key = Object.keys(item)[0];
                    optionsObject[key] = item[key];
                }
            });
            if (Object.keys(optionsObject).length > 0) {
                setOptionsList(optionsObject);
            }
        }
        fetchData();
    }, []);
    // #endregion

    // #region add information to columns once available
    useEffect(() => {
        form.resetFields();
        const tmp_columns = columns.map((e) => {
            if (optionsList) {
                if (e.optionTable) {
                    return {
                        ...e,
                        subOptions:
                            optionsList[
                                `${JSON.parse(e.optionTable).table}` as keyof typeof optionsList
                            ],
                        ...(e.isMultipleSearch ? { mode: 'multiple' } : {})
                    };
                }
            }
            if (e.type === 2) {
                return {
                    ...e,
                    type: 4,
                    subOptions: [
                        {
                            key: true,
                            text: t('common:bool-yes')
                        },
                        {
                            key: false,
                            text: t('common:bool-no')
                        }
                    ]
                };
            }
            if (configParamOptionsList) {
                if (e.config || e.param) {
                    return {
                        ...e,
                        subOptions: e.config
                            ? configParamOptionsList[
                                  `${e.config}` as keyof typeof configParamOptionsList
                              ]
                            : configParamOptionsList[
                                  `${e.param}` as keyof typeof configParamOptionsList
                              ],
                        ...(e.isMultipleSearch ? { mode: 'multiple' } : {})
                    };
                }
            }
            return e;
        });
        setColumnsInfos(tmp_columns);
        setIsLoading(false);
    }, [configParamOptionsList, optionsList]);
    // #endregion

    //enter key for form validation
    const handleKeyPress = (event: any) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <>
            {!isLoading ? (
                <Form
                    form={form}
                    layout="vertical"
                    name="control-hooks"
                    onKeyPress={handleKeyPress}
                >
                    <Form.Item
                        name={'allFields'}
                        label={t('d:all-fields-search')}
                        key={'allFields'}
                        normalize={(value) => (value ? value : undefined)}
                        initialValue={allFieldsInitialValue ? allFieldsInitialValue : undefined}
                    >
                        <Input allowClear />
                    </Form.Item>
                    {columnsInfos?.map((item: FilterFieldType) => {
                        if (item.type === FormDataType.Number)
                            return (
                                <Form.Item
                                    name={item.name}
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    key={item.name}
                                    rules={item.rules!}
                                    normalize={(value) => (value ? value : undefined)}
                                    initialValue={
                                        item?.initialValue ? item?.initialValue : undefined
                                    }
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        precision={item.numberPrecision}
                                    />
                                </Form.Item>
                            );
                        else if (item.type == FormDataType.String)
                            return (
                                <Form.Item
                                    name={item.name}
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    key={item.name}
                                    normalize={(value) => (value ? value : undefined)}
                                    initialValue={
                                        item?.initialValue ? item?.initialValue : undefined
                                    }
                                >
                                    <Input
                                        maxLength={item.maxLength ? item.maxLength : 100}
                                        allowClear
                                    />
                                </Form.Item>
                            );
                        else if (item.type == FormDataType.TextArea)
                            return (
                                <Form.Item
                                    name={item.name}
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    key={item.name}
                                    normalize={(value) => (value ? value : undefined)}
                                    initialValue={
                                        item?.initialValue ? item?.initialValue : undefined
                                    }
                                >
                                    <Input.TextArea
                                        maxLength={item.maxLength ? item.maxLength : 100}
                                        allowClear
                                    />
                                </Form.Item>
                            );
                        else if (item.type == FormDataType.Dropdown)
                            return (
                                <Form.Item
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    name={item.name}
                                    rules={item.rules!}
                                    key={item.name}
                                    initialValue={
                                        item?.initialValue ? item?.initialValue : undefined
                                    }
                                >
                                    <Select
                                        disabled={item.disabled ? true : false}
                                        // mode={item.mode ? item.mode : false}
                                        mode="multiple"
                                        allowClear
                                        showSearch
                                        filterOption={(inputValue, option) =>
                                            option!.props.children
                                                .toUpperCase()
                                                .indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                    >
                                        {item.subOptions?.map((option: FormOptionType) => (
                                            <Select.Option key={option.key} value={option.key}>
                                                {option.text}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            );
                        else if (item.type == FormDataType.Calendar)
                            return (
                                <Form.Item
                                    name={item.name}
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    key={item.name}
                                    rules={item.rules!}
                                    normalize={(value) => (value ? value : undefined)}
                                    initialValue={
                                        item?.initialValue ? dayjs(item?.initialValue) : undefined
                                    }
                                >
                                    <DatePicker
                                        format={localeDateTimeFormat}
                                        locale={router.locale === 'fr' ? fr_FR : en_US}
                                        showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                                        allowClear
                                    />
                                </Form.Item>
                            );
                        else if (item.type == FormDataType.CalendarRange) {
                            let startDate = null;
                            let endDate = null;
                            if (item.initialValue && item.initialValue[0])
                                startDate = dayjs(item.initialValue[0]);
                            if (item.initialValue && item.initialValue[1])
                                endDate = dayjs(item.initialValue[1]);

                            return (
                                <Form.Item
                                    name={item.name}
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    key={item.name}
                                    rules={item.rules!}
                                    normalize={(value) => (value ? value : undefined)}
                                >
                                    <RangePicker
                                        showTime={{ format: 'HH:mm' }}
                                        format={localeDateTimeFormat}
                                        locale={router.locale === 'fr' ? fr_FR : en_US}
                                        value={[null, null]}
                                        allowEmpty={[true, true]}
                                        onChange={onChange}
                                        onOk={onOk}
                                        placeholder={[t('common:start-date'), t('common:end-date')]}
                                        allowClear
                                        defaultValue={[startDate, endDate]}
                                    />
                                </Form.Item>
                            );
                        } else if (item.type == FormDataType.AutoComplete)
                            return (
                                <Form.Item
                                    label={
                                        item.displayName ? item.displayName : t(`d:${item.name}`)
                                    }
                                    name={item.name}
                                    key={item.name}
                                    rules={item.rules!}
                                    initialValue={
                                        item?.initialValue ? item?.initialValue : undefined
                                    }
                                    normalize={(value) => (value ? value : undefined)}
                                >
                                    <AutoComplete
                                        value={item.value}
                                        filterOption={(inputValue, option) =>
                                            (option?.value as string)
                                                .toUpperCase()
                                                .indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                        onKeyUp={(e: any) => {
                                            debounce(() => {
                                                item.setName(e.target.value);
                                            }, 3000);
                                        }}
                                        onSelect={(value, option) => {
                                            item.setId(option.key);
                                            item.setName(option.text);
                                        }}
                                        onChange={(data: string) => {
                                            if (!data?.length) {
                                                item.setName('');
                                                item.setId('');
                                            } else {
                                                item.setName(data);
                                            }
                                        }}
                                        allowClear
                                    >
                                        {item.subOptions?.map((option: FormOptionType) => (
                                            <AutoComplete.Option
                                                key={option.key}
                                                value={option.text}
                                            >
                                                {option.text}
                                            </AutoComplete.Option>
                                        ))}
                                    </AutoComplete>
                                </Form.Item>
                            );
                        else
                            return (
                                <Form.Item
                                    name={item.name}
                                    valuePropName="checked"
                                    initialValue={item.initialValue ? item.initialValue : false}
                                    key={item.name}
                                >
                                    <Checkbox>{t(`d:${item.name}`)}</Checkbox>
                                </Form.Item>
                            );
                    })}
                </Form>
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

ListFilters.displayName = 'ListFilters';

export { ListFilters };
