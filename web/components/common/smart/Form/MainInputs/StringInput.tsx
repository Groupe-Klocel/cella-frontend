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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import CaseJokerButton from '../SubInputs/CaseJokerButton';

export interface IDraggerInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        maxLength?: number;
        disabled?: boolean;
        rules?: any[];
    };
    key?: string;
    form?: any;
    filtersParameters?: boolean;
}

const StringInput: FC<IDraggerInputProps> = ({ item, form, filtersParameters }) => {
    const { t } = useTranslation();
    const contextForm = Form.useFormInstance();
    const formToUse = form ?? contextForm;

    // trim the entered text on blur/enter (normalize would prevent typing inner spaces)
    const trimValue = () => {
        const current = formToUse?.getFieldValue(item.name);
        const text = Array.isArray(current) ? current[1] : current;
        if (typeof text === 'string' && text !== text.trim()) {
            formToUse?.setFieldsValue({
                [item.name]: Array.isArray(current)
                    ? [current[0], text.trim()]
                    : text.trim() || undefined
            });
        }
    };

    const [selectCase, setSelectCase] = useState<boolean>(
        form?.getFieldValue(item.name)?.[0]?.includes('^') ? false : true
    );
    const [selectJoker, setSelectJoker] = useState<boolean>(
        form?.getFieldValue(item.name)?.[0]?.includes('%') ? true : false
    );

    const flags = `${selectJoker ? '%' : ''}${selectCase ? '' : '^'}`;

    useEffect(() => {
        if (filtersParameters && form) {
            const current = form.getFieldValue(item.name);
            const text = Array.isArray(current) ? current[1] : current;
            if (text) {
                form.setFieldsValue({ [item.name]: [flags, text] });
            }
        }
    }, [selectCase, selectJoker]);

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => {
                if (!value) return undefined;
                const text = Array.isArray(value) ? value[1] : value;
                return filtersParameters ? [flags, text] : text;
            }}
            getValueProps={(value) => ({ value: Array.isArray(value) ? value[1] : value })}
            initialValue={item?.initialValue ? item?.initialValue : undefined}
            rules={item.rules!}
        >
            <Input
                maxLength={item.maxLength}
                disabled={item.disabled ? true : false}
                onBlur={trimValue}
                onPressEnter={trimValue}
                suffix={
                    filtersParameters && (
                        <CaseJokerButton
                            item={item}
                            selectCase={selectCase}
                            setSelectCase={setSelectCase}
                            selectJoker={selectJoker}
                            setSelectJoker={setSelectJoker}
                        />
                    )
                }
            />
        </Form.Item>
    );
};

StringInput.displayName = 'StringInput';

export default StringInput;
