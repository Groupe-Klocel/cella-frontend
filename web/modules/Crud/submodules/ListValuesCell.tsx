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
import { AppLink } from '@components';
import { Popover, Tag, theme } from 'antd';
import { CSSProperties, FC, ReactNode } from 'react';

/**
 * A list cell: a column bound to a to-many relation (`carrierShippingModes{name}`) or to a JSON
 * array holds several values for one record, which `flatten(item, { arraysAsLists: true })`
 * hands over as an array (an array of arrays for a list inside a list).
 *
 * A single value renders like any other cell. From two values on, the cell shows the first
 * value(s) as tags and a "+N" tag; hovering or clicking "+N" opens a popover listing every value
 * under the column title. A nested list is counted by its leaves, and the popover groups them
 * under the label of each parent element.
 */
export interface IListValuesCellProps {
    values: any[];
    /** how many values stay visible in the row before the "+N" tag (default 1) */
    visibleCount?: number;
    /** formats a single value (dates, booleans, ...); defaults to the raw value */
    renderValue?: (value: any, index: number) => ReactNode;
    /**
     * the href of one value when the column carries a link, by index in `values`; a nested
     * list is never linked (its ids are nested too)
     */
    hrefFor?: (index: number) => string | undefined;
    /** heading of the popover, normally the column title */
    title?: ReactNode;
    /**
     * list inside a list (`values` is an array of arrays): the labels of the parent elements,
     * aligned on `values` (`articleLus_name` for the barcodes of each logistic unit)
     */
    groupLabels?: any[];
}

const ellipsis: CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

const isEmptyValue = (value: any) => value === null || value === undefined || value === '';

const flattenDeep = (list: any[]): any[] =>
    list.flatMap((value) => (Array.isArray(value) ? flattenDeep(value) : [value]));

const ListValuesCell: FC<IListValuesCellProps> = ({
    values,
    visibleCount = 1,
    renderValue,
    hrefFor,
    title,
    groupLabels
}) => {
    const { token } = theme.useToken();

    const raw = Array.isArray(values) ? values : [values];
    const nested = raw.some(Array.isArray);

    // the values to show, each with its index in `values` so a link can find its id; null,
    // undefined and '' elements (a relation row without a name) carry nothing to show
    const entries = (nested ? flattenDeep(raw) : raw)
        .map((value, index) => ({ value, index }))
        .filter((entry) => !isEmptyValue(entry.value));

    if (entries.length === 0) return null;

    const format = (value: any, index: number): ReactNode =>
        renderValue
            ? renderValue(value, index)
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value);

    const content = (entry: { value: any; index: number }) => {
        const node = format(entry.value, entry.index);
        const href = !nested && hrefFor ? hrefFor(entry.index) : undefined;
        return href ? <AppLink href={href}>{node}</AppLink> : node;
    };

    // the popover: one value per line, grouped under each parent element for a nested list
    const groups = nested
        ? raw
              .map((sub, index) => ({
                  label: groupLabels?.[index] ?? index + 1,
                  values: flattenDeep(Array.isArray(sub) ? sub : [sub]).filter(
                      (value) => !isEmptyValue(value)
                  )
              }))
              .filter((group) => group.values.length > 0)
        : [{ label: undefined, values: entries }];

    const fullList = (
        <div style={{ maxHeight: 300, overflowY: 'auto', minWidth: 180 }}>
            {groups.map((group, groupIndex) => (
                <div
                    key={groupIndex}
                    style={{
                        padding: '3px 0',
                        borderTop: groupIndex === 0 ? undefined : `1px solid ${token.colorSplit}`
                    }}
                >
                    {group.label !== undefined && (
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: token.colorTextSecondary
                            }}
                        >
                            {String(group.label)} ({group.values.length})
                        </div>
                    )}
                    {group.values.map((item: any, index: number) => {
                        const entry = nested ? { value: item, index } : item;
                        return (
                            <div
                                key={index}
                                style={{
                                    padding: '2px 0',
                                    paddingLeft: group.label !== undefined ? 10 : 0,
                                    borderTop:
                                        index === 0 || group.label !== undefined
                                            ? undefined
                                            : `1px solid ${token.colorSplit}`
                                }}
                            >
                                {content(entry)}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    // one value: nothing to fold, so no tag either - the cell reads like a scalar one
    if (entries.length === 1) return <>{content(entries[0])}</>;

    const visible = entries.slice(0, Math.max(1, visibleCount));
    const hidden = entries.length - visible.length;

    return (
        <div
            className="list-values-cell"
            style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}
        >
            {visible.map((entry) => (
                <Tag
                    key={entry.index}
                    style={{ marginInlineEnd: 0, minWidth: 0, maxWidth: '100%', ...ellipsis }}
                >
                    {content(entry)}
                </Tag>
            ))}
            {hidden > 0 && (
                <Popover
                    title={
                        title ? (
                            <>
                                {title} ({entries.length})
                            </>
                        ) : (
                            entries.length
                        )
                    }
                    content={fullList}
                    trigger={['hover', 'click']}
                    placement="bottomLeft"
                >
                    <Tag
                        className="list-values-more"
                        color="blue"
                        style={{ marginInlineEnd: 0, flexShrink: 0, cursor: 'pointer' }}
                    >
                        +{hidden}
                    </Tag>
                </Popover>
            )}
        </div>
    );
};

ListValuesCell.displayName = 'ListValuesCell';

export { ListValuesCell };
