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
import { Form, Input, InputNumber, Checkbox, Select, DatePicker } from 'antd';
import moment from 'moment';
import dayjs from 'dayjs';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';
import { FilterFieldType, FormDataType, FormOptionType } from '../../../models/Models';
import { getRulesWithNoSpacesValidator, pluralize } from '@helpers';
import { DraggerInput } from 'components/common/smart/Form/DraggerInput';
import { useRouter } from 'next/router';
import AutoComplete from './FormGroupAutoComplete';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';
import 'moment/locale/fr';

export interface IFormGroupProps {
    inputs: Array<FilterFieldType>;
    setValues?: any;
    imageData?: string;
}

const FormGroup: FC<IFormGroupProps> = (props: IFormGroupProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    moment.locale(router.locale);

    const localeData = moment.localeData();
    const localeDateTimeFormat =
        localeData.longDateFormat('L') + ' ' + localeData.longDateFormat('LT');

    return (
        <>
            {props.inputs.map((item: FilterFieldType, number) => {
                if (item.type === FormDataType.Number) {
                    return (
                        <Form.Item
                            name={item.name}
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                            rules={item.rules!}
                            initialValue={item.initialValue}
                            // normalize={(value) => (value ? value : undefined)}
                        >
                            <InputNumber
                                disabled={item.disabled ? true : false}
                                style={{ width: '100%' }}
                                precision={item.numberPrecision}
                                min={item.min}
                                max={item.max}
                                decimalSeparator=","
                                formatter={(value: any) => value.replace(/,/g, '.')}
                            />
                        </Form.Item>
                    );
                } else if (item.type == FormDataType.String)
                    return (
                        <Form.Item
                            name={item.name}
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                            initialValue={item.initialValue}
                            rules={getRulesWithNoSpacesValidator(
                                item.rules!,
                                t('messages:error-space')
                            )}
                            normalize={(value) => (value ? value : undefined)}
                        >
                            <Input
                                disabled={item.disabled ? true : false}
                                maxLength={item.maxLength ? item.maxLength : 100}
                            />
                        </Form.Item>
                    );
                else if (item.type == FormDataType.Password)
                    return (
                        <Form.Item
                            name={item.name}
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                            rules={getRulesWithNoSpacesValidator(
                                item.rules!,
                                t('messages:error-space')
                            )}
                            normalize={(value) => (value ? value : undefined)}
                        >
                            <Input.Password disabled={item.disabled ? true : false} />
                        </Form.Item>
                    );
                else if (item.type == FormDataType.TextArea)
                    return (
                        <Form.Item
                            name={item.name}
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                            rules={getRulesWithNoSpacesValidator(
                                item.rules!,
                                t('messages:error-space')
                            )}
                            normalize={(value) => (value ? value : undefined)}
                        >
                            <Input.TextArea
                                disabled={item.disabled ? true : false}
                                maxLength={item.maxLength ? item.maxLength : undefined}
                            />
                        </Form.Item>
                    );
                else if (item.type == FormDataType.Dropdown)
                    return (
                        <Form.Item
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            name={item.name}
                            rules={item.rules!}
                            initialValue={item.initialValue}
                        >
                            <Select
                                disabled={item.disabled ? true : false}
                                allowClear
                                showSearch
                                filterOption={(inputValue, option) =>
                                    option!.props.children
                                        .toUpperCase()
                                        .indexOf(inputValue.toUpperCase()) !== -1
                                }
                                mode={item.mode ? item.mode : false}
                            >
                                {item.subOptions?.map((option: FormOptionType) => (
                                    <Select.Option key={option.key} value={option.key}>
                                        {option.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    );
                else if (item.type == FormDataType.Calendar) {
                    return (
                        <Form.Item
                            name={item.name}
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                            rules={item.rules!}
                        >
                            {item.initialValue ? (
                                <DatePicker
                                    format={localeDateTimeFormat}
                                    locale={router.locale === 'fr' ? fr_FR : en_US}
                                    showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                                    defaultValue={item.initialValue}
                                />
                            ) : (
                                <DatePicker
                                    format={localeDateTimeFormat}
                                    locale={router.locale === 'fr' ? fr_FR : en_US}
                                    showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                                />
                            )}
                        </Form.Item>
                    );
                } else if (item.type == FormDataType.AutoComplete) {
                    return <AutoComplete item={item} key={item.name} />;
                } else if (item.type == FormDataType.File)
                    return (
                        <Form.Item
                            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
                            key={item.name}
                        >
                            <DraggerInput
                                setValues={props.setValues}
                                editValue={props.imageData ?? undefined}
                            />
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
                            <Checkbox disabled={item.disabled ? true : false}>
                                {item.displayName ? item.displayName : t(`d:${item.name}`)}
                            </Checkbox>
                        </Form.Item>
                    );
            })}
        </>
    );
};

FormGroup.displayName = 'FormGroup';

export { FormGroup };
