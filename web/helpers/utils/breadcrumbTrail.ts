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
import { BreadcrumbType } from '../types/types';

/**
 * Breadcrumb trail — the breadcrumb follows the path the user actually travelled.
 *
 * Pages keep declaring their own static `routes` (`modules/<X>/Static/<x>Routes.ts`, plus the
 * dynamic items they append: record name, parent record…) and pass them to `HeaderContent` →
 * `GlobalBreadcrumb` exactly as before. What changed is what gets rendered: `GlobalBreadcrumb`
 * no longer displays those routes as-is, it *registers* them into a per-tab trail (sessionStorage)
 * and displays the trail:
 *
 *  - a page reached from another page (a link in a table, a detail link, an edit/add button, the
 *    back arrow, a CellaBot link…) is APPENDED to the trail: the previous page's last item becomes
 *    a link back to the exact URL that was visited (query string included);
 *  - clicking an item of the breadcrumb (or coming back to a page already in the trail with the
 *    browser history) TRUNCATES the trail back to that page;
 *  - clicking an item of the side menu RESETS the trail: the destination page shows its own static
 *    routes again (`SideMenu` calls `resetBreadcrumbTrailOnNavigation`).
 *
 * Merge rules, given the trail so far and the routes of the page being displayed:
 *  1. if the page is already in the trail (same pathname, or the static `path` of an item points to
 *     it), that item and everything after it are dropped and recomputed — "back to a previous page";
 *  2. the routes are compared with the trail item by item (by `breadcrumbName`). When the common
 *     prefix covers the static part of the routes — the leading translation keys (`menu:…`,
 *     `common:…`), i.e. the section labels and the list page — the page is a child of the trail's
 *     last page and only the items after the common prefix are appended (carrier → carrier
 *     shipping mode → …);
 *  3. otherwise the page was reached through a cross-entity link (article → location): only its
 *     dynamic items are appended (record names…), never the destination's section labels;
 *  4. a page always contributes at least its own item when it is new to the trail; the trail is
 *     capped (oldest items dropped).
 *
 * An empty trail (first page of the session, after a menu click, after a URL typed in the address
 * bar) renders the page's full static routes — the historical behaviour. The trail is cleared on
 * logout.
 *
 * Everything here is framework-free and pure except the small sessionStorage-backed store at the
 * bottom, so the merge rules can be reasoned about in isolation.
 */

export type BreadcrumbTrailItem = BreadcrumbType & {
    /** Locale-less pathname (no query/hash) of the page that contributed this item. */
    contributor: string;
    /**
     * Full URL (`router.asPath`) of the page this item stands for. Only set on the last item of a
     * page's contribution — the one representing the page itself — so section labels never become
     * links. Used as the "back to that page" link once the item is no longer the last one.
     */
    pageHref?: string;
};

export type BreadcrumbTrailReset = {
    /** Pathname the trail must restart from (destination of the clicked menu item), when known. */
    to: string | null;
    /** Pathname of the page displayed when the menu item was clicked. */
    from: string;
};

export type BreadcrumbTrailState = {
    trail: BreadcrumbTrailItem[];
    pendingReset: BreadcrumbTrailReset | null;
};

/** Longest trail kept; older items are dropped first. */
export const BREADCRUMB_TRAIL_MAX_LENGTH = 10;

const STORAGE_KEY = 'cella-breadcrumb-trail';

// `category:code` translation keys as used by the static routes (`menu:carriers`,
// `actions:add-carrier`, `common:rule-config-in`). Record names built at runtime are not keys.
const TRANSLATION_KEY_PATTERN = /^[a-z][a-z0-9_-]*:[A-Za-z0-9_-]+$/;

// Items rendered as "undefined" (`${data?.name}`, `Line ${data?.lineNumber}`…) while a detail page
// is still loading its record — never worth keeping in the trail, the page re-registers its routes
// once the data is there.
const PLACEHOLDER_PATTERN = /(^|\s)(undefined|null)(\s|$)/;

/** `/fr-FR/carriers/1?tab=2#x` → `/carriers/1` (locale prefix optional, query and hash dropped). */
export const toBreadcrumbPathname = (
    url: string | undefined | null,
    locales?: readonly string[] | null
): string => {
    if (typeof url !== 'string' || url.length === 0) {
        return '';
    }
    let pathname = url.split('#')[0].split('?')[0];
    // absolute URLs (the BI link) → keep only the path
    const absolute = pathname.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/.*)?$/i);
    if (absolute) {
        pathname = absolute[1] ?? '/';
    }
    if (locales && locales.length > 0) {
        const firstSegment = pathname.split('/')[1];
        if (firstSegment && locales.includes(firstSegment)) {
            pathname = pathname.slice(firstSegment.length + 1) || '/';
        }
    }
    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    return pathname;
};

const isTranslationKey = (name: string): boolean => TRANSLATION_KEY_PATTERN.test(name);

