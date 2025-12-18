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
import { Form, Checkbox } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';

// return (
//     <Form.Item
//         name={item.name}
//         valuePropName="checked"
//         initialValue={item.initialValue ? item.initialValue : false}
//         key={item.name}
//     >
//         <Checkbox>{t(`d:${item.name}`)}</Checkbox>
//     </Form.Item>
// );

export interface IDraggerInputNumberProps {
    item: {
        name: string;
        initialValue?: string;
        numberPrecision?: number;
    };
    key?: string;
}

const NumberInput: FC<IDraggerInputNumberProps> = ({ item }) => {
    const { t } = useTranslation();

    return (
        <Form.Item
            name={item.name}
            valuePropName="checked"
            initialValue={item.initialValue ? item.initialValue : false}
        >
            <Checkbox>{t(`d:${item.name}`)}</Checkbox>
        </Form.Item>
    );
};

NumberInput.displayName = 'NumberInput';

export default NumberInput;
