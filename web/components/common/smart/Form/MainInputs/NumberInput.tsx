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
import { Form, InputNumber } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';

// return (
//     <Form.Item
//         name={item.name}
//         label={item.displayName ? item.displayName : t(`d:${item.name}`)}
//         key={item.name}
//         rules={item.rules!}
//         normalize={(value) => (value ? value : undefined)}
//         initialValue={item?.initialValue ? item?.initialValue : undefined}
//     >
//         <InputNumber style={{ width: '100%' }} precision={item.numberPrecision} />
//     </Form.Item>
// );

{
    /* <Form.Item
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
</Form.Item>; */
}

export interface IDraggerInputNumberProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: number;
        numberPrecision?: number;
        rules?: any[];
        disabled?: boolean;
        min?: number;
        max?: number;
        decimalSeparator?: string;
    };
    key?: string;
}

const NumberInput: FC<IDraggerInputNumberProps> = ({ item }) => {
    const { t } = useTranslation();

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            initialValue={item?.initialValue}
            rules={item.rules!}
        >
            <InputNumber
                disabled={item.disabled ? true : false}
                style={{ width: '100%' }}
                precision={item.numberPrecision}
                min={item.min}
                max={item.max}
                decimalSeparator={item.decimalSeparator ? item.decimalSeparator : '.'}
                formatter={(value: any) => value.replace(/,/g, '.')}
            />
        </Form.Item>
    );
};

NumberInput.displayName = 'NumberInput';

export default NumberInput;
