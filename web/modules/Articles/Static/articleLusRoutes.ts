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
// Breadcrumb of the packaging (article LU) screens. Kept in its own file rather than added to
// articlesRoutes.ts so that no upstream file has to be reconciled at each overload release.
// Breadcrumb names must match the DB translation codes.
// The last entry's `path` is what the pages use as their rootPath.
export const articleLusRoutes = [
    {
        breadcrumbName: 'menu:configuration'
    },
    {
        breadcrumbName: 'menu:articles',
        path: '/articles'
    },
    {
        breadcrumbName: 'menu:logistic-units',
        path: '/articles/lu'
    }
];

/**
 * A query parameter repeated in the URL arrives as a `string[]`. Everything downstream - breadcrumb
 * paths, form initial values - expects a single value, so keep the string form or nothing.
 */
export function singleQueryParam(value: any): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

/**
 * Coerces a `returnPath` taken from the URL query string to an in-app path, or `undefined` when it
 * is not one.
 *
 * The barcode-add flow carries where to go back to as a query parameter, and that value ends up in
 * `router.push(...)`. Two things can go wrong. A query parameter can be a `string[]` when it is
 * repeated in the URL, which would blow up at the push. And pushed as-is, a crafted link
 * (`?returnPath=https://evil.example`) turns an authenticated in-app URL into an open redirect - a
 * convenient phishing hop off a trusted domain. So only an in-app absolute path is accepted: it
 * must be a string starting with a single `/`, which rules out absolute URLs, protocol-relative
 * `//host` and the backslash variants browsers normalise to it.
 */
export function toInternalPath(value: any): string | undefined {
    if (typeof value !== 'string') return undefined;
    if (!value.startsWith('/')) return undefined;
    if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
    return value;
}

/** Same guard, for the call sites that must end up with a path. */
export function safeReturnPath(value: any, fallback: string): string {
    return toInternalPath(value) ?? fallback;
}
