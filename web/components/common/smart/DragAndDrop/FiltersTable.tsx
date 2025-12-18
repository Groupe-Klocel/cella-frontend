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
import React from 'react';
import { Form, Select } from 'antd';

interface FilterProps {
    filters: any;
    setFilters: (filters: any) => void;
    filterConfig: Array<{
        label: string;
        value: string;
        list: any[];
        width?: string;
        disabled?: boolean;
    }>;
    handleClear?: any;
}

const FiltersTable: React.FC<FilterProps> = ({
    filters,
    setFilters,
    filterConfig,
    handleClear
}) => {
    const handleChange = (key: string, value: any) => {
        setFilters((prevFilters: any) => {
            return { ...prevFilters, [key]: value };
        });
    };

    const renderSelect = (
        label: string,
        value: any,
        list: any[],
        key: string,
        width?: string,
        disabled?: boolean
    ) => (
        <Form.Item label={label} style={{ minWidth: width || '12%' }}>
            <Select
                allowClear
                value={value}
                onChange={(value) => handleChange(key, value)}
                onClear={() => handleClear(key)}
                disabled={disabled}
            >
                {list?.map((item: any) => (
                    <Select.Option key={item.id || item} value={item.code || item.id || item}>
                        {item.text || item.name || item}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>
    );

    return (
        <Form className="form-filter" layout="inline">
            {filterConfig.map(({ label, value, list, width, disabled }) =>
                renderSelect(label, filters[value], list, value, width, disabled)
            )}
        </Form>
    );
};

export default FiltersTable;
