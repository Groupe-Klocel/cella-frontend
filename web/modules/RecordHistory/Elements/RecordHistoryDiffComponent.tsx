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
import {
    flatten,
    getLanguageCode,
    useRecordHistoryDetail,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Divider, Table, Typography } from 'antd';
import configsJson from '../../../../common/configs.json';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Metadata columns that change on every update and would only add noise to a diff view.
const INTERNAL_KEYS = [
    'id',
    'created',
    'createdBy',
    'modified',
    'modifiedBy',
    'lastTransactionId',
    'extras'
];

// `flatten()` recurses every array element into the SAME key (no index), so only the last element
// survives — which would lose or misrepresent array-valued columns in the diff. Collapse arrays to a
// JSON string leaf first, so the whole array is preserved as a single comparable/renderable value.
const normalizeArrays = (value: any): any => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((acc: any, key) => {
            acc[key] = normalizeArrays(value[key]);
            return acc;
        }, {});
    }
    return value;
};

export interface IRecordHistoryDiffProps {
    // `next/router` query params can be string | string[] | undefined; normalized below.
    sequenceId?: string | string[];
}

const RecordHistoryDiffComponent = ({ sequenceId }: IRecordHistoryDiffProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const language = getLanguageCode(router);

    // Normalize to a single string so the hook (which does parseInt) always gets a scalar id.
    const resolvedSequenceId = Array.isArray(sequenceId) ? sequenceId[0] : (sequenceId ?? '');

    // Fetch the raw before/after JSON (unflattened) so we can pair keys cleanly, plus the raw
    // operationType code to gate this section to modifications only.
    const { detail, reload } = useRecordHistoryDetail(
        resolvedSequenceId,
        'recordHistory',
        ['operationType', 'objectBefore', 'objectAfter'],
        language
    );

    useEffect(() => {
        if (resolvedSequenceId) reload();
    }, [resolvedSequenceId, language]);

    const record = detail?.data?.recordHistory;
    if (!record) return <></>;

    // Only render for modifications (compare the raw code, not the localized label).
    if (record.operationType !== configsJson.OPERATION_TYPE_UPDATE) return <></>;

    const beforeFlat: any = flatten(normalizeArrays(record.objectBefore ?? {}));
    const afterFlat: any = flatten(normalizeArrays(record.objectAfter ?? {}));

    // Sort the keys so the diff rows are in a stable, deterministic order regardless of the
    // before/after object key insertion order.
    const keys = Array.from(new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]))
        .filter(
            (key) =>
                !INTERNAL_KEYS.some((internal) => key === internal || key.endsWith('_' + internal))
        )
        .sort();

    // useTranslationWithFallback returns the raw key ("d:<field>") when a label is missing; strip
    // the "d:" prefix in that case so the Field column shows the field name, not the namespaced key.
    const fieldLabel = (key: string) => {
        const translated = t(`d:${key}`);
        return translated === `d:${key}` ? key : translated;
    };

    const changed = keys
        .filter((key) => JSON.stringify(beforeFlat[key]) !== JSON.stringify(afterFlat[key]))
        .map((key) => ({
            key,
            field: fieldLabel(key),
            before: beforeFlat[key],
            after: afterFlat[key]
        }));

    if (changed.length === 0) return <></>;

    const renderCell = (value: any) => {
        if (value === null || value === undefined) return ' ';
        // flatten() can yield {} / [] (and nested objects/arrays) — String() would render those
        // as "[object Object]" or a lossy comma-join, so stringify non-null objects instead.
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const columns = [
        { title: t('d:field'), dataIndex: 'field', key: 'field' },
        {
            title: t('common:object-before'),
            dataIndex: 'before',
            key: 'before',
            render: renderCell
        },
        { title: t('common:object-after'), dataIndex: 'after', key: 'after', render: renderCell }
    ];

    return (
        <>
            <Divider />
            <Typography.Title level={5}>{t('common:modified-fields')}</Typography.Title>
            <Table
                columns={columns}
                dataSource={changed}
                pagination={false}
                size="small"
                rowKey="key"
            />
        </>
    );
};

RecordHistoryDiffComponent.displayName = 'RecordHistoryDiffComponent';

export { RecordHistoryDiffComponent };
