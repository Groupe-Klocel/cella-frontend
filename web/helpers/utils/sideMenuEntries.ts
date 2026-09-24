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
import { isValidElement, ReactNode, useMemo, useSyncExternalStore } from 'react';

/**
 * The navigable entries of the side menu, as a flat list — what the breadcrumb's menu picker
 * (`SideMenuAutoComplete`) and the home page (`modules/Home`) offer.
 *
 * `SideMenu` builds its antd items from the user's permissions and publishes the flattened result
 * here on every render (`publishSideMenuEntries`), together with the icons of its top-level
 * sections. Consumers therefore get exactly the pages the user is allowed to open, labels already
 * translated, without importing the SideMenu module: a customer repo may keep its own SideMenu
 * behind the SPE totem, and as long as that one does not publish, the store simply stays empty and
 * the picker / home navigation do not show up.
 */
export type SideMenuEntry = {
    /** antd menu key — unique across the menu */
    key: string;
    /** destination: a relative route (`/carriers`) or an absolute URL (the BI link) */
    href: string;
    /** translated label of the entry */
    title: string;
    /** translated labels of the enclosing groups, outermost first (`['Configuration', 'Cartography']`) */
    section: string[];
};

/** A top-level section of the side menu with its entries (sub-groups stay in `entry.section`). */
export type SideMenuSection = {
    /** translated label of the section — the first item of its entries' `section` */
    label: string;
    /** the section's menu icon, when the menu has one */
    icon?: ReactNode;
    entries: SideMenuEntry[];
};

const textOf = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') {
        return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(textOf).join('');
    }
    if (isValidElement(node)) {
        return textOf((node.props as { children?: ReactNode }).children);
    }
    return '';
};

/**
 * Flatten antd menu items (`{ key, label, children? }`, labels being `<Link href>` elements for
 * the navigable ones) into entries. Groups contribute their label to the `section` of their
 * descendants; items whose label carries no `href` are skipped.
 */
export const flattenSideMenuItems = (items: unknown, section: string[] = []): SideMenuEntry[] => {
    if (!Array.isArray(items)) {
        return [];
    }
    const entries: SideMenuEntry[] = [];
    items.forEach((item: any) => {
        if (!item || typeof item !== 'object') {
            return;
        }
        if (Array.isArray(item.children)) {
            const groupLabel = textOf(item.label);
            entries.push(
                ...flattenSideMenuItems(
                    item.children,
                    groupLabel ? [...section, groupLabel] : section
                )
            );
            return;
        }
        const href = isValidElement(item.label)
            ? (item.label.props as { href?: unknown }).href
            : undefined;
        if (typeof href !== 'string' || href === '') {
            return;
        }
        const title = textOf(item.label);
        if (!title) {
            return;
        }
        entries.push({ key: String(item.key ?? href), href, title, section });
    });
    return entries;
};

/** Icons of the top-level menu items, by their (translated) label. */
export const collectSideMenuSectionIcons = (items: unknown): Record<string, ReactNode> => {
    const icons: Record<string, ReactNode> = {};
    if (!Array.isArray(items)) {
        return icons;
    }
    items.forEach((item: any) => {
        if (!item || typeof item !== 'object' || !item.icon) {
            return;
        }
        const label = textOf(item.label);
        if (label) {
            icons[label] = item.icon;
        }
    });
    return icons;
};

/** Accent- and case-insensitive comparison key. */
export const normalizeForSearch = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

/** Does the entry (its label or one of its groups) contain what the user typed? */
export const matchesSideMenuEntry = (entry: SideMenuEntry, input: string): boolean => {
    const needle = normalizeForSearch(input);
    if (!needle) {
        return true;
    }
    return normalizeForSearch([...entry.section, entry.title].join(' ')).includes(needle);
};

/** Group entries by top-level section, in menu order. A top-level leaf (About) is its own section. */
export const groupSideMenuEntries = (
    entries: SideMenuEntry[],
    icons: Record<string, ReactNode> = {}
): SideMenuSection[] => {
    const sections: SideMenuSection[] = [];
    const byLabel = new Map<string, SideMenuSection>();
    entries.forEach((entry) => {
        const label = entry.section[0] ?? entry.title;
        let section = byLabel.get(label);
        if (!section) {
            section = { label, icon: icons[label], entries: [] };
            byLabel.set(label, section);
            sections.push(section);
        }
        section.entries.push(entry);
    });
    return sections;
};

// ---------------------------------------------------------------------------------------------
// Store: one snapshot for the whole app, refreshed by SideMenu, read through hooks.
// ---------------------------------------------------------------------------------------------

type Snapshot = { entries: SideMenuEntry[]; icons: Record<string, ReactNode> };

const EMPTY: Snapshot = { entries: [], icons: {} };
let snapshot: Snapshot = EMPTY;
let serialized = '[]|';
const listeners = new Set<() => void>();

/** Called by `SideMenu` after each render; no-op (and no re-render) when nothing changed. */
export const publishSideMenuEntries = (
    next: SideMenuEntry[],
    icons: Record<string, ReactNode> = {}
): void => {
    const nextSerialized = `${JSON.stringify(next)}|${Object.keys(icons).join(',')}`;
    if (nextSerialized === serialized) {
        return;
    }
    serialized = nextSerialized;
    snapshot = { entries: next, icons };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
const getSnapshot = (): Snapshot => snapshot;
const getServerSnapshot = (): Snapshot => EMPTY;

/** The side-menu entries the current user can open (empty until `SideMenu` has rendered once). */
export const useSideMenuEntries = (): SideMenuEntry[] =>
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).entries;

/** The same entries grouped by top-level section, with the section icons. */
export const useSideMenuSections = (): SideMenuSection[] => {
    const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return useMemo(() => groupSideMenuEntries(current.entries, current.icons), [current]);
};
