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
import { Collapse, Empty, Tag } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';

// Entities of the current level that have no parsable geometry yet. Click a tag to enter
// placing/laying mode (the shape then follows the cursor until the user clicks the canvas).

export interface IUnplacedTrayProps {
    items: { key: string; label: string }[];
    activeKey?: string | null;
    readOnly?: boolean;
    onPick: (key: string) => void;
}

const UnplacedTray: FC<IUnplacedTrayProps> = ({
    items,
    activeKey,
    readOnly,
    onPick
}: IUnplacedTrayProps) => {
    const { t } = useTranslation();
    // auto-open once the first items land (they arrive after the initial mount), then let the
    // user collapse/expand freely
    const [open, setOpen] = useState(items.length > 0);
    const autoOpenedRef = useRef(items.length > 0);
    useEffect(() => {
        if (!autoOpenedRef.current && items.length > 0) {
            autoOpenedRef.current = true;
            setOpen(true);
        }
    }, [items.length]);

    return (
        <Collapse
            size="small"
            style={{ marginTop: 12 }}
            activeKey={open ? ['tray'] : []}
            onChange={(keys) => setOpen(Array.isArray(keys) ? keys.length > 0 : !!keys)}
            data-testid="cartography-tray"
            items={[
                {
                    key: 'tray',
                    label: `${t('common:unplaced-items')} (${items.length})`,
                    children:
                        items.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {items.map((item) => (
                                    // antd Tag renders a plain span: role/tabIndex/Enter-Space
                                    // make it reachable and actionable from the keyboard
                                    <Tag
                                        key={item.key}
                                        color={item.key === activeKey ? 'orange' : 'blue'}
                                        style={{ cursor: readOnly ? 'default' : 'pointer' }}
                                        role={readOnly ? undefined : 'button'}
                                        tabIndex={readOnly ? undefined : 0}
                                        aria-pressed={readOnly ? undefined : item.key === activeKey}
                                        onClick={() => {
                                            if (!readOnly) onPick(item.key);
                                        }}
                                        onKeyDown={(event) => {
                                            if (readOnly) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onPick(item.key);
                                            }
                                        }}
                                    >
                                        {item.label}
                                    </Tag>
                                ))}
                            </div>
                        )
                }
            ]}
        />
    );
};

UnplacedTray.displayName = 'UnplacedTray';

export { UnplacedTray };
