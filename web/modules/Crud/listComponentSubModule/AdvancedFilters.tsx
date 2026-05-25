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
import { FilterOutlined } from '@ant-design/icons';
import { Button, Form, Modal, Select, Space, Tag } from 'antd';
import { isNumeric, useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { FormGroupV3 } from '../submodules/FormGroupV3';

// ─── Constants ──────────────────────────────────────────────────────────────

export const searchTypes = [
    { labelKey: 'common:search-type-like', symbol: '~', value: 'LIKE' },
    { labelKey: 'common:search-type-ilike', symbol: '≈', value: 'ILIKE' },
    { labelKey: 'common:search-type-equals', symbol: '=', value: 'EQUAL' },
    { labelKey: 'common:search-type-contains', symbol: '∋', value: 'CONTAINS' },
    { labelKey: 'common:search-type-not-equal', symbol: '≠', value: 'DIFFERENT' },
    { labelKey: 'common:search-type-starts-with', symbol: '⊏', value: 'STARTS_WITH' },
    { labelKey: 'common:search-type-ends-with', symbol: '⊐', value: 'ENDS_WITH' },
    { labelKey: 'common:search-type-greater-than', symbol: '>', value: 'SUPERIOR' },
    { labelKey: 'common:search-type-greater-or-equal', symbol: '≥', value: 'SUPERIOR_OR_EQUAL' },
    { labelKey: 'common:search-type-less-than', symbol: '<', value: 'INFERIOR' },
    { labelKey: 'common:search-type-less-or-equal', symbol: '≤', value: 'INFERIOR_OR_EQUAL' },
    { labelKey: 'common:search-type-is-empty', symbol: '∅', value: 'EMPTY' },
    { labelKey: 'common:search-type-is-not-empty', symbol: '∉', value: 'NOT_EMPTY' }
];

// ─── AdvancedFilters (modal + open button) ──────────────────────────────────

interface AdvancedFiltersProps {
    filterFields: any[];
    advancedFilters: any[];
    defaultSubOptions?: any;
    setAllSubOptions: (v: any) => void;
    onFiltersChange: (newFilters: any[]) => void;
}

export const AdvancedFilters: FC<AdvancedFiltersProps> = ({
    filterFields,
    advancedFilters,
    defaultSubOptions,
    setAllSubOptions,
    onFiltersChange
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [advFilterField, setAdvFilterField] = useState<any>(null);
    const [advSearchType, setAdvSearchType] = useState<string>('EQUAL');
    const [form] = Form.useForm();

    function handleAdd() {
        if (!advFilterField || !advSearchType) return;
        const fieldValue = form.getFieldValue(advFilterField.name);
        let newFilter = {
            filter: [{ searchType: advSearchType, field: { [advFilterField.name]: fieldValue } }]
        };
        if (advSearchType === 'EMPTY') {
            newFilter = {
                filter: [
                    {
                        searchType: 'EQUAL',
                        field: { [advFilterField.name]: null }
                    }
                ]
            };
        }
        if (advSearchType === 'NOT_EMPTY') {
            newFilter = {
                filter: [
                    {
                        searchType: 'DIFFERENT',
                        field: { [advFilterField.name]: null }
                    }
                ]
            };
        }
        onFiltersChange([...advancedFilters, newFilter]);
        form.resetFields();
        setAdvFilterField(null);
        setAdvSearchType('EQUAL');
        setIsOpen(false);
    }

    function handleClose() {
        form.resetFields();
        setAdvFilterField(null);
        setAdvSearchType('EQUAL');
        setIsOpen(false);
    }

    const needValue = !['EMPTY', 'NOT_EMPTY'].includes(advSearchType);

    return (
        <>
            <Modal
                open={isOpen}
                title={t('actions:advanced-filter')}
                onOk={handleAdd}
                onCancel={handleClose}
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <div style={{ marginBottom: 4 }}>{t('d:field')}</div>
                        <Select
                            style={{ width: '100%' }}
                            options={filterFields
                                .filter((f: any) => f.name !== 'allFields')
                                .map((f: any) => ({ label: f.displayName, value: f.name }))}
                            onChange={(val: string) => {
                                if (advFilterField) form.resetFields([advFilterField.name]);
                                setAdvFilterField(
                                    filterFields.find((f: any) => f.name === val) ?? null
                                );
                            }}
                            showSearch
                            filterOption={(input, option) =>
                                String(option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            allowClear
                        />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4 }}>{t('d:operation')}</div>
                        <Select
                            style={{ width: '100%' }}
                            value={advSearchType}
                            options={searchTypes.map((o) => ({
                                label: t(o.labelKey),
                                value: o.value
                            }))}
                            onChange={(val: string) => setAdvSearchType(val)}
                        />
                    </div>
                    {advFilterField && needValue && (
                        <FormGroupV3
                            form={form}
                            item={{ ...advFilterField, initialValue: undefined }}
                            defaultSubOptions={defaultSubOptions}
                            setAllSubOptions={setAllSubOptions}
                            handleSubmit={handleAdd}
                        />
                    )}
                </Space>
            </Modal>
            <Button icon={<FilterOutlined />} onClick={() => setIsOpen(true)} />
        </>
    );
};

// ─── AdvancedFilterTags ──────────────────────────────────────────────────────

interface AdvancedFilterTagsProps {
    advancedFilters: any[];
    propAdvancedFilters?: any[];
    filterFields: any[];
    filteredLanguage: string;
    allSubOptions?: any[];
    onTagClose: (filter: any) => void;
}

export const AdvancedFilterTags: FC<AdvancedFilterTagsProps> = ({
    advancedFilters,
    propAdvancedFilters = [],
    filterFields,
    filteredLanguage,
    allSubOptions = [],
    onTagClose
}) => {
    const propAdvFiltersSet = new Set(propAdvancedFilters.map((f: any) => JSON.stringify(f)));
    const forcedStatusValues = [2000, 1005, 1600];

    const userAdvFilters = advancedFilters.filter((af: any) => {
        const fi = af.filter?.[0];
        if (!fi) return false;
        if (forcedStatusValues.includes(fi.field?.status) && fi.searchType === 'DIFFERENT')
            return false;
        if (propAdvFiltersSet.has(JSON.stringify(af))) return false;
        return true;
    });

    if (userAdvFilters.length === 0) return null;

    const resolveValue = (val: any, fieldDef: any): string => {
        // Check allSubOptions first
        const subOptionEntry = allSubOptions?.find((item: any) => item[fieldDef?.name]);
        if (subOptionEntry) {
            const option = subOptionEntry[fieldDef.name]?.find(
                (item: any) => String(item.key) === String(val)
            );
            if (option) return option.text ?? String(val);
        }
        if (fieldDef?.config && fieldDef.configList?.length) {
            const match = fieldDef.configList.find(
                (c: any) => String(isNumeric(c.code) ? parseInt(c.code) : c.code) === String(val)
            );
            if (match) return match?.translation?.[filteredLanguage] ?? match.value ?? String(val);
        } else if (fieldDef?.param && fieldDef.paramList?.length) {
            const match = fieldDef.paramList.find(
                (p: any) => String(parseInt(p.code)) === String(val)
            );
            if (match) return match?.translation?.[filteredLanguage] ?? match.value ?? String(val);
        }
        return String(val);
    };

    return (
        <div key="adv-filter-tags" style={{ marginTop: 4, width: '100%' }}>
            {userAdvFilters.map((af: any, index: number) => {
                const fi = af.filter[0];
                const fieldName = Object.keys(fi.field)[0];
                const rawValue = fi.field[fieldName];
                const fieldDef = filterFields.find((f: any) => f.name === fieldName);
                const displayName = fieldDef?.displayName ?? fieldName;
                const opSymbol =
                    searchTypes.find((o) => o.value === fi.searchType)?.symbol ?? fi.searchType;
                const displayValue: string = Array.isArray(rawValue)
                    ? fieldDef.type === 7
                        ? rawValue
                              .map((date: any) => (date ? new Date(date).toLocaleString() : '*'))
                              .join('->')
                        : rawValue.map((v) => resolveValue(v, fieldDef)).join(', ')
                    : resolveValue(rawValue, fieldDef);

                return (
                    <Tag
                        key={`adv-filter-${index}`}
                        color="geekblue"
                        style={{ margin: '2px' }}
                        closable
                        onClose={(e) => {
                            e.preventDefault();
                            onTagClose(af);
                        }}
                    >
                        {`${displayName} ${opSymbol} ${displayValue}`}
                    </Tag>
                );
            })}
        </div>
    );
};
