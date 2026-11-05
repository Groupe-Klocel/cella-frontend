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
import { SearchOutlined } from '@ant-design/icons';
import {
    matchesSideMenuEntry,
    resetBreadcrumbTrailOnNavigation,
    SideMenuEntry,
    useSideMenuEntries
} from '@helpers';
import { AutoComplete, Input } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { useRouter } from 'next/router';
import { CSSProperties, FC, useMemo, useState } from 'react';

export interface ISideMenuAutoCompleteProps {
    placeholder?: string;
    /**
     * Picker mode (default): the list is open from the start and `onClose` is called as soon as
     * it closes — an entry was chosen, the field lost focus or Escape was pressed — so the caller
     * can unmount it (the breadcrumb's first item). `persistent` mode is a regular search field
     * that stays in place: the list opens on focus / typing (the home page).
     */
    persistent?: boolean;
    onClose?: () => void;
    /** defaults to `true` in picker mode, `false` in persistent mode */
    autoFocus?: boolean;
    size?: 'small' | 'middle' | 'large';
    style?: CSSProperties;
    className?: string;
}

// a leaf option carries its entry; a group only carries its (translated) section label
type PickerOption = DefaultOptionType & { value: string; label: string; entry: SideMenuEntry };
type PickerGroup = DefaultOptionType & { label: string; options: PickerOption[] };
type PickerItem = PickerOption | PickerGroup;

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Search box over every side-menu entry the user is allowed to open (the list is the one
 * `SideMenu` publishes, so it follows the same permission checks), grouped by menu section.
 * Choosing an entry navigates there and, like a click in the side menu, starts a fresh breadcrumb
 * trail. Used by `GlobalBreadcrumb` behind its first item and by the home page.
 */
const SideMenuAutoComplete: FC<ISideMenuAutoCompleteProps> = ({
    placeholder,
    persistent = false,
    onClose,
    autoFocus,
    size = 'small',
    style,
    className
}: ISideMenuAutoCompleteProps) => {
    const router = useRouter();
    const entries = useSideMenuEntries();
    const [search, setSearch] = useState<string>('');

    // menu order is kept; entries of a same section are grouped under its (translated) path
    const options = useMemo<PickerItem[]>(() => {
        const result: PickerItem[] = [];
        const groups = new Map<string, PickerGroup>();
        entries.forEach((entry) => {
            const option: PickerOption = { value: entry.key, label: entry.title, entry };
            if (entry.section.length === 0) {
                result.push(option);
                return;
            }
            const groupLabel = entry.section.join(' › ');
            let group = groups.get(groupLabel);
            if (!group) {
                group = { label: groupLabel, options: [] };
                groups.set(groupLabel, group);
                result.push(group);
            }
            group.options.push(option);
        });
        return result;
    }, [entries]);

    const navigate = (href: string) => {
        if (ABSOLUTE_URL.test(href)) {
            window.location.assign(href);
            return;
        }
        resetBreadcrumbTrailOnNavigation(href, router.asPath, router.locales);
        router.push(href);
    };

    // with a custom input, antd wants size and placeholder on that input only (it warns otherwise)
    const fieldProps = persistent ? {} : { size, placeholder };

    return (
        <AutoComplete<string, PickerItem>
            {...fieldProps}
            className={className}
            style={{ minWidth: 220, ...style }}
            autoFocus={autoFocus ?? !persistent}
            open={persistent ? undefined : true}
            value={search}
            onSearch={setSearch}
            options={options}
            // groups must NOT match (rc-select would then keep all their children): each entry is
            // matched on its own, its section labels being part of what is searched
            filterOption={(input, option) =>
                !!option && 'entry' in option && matchesSideMenuEntry(option.entry, input)
            }
            onSelect={(_value, option) => {
                if ('entry' in option) {
                    setSearch('');
                    onClose?.();
                    navigate(option.entry.href);
                }
            }}
            onDropdownVisibleChange={(visible) => {
                if (!visible && !persistent) {
                    onClose?.();
                }
            }}
            popupMatchSelectWidth={persistent ? 560 : false}
            dropdownStyle={{ minWidth: 280 }}
            listHeight={360}
            notFoundContent={null}
            allowClear={persistent}
        >
            {persistent ? (
                <Input
                    size={size}
                    prefix={<SearchOutlined style={{ color: 'rgba(128, 128, 128, 0.6)' }} />}
                    placeholder={placeholder}
                    style={{ borderRadius: 24 }}
                />
            ) : undefined}
        </AutoComplete>
    );
};

SideMenuAutoComplete.displayName = 'SideMenuAutoComplete';

export { SideMenuAutoComplete };
