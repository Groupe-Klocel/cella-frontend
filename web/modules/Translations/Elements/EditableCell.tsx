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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { EditTwoTone } from '@ant-design/icons';
import { Button, Form, Input, Space } from 'antd';
import type { InputRef } from 'antd';
import { EditableContext } from './EditableRow';

interface Item {
    key: string;
    language: string;
    type: string;
    category: string;
    code: string;
    value: string;
    id?: string | null;
}

interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    dataIndex: keyof Item;
    record: Item;
    handleSave: (record: Item) => void;
    activeEditKey: string | null;
    setActiveEditKey: React.Dispatch<React.SetStateAction<string | null>>;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
    title,
    editable,
    children,
    dataIndex,
    record,
    handleSave,
    activeEditKey,
    setActiveEditKey,
    ...restProps
}) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<InputRef>(null);
    const form = useContext(EditableContext)!;
    const [initialValues, setInitialValues] = useState(record?.[dataIndex]);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
        }
    }, [editing]);

    const toggleEdit = () => {
        setEditing(!editing);
        form.setFieldsValue({ [dataIndex]: record[dataIndex] });
        setActiveEditKey(record?.id!);
        setInitialValues(record[dataIndex]);
    };

    const save = async () => {
        try {
            const values = await form.validateFields();
            if (values[dataIndex] !== initialValues) {
                handleSave({ ...record, ...values });
            }
            toggleEdit();
            setActiveEditKey(null);
            setInitialValues(null);
        } catch (errInfo) {
            console.log('Save failed:', errInfo);
        }
    };

    let childNode = children;

    if (editable) {
        childNode = editing ? (
            <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[{ required: true, message: `${title} is required.` }]}
            >
                <Input ref={inputRef} onPressEnter={save} onBlur={save} />
            </Form.Item>
        ) : (
            <Space>
                {children}
                <Button
                    icon={<EditTwoTone />}
                    disabled={activeEditKey !== null && activeEditKey !== record.key}
                    onClick={() => toggleEdit()}
                    style={{
                        border: 'none'
                    }}
                />
            </Space>
        );
    }

    return <td {...restProps}>{childNode}</td>;
};

export { EditableCell };