const isPlaceholder = (item: BreadcrumbType): boolean =>
    typeof item?.breadcrumbName !== 'string' ||
    item.breadcrumbName.trim() === '' ||
    PLACEHOLDER_PATTERN.test(item.breadcrumbName);

/**
 * Number of leading items that belong to the static part of a page's routes: the section labels
 * and the list page (all translation keys). Everything after it is dynamic (record names…).
 */
export const staticPrefixLength = (routes: BreadcrumbType[]): number => {
    const index = routes.findIndex((item) => !isTranslationKey(item.breadcrumbName));
    return index === -1 ? routes.length : index;
};

// Two items designate the same thing when their labels match and their static paths (when both
// have one) agree. A trail item without a static path (a record name contributed by a detail page)
// matches the same record name carrying a path in a child page's routes.
const isSameItem = (a: BreadcrumbType, b: BreadcrumbType): boolean =>
    a.breadcrumbName === b.breadcrumbName &&
    (!a.path || !b.path || toBreadcrumbPathname(a.path) === toBreadcrumbPathname(b.path));

const commonPrefixLength = (trail: BreadcrumbType[], routes: BreadcrumbType[]): number => {
    let length = 0;
    while (length < trail.length && length < routes.length) {
        if (!isSameItem(trail[length], routes[length])) {
            break;
        }
        length += 1;
    }
    return length;
};

const contribute = (
    items: BreadcrumbType[],
    contributor: string,
    pageHref: string
): BreadcrumbTrailItem[] =>
    items.map((item, index) => {
        const trailItem: BreadcrumbTrailItem = {
            breadcrumbName: item.breadcrumbName,
            contributor
        };
        if (item.path) {
            trailItem.path = item.path;
        }
        if (index === items.length - 1) {
            trailItem.pageHref = pageHref;
        }
        return trailItem;
    });

const cap = (trail: BreadcrumbTrailItem[]): BreadcrumbTrailItem[] =>
    trail.length > BREADCRUMB_TRAIL_MAX_LENGTH
        ? trail.slice(trail.length - BREADCRUMB_TRAIL_MAX_LENGTH)
        : trail;

/** A trail made of the page's own routes only — what the breadcrumb used to display. */
export const freshBreadcrumbTrail = (
    routes: BreadcrumbType[],
    asPath: string
): BreadcrumbTrailItem[] => {
    const pageRoutes = routes.filter((item) => !isPlaceholder(item));
    return cap(contribute(pageRoutes, toBreadcrumbPathname(asPath), asPath));
};

/**
 * Merge the routes of the page being displayed (at `asPath`) into the trail. Pure.
 */
export const mergeBreadcrumbTrail = (
    trail: BreadcrumbTrailItem[],
    routes: BreadcrumbType[],
    asPath: string
): BreadcrumbTrailItem[] => {
    const pageRoutes = routes.filter((item) => !isPlaceholder(item));
    if (pageRoutes.length === 0) {
        return trail;
    }
    // the page is still loading the record it stands for: its routes are not final (the record
    // name and its parents are missing), so the trail is left as it is until it registers again
    // — except when there is nothing to show yet
    const isLoading = isPlaceholder(routes[routes.length - 1]);
    if (isLoading && trail.length > 0) {
        return trail;
    }
    const pathname = toBreadcrumbPathname(asPath);

    // 1. back to a page already in the trail: drop it and everything after it, then recompute
    //    its contribution from the routes it displays now (record loaded, query changed…).
    const knownIndex = trail.findIndex(
        (item) =>
            item.contributor === pathname ||
            (typeof item.path === 'string' && toBreadcrumbPathname(item.path) === pathname)
    );
    const base = knownIndex === -1 ? trail : trail.slice(0, knownIndex);
    if (base.length === 0) {
        return freshBreadcrumbTrail(pageRoutes, asPath);
    }

    // 2. child of the trail's last page, or 3. cross-entity jump
    const overlap = commonPrefixLength(base, pageRoutes);
    const staticLength = staticPrefixLength(pageRoutes);
    let contribution: BreadcrumbType[];
    if (overlap >= staticLength) {
        if (overlap === pageRoutes.length) {
            // the page's hierarchy is already displayed (e.g. the edit form of the record the trail
            // ends with): nothing to add, and nothing deeper than the page can stay either
            return cap(base.slice(0, overlap));
        }
        contribution = pageRoutes.slice(overlap);
    } else {
        contribution = pageRoutes.slice(staticLength);
    }
    // a parent item pointing to a page already in the trail brings nothing: that page has its own
    // item (a shipping mode names its carrier by code where the carrier page used the name…)
    const isKnownPage = (item: BreadcrumbType): boolean => {
        const target = typeof item.path === 'string' ? toBreadcrumbPathname(item.path) : '';
        return (
            target !== '' &&
            base.some(
                (known) =>
                    known.contributor === target ||
                    (typeof known.path === 'string' && toBreadcrumbPathname(known.path) === target)
            )
        );
    };
    contribution = contribution.filter(
        (item, index) => index === contribution.length - 1 || !isKnownPage(item)
    );
    // 4. a page new to the trail is always represented by at least its own item
    if (contribution.length === 0) {
        contribution = [pageRoutes[pageRoutes.length - 1]];
    }
    // …unless the trail already ends with it: never display the same item twice in a row
    while (contribution.length > 0 && isSameItem(base[base.length - 1], contribution[0])) {
        contribution = contribution.slice(1);
    }
    if (contribution.length === 0) {
        return cap(base);
    }

    return cap([...base, ...contribute(contribution, pathname, asPath)]);
};

