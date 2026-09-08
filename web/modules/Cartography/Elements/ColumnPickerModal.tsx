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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Checkbox, Empty, Modal, Space, Tag, Typography } from 'antd';
import { FC, useEffect, useState } from 'react';

// Which columns of an aisle a single STRETCH carries. An aisle is rarely one unbroken rack row:
// a cross-aisle, a door or a machine cuts it, and each piece is laid somewhere else. So laying
// an aisle starts here — every column of the aisle, pre-ticked, and you untick the ones that
// belong to another stretch. The columns still unplaced are the ones pre-ticked on the next
// pass, so cutting an aisle in four is four laying gestures and nothing to remember in between.
//
// The ticks a stretch takes are removed from its siblings on write (see UPSERT_AISLE_SEGMENT):
// a column belongs to exactly one stretch, which is what keeps the cell map single-valued.

export interface IColumnPickerModalProps {
    open: boolean;
    aisle: string;
    // every column the aisle has, in natural order
    columns: string[];
    // the ones already carried by ANOTHER stretch — shown struck through, tickable all the same
    // (ticking one moves it to this stretch)
    takenElsewhere: Set<string>;
    initialSelected: string[];
    onCancel: () => void;
    onConfirm: (columns: string[]) => void;
}

const ColumnPickerModal: FC<IColumnPickerModalProps> = ({
    open,
    aisle,
    columns,
    takenElsewhere,
    initialSelected,
    onCancel,
    onConfirm
}: IColumnPickerModalProps) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string[]>(initialSelected);

    // reopening for another aisle (or another stretch) must not keep the previous ticks
    useEffect(() => {
        if (open) setSelected(initialSelected);
    }, [open, aisle, initialSelected]);

    return (
        <Modal
            open={open}
            title={`${t('d:aisle')} ${aisle} — ${t('common:columns-to-place')}`}
            okText={t('actions:confirm')}
            cancelText={t('messages:cancel')}
            okButtonProps={{ disabled: selected.length === 0 }}
            onCancel={onCancel}
            onOk={() => onConfirm(columns.filter((column) => selected.includes(column)))}
            width={560}
            data-testid="cartography-column-picker"
        >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                    {t('messages:columns-to-place-hint')}
                </Typography.Text>
                <Space size={4} wrap>
                    <Button size="small" onClick={() => setSelected([...columns])}>
                        {t('actions:select-all')}
                    </Button>
                    <Button size="small" onClick={() => setSelected([])}>
                        {t('actions:select-none')}
                    </Button>
                    <Tag color={selected.length > 0 ? 'blue' : 'warning'}>
                        {`${selected.length} / ${columns.length}`}
                    </Tag>
                </Space>
                {columns.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('messages:no-data')} />
                ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                        <Checkbox.Group
                            value={selected}
                            onChange={(values) => setSelected(values as string[])}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
                        >
                            {columns.map((column) => (
                                <Checkbox
                                    key={column}
                                    value={column}
                                    style={{ width: 96, marginInlineStart: 0 }}
                                >
                                    <span
                                        style={{
                                            textDecoration: takenElsewhere.has(column)
                                                ? 'line-through'
                                                : undefined
                                        }}
                                    >
                                        {column}
                                    </span>
                                </Checkbox>
                            ))}
                        </Checkbox.Group>
                    </div>
                )}
            </Space>
        </Modal>
    );
};

ColumnPickerModal.displayName = 'ColumnPickerModal';

export { ColumnPickerModal };
