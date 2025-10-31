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
import { Form, Input } from 'antd';
import {
    useTranslationWithFallback as useTranslation,
    getRulesWithNoSpacesValidator
} from '@helpers';
import { FC } from 'react';

// return (
//     <Form.Item
//         name={item.name}
//         label={item.displayName ? item.displayName : t(`d:${item.name}`)}
//         key={item.name}
//         normalize={(value) => (value ? value : undefined)}
//         initialValue={item?.initialValue ? item?.initialValue : undefined}
//     >
//         <Input.TextArea maxLength={item.maxLength ? item.maxLength : 100} allowClear />
//     </Form.Item>
// );

{
    /* <Form.Item
    name={item.name}
    label={item.displayName ? item.displayName : t(`d:${item.name}`)}
    key={item.name}
    rules={getRulesWithNoSpacesValidator(item.rules!, t('messages:error-space'))}
    normalize={(value) => (value ? value : undefined)}
>
    <Input.TextArea
        disabled={item.disabled ? true : false}
        maxLength={item.maxLength ? item.maxLength : undefined}
    />
</Form.Item>; */
}

export interface IDraggerTextAreaInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        maxLength?: number;
        rules?: any[];
        disabled?: boolean;
    };
    key?: string;
}

const TextAreaInput: FC<IDraggerTextAreaInputProps> = ({ item }) => {
    const { t } = useTranslation();

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => (value ? value : undefined)}
            initialValue={item?.initialValue ? item?.initialValue : undefined}
            rules={getRulesWithNoSpacesValidator(item.rules!, t('messages:error-space'))}
        >
            <Input.TextArea
                maxLength={item.maxLength ? item.maxLength : 100}
                allowClear
                disabled={item.disabled ? true : false}
            />
        </Form.Item>
    );
};

TextAreaInput.displayName = 'TextAreaInput';

export default TextAreaInput;
