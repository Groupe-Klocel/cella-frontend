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
import { DoubleLeftOutlined } from '@ant-design/icons';
import { Form, Input, InputNumber, Checkbox, Select, DatePicker, AutoComplete } from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import { debounce } from 'lodash';
import dayjs from 'dayjs';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';
import { FilterFieldType, FormDataType, FormOptionType } from '../../../models/Models';

export interface IGeneralSearchProps {
    form: any;
    columns: Array<FilterFieldType>;
}

const ListFilters: FC<IGeneralSearchProps> = ({ form, columns }: IGeneralSearchProps) => {
    const { t } = useTranslation();
    const { RangePicker } = DatePicker;

    const onChange = (value: RangePickerProps['value'], dateString: [string, string] | string) => {
        console.log('Selected Time: ', value);
        console.log('Formatted Selected Time: ', dateString);
    };

    const onOk = (value: RangePickerProps['value']) => {
        console.log('onOk: ', value);
    };

    return (
        <>
            <Form form={form} layout="vertical" name="control-hooks">
                {columns.map((item: FilterFieldType, number) => {
                    if (item.type === FormDataType.Number)
                        return (
                            <Form.Item
                                name={item.name}
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name}
                                rules={item.rules!}
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
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name}
                            >
                                <Input maxLength={item.maxLength ? item.maxLength : 100} />
                            </Form.Item>
                        );
                    else if (item.type == FormDataType.TextArea)
                        return (
                            <Form.Item
                                name={item.name}
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name}
                            >
                                <Input.TextArea maxLength={item.maxLength ? item.maxLength : 100} />
                            </Form.Item>
                        );
                    else if (item.type == FormDataType.Dropdown)
                        return (
                            <Form.Item
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                name={item.name}
                                rules={item.rules!}
                            >
                                <Select
                                    disabled={item.disabled ? true : false}
                                    mode={item.mode ? item.mode : false}
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
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name}
                                rules={item.rules!}
                            >
                                <DatePicker
                                    format="YYYY-MM-DD HH:mm:ss"
                                    showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                                />
                            </Form.Item>
                        );
                    else if (item.type == FormDataType.CalendarRange)
                        return (
                            <Form.Item
                                name={item.name}
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                key={item.name}
                                rules={item.rules!}
                            >
                                <RangePicker
                                    showTime={{ format: 'HH:mm' }}
                                    format="YYYY-MM-DD HH:mm"
                                    value={[null, null]}
                                    allowEmpty={[true, true]}
                                    onChange={onChange}
                                    onOk={onOk}
                                    placeholder={[t('common:start-date'), t('common:end-date')]}
                                />
                            </Form.Item>
                        );
                    else if (item.type == FormDataType.AutoComplete)
                        return (
                            <Form.Item
                                label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                                name={item.name}
                                rules={item.rules!}
                                initialValue={item.initialValue}
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
                                        <AutoComplete.Option key={option.key} value={option.text}>
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
                                initialValue={false}
                                key={item.name}
                            >
                                <Checkbox>{t(`d:${item.name}`)}</Checkbox>
                            </Form.Item>
                        );
                })}
            </Form>
        </>
    );
};

ListFilters.displayName = 'ListFilters';

export { ListFilters };