/**
 * Next state for a page registering its routes: applies a pending side-menu reset when the page is
 * its destination, otherwise merges. Pure.
 */
export const computeBreadcrumbTrail = (
    state: BreadcrumbTrailState,
    routes: BreadcrumbType[],
    asPath: string
): BreadcrumbTrailState => {
    const pathname = toBreadcrumbPathname(asPath);
    const { pendingReset } = state;
    if (pendingReset) {
        const isDestination = pendingReset.to
            ? pendingReset.to === pathname
            : pendingReset.from !== pathname;
        if (isDestination) {
            return { trail: freshBreadcrumbTrail(routes, asPath), pendingReset: null };
        }
        if (pendingReset.from !== pathname) {
            // the user went somewhere else than the clicked menu item: the reset is stale
            return {
                trail: mergeBreadcrumbTrail(state.trail, routes, asPath),
                pendingReset: null
            };
        }
    }
    return { trail: mergeBreadcrumbTrail(state.trail, routes, asPath), pendingReset };
};

// ---------------------------------------------------------------------------------------------
// Store: one trail per browser tab (sessionStorage), mirrored in memory. Nothing runs on the
// server, where the breadcrumb simply renders the page's static routes.
// ---------------------------------------------------------------------------------------------

let memoryTrail: BreadcrumbTrailItem[] | null = null;
let pendingReset: BreadcrumbTrailReset | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined';

const readStoredTrail = (): BreadcrumbTrailItem[] => {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter(
                  (item) =>
                      item &&
                      typeof item.breadcrumbName === 'string' &&
                      typeof item.contributor === 'string'
              )
            : [];
    } catch {
        return [];
    }
};

const writeStoredTrail = (trail: BreadcrumbTrailItem[]): void => {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
    } catch {
        // storage unavailable (private mode, quota): the in-memory trail still works for this page
    }
};

// A URL typed in the address bar (or a link from another application) starts a new journey; a
// reload (F5, `router.reload()`) or a history restoration keeps the trail.
const isHardNavigation = (): boolean => {
    try {
        const entry = window.performance?.getEntriesByType?.('navigation')?.[0] as
            | PerformanceNavigationTiming
            | undefined;
        return entry?.type === 'navigate';
    } catch {
        return false;
    }
};

/** The trail as currently stored for this tab (empty on the server). */
export const getBreadcrumbTrail = (): BreadcrumbTrailItem[] => {
    if (!isBrowser()) {
        return [];
    }
    if (memoryTrail === null) {
        memoryTrail = isHardNavigation() ? [] : readStoredTrail();
        if (memoryTrail.length === 0) {
            writeStoredTrail(memoryTrail);
        }
    }
    return memoryTrail;
};

const commit = (state: BreadcrumbTrailState): void => {
    memoryTrail = state.trail;
    pendingReset = state.pendingReset;
    writeStoredTrail(state.trail);
};

/** What the breadcrumb of the page at `asPath` will display — without touching the store. */
export const previewBreadcrumbTrail = (
    routes: BreadcrumbType[],
    asPath: string
): BreadcrumbTrailItem[] =>
    computeBreadcrumbTrail({ trail: getBreadcrumbTrail(), pendingReset }, routes, asPath).trail;

/** Register the routes of the page at `asPath` and return the trail to display. */
export const registerBreadcrumbPage = (
    routes: BreadcrumbType[],
    asPath: string
): BreadcrumbTrailItem[] => {
    if (!isBrowser()) {
        return freshBreadcrumbTrail(routes, asPath);
    }
    const next = computeBreadcrumbTrail(
        { trail: getBreadcrumbTrail(), pendingReset },
        routes,
        asPath
    );
    commit(next);
    return next.trail;
};

/**
 * To call when the user clicks a side-menu item: the destination page (`href`, as rendered by
 * next/link — a locale prefix is tolerated) starts a fresh trail. `currentAsPath` is the page
 * displayed at click time, so a re-render of that page does not consume the reset.
 */
export const resetBreadcrumbTrailOnNavigation = (
    href: string | null | undefined,
    currentAsPath: string,
    locales?: readonly string[] | null
): void => {
    const to = toBreadcrumbPathname(href, locales);
    pendingReset = { to: to || null, from: toBreadcrumbPathname(currentAsPath) };
};

/** Forget the trail (logout). */
export const clearBreadcrumbTrail = (): void => {
    pendingReset = null;
    memoryTrail = [];
    if (isBrowser()) {
        writeStoredTrail([]);
    }
};
