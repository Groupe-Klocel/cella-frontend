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

// A searchable Select that shows "name — date" for a Load or Appointment candidate.
// AutoCompleteInput only renders a single field, so the assign pop-ups use this to expose the
// load expected shipping date / appointment start date (hidden when null) beside the name,
// while applying the direction/status/carrier advancedFilters.

import { Select } from 'antd';
import { debounce } from 'lodash';
import { buildListQuery, pluralize } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { FC, useCallback, useEffect, useState } from 'react';

export interface IDatedEntitySelectProps {
    table: 'Load' | 'Appointment';
    dateField: string; // e.g. loadExpectedShippingDate / appointmentDateBegin
    advancedFilters?: any[];
    value?: string;
    onChange?: (value: string | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
}

const formatDate = (value: any): string => {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '';
    }
};

const DatedEntitySelect: FC<IDatedEntitySelectProps> = ({
    table,
    dateField,
    advancedFilters,
    value,
    onChange,
    placeholder,
    disabled
}) => {
    const { graphqlRequestClient } = useAuth();
    const [options, setOptions] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    const queryName = pluralize(table.charAt(0).toLowerCase() + table.slice(1));
    const isAdvancedFilters = Array.isArray(advancedFilters) && advancedFilters.length > 0;

    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            const query = buildListQuery({
                tableName: table,
                queryName,
                fields: `id, name, ${dateField}`,
                withAdvancedFilters: isAdvancedFilters
            });
            const variables = {
                filters: { name: (search ?? '') + '%' },
                advancedFilters: isAdvancedFilters ? advancedFilters : undefined,
                orderBy: [{ field: 'name', ascending: true }],
                page: 1,
                itemsPerPage: 100
            };
            try {
                const res = await graphqlRequestClient.request(query, variables);
                if (active) setOptions(res?.[queryName]?.results ?? []);
            } catch (e) {
                console.error(`Error fetching ${queryName} options:`, e);
            }
        };
        fetchData();
        return () => {
            active = false;
        };
        // advancedFilters is compared by value (stringified) to avoid refetch loops from a
        // fresh array identity each render; the other inputs are listed directly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, JSON.stringify(advancedFilters), table, dateField, queryName, graphqlRequestClient]);

    const handleSearch = useCallback(
        debounce((v: string) => setSearch((v ?? '').trim()), 400),
        []
    );

    // cancel any pending debounced search when the component unmounts (avoids setSearch
    // firing on an unmounted component)
    useEffect(() => () => handleSearch.cancel(), [handleSearch]);

    return (
        <Select
            showSearch
            filterOption={false}
            onSearch={handleSearch}
            allowClear
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            style={{ width: '100%' }}
        >
            {options.map((o) => (
                <Select.Option key={o.id} value={o.id}>
                    {o[dateField] ? `${o.name} — ${formatDate(o[dateField])}` : o.name}
                </Select.Option>
            ))}
        </Select>
    );
};

DatedEntitySelect.displayName = 'DatedEntitySelect';

export default DatedEntitySelect;
