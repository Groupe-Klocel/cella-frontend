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
import { SelectOutlined } from '@ant-design/icons';
import { getModesFromPermissions, resolveEntityRoute } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import Link from 'next/link';
import { ReactNode } from 'react';

// The synthetic scheme the assistant is taught to emit for records it actually retrieved:
// cella://<entity>/<id> (entity = the backend's camelCase entity name, id = the record's id).
const CELLA_LINK_RE = /^cella:\/\/([A-Za-z][A-Za-z0-9_]*)\/([A-Za-z0-9-]+)$/;

/**
 * markdown-to-jsx override for `a` inside CellaBot messages.
 *
 * - `cella://<entity>/<id>` hrefs become in-app next/link navigation to the entity's detail page
 *   (locale handled natively, the chat drawer stays open) — but only when the entity is registered
 *   in `entityRoutes` AND the user holds READ on its table; otherwise the label renders as plain
 *   text (never a broken or unauthorized link).
 * - Every other href keeps the previous behavior (new tab), except non-http(s) schemes which are
 *   dropped to plain text as a safety net (the LLM authors these hrefs).
 */
const CellaBotEntityLink = ({
    href,
    children,
    ...rest
}: {
    href?: string;
    children?: ReactNode;
    [key: string]: any;
}) => {
    const { permissions } = useAppState();

    const match = typeof href === 'string' ? href.match(CELLA_LINK_RE) : null;
    if (match) {
        const route = resolveEntityRoute(match[1]);
        const canRead = route
            ? getModesFromPermissions(permissions, route.tableName).includes(ModeEnum.Read)
            : false;
        if (!route || !canRead) {
            return <>{children}</>;
        }
        return (
            <Link href={`/${route.path}/${encodeURIComponent(match[2])}`}>
                {children}
                <SelectOutlined style={{ fontSize: '0.85em', marginLeft: 3 }} />
            </Link>
        );
    }

    // `\/(?!\/)`: a single leading slash only — a protocol-relative `//host` would silently point
    // an "internal-looking" link at an external origin.
    if (typeof href !== 'string' || !/^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) {
        return <>{children}</>;
    }
    // Spread first: these hrefs are LLM-authored, the safety attributes must stay authoritative.
    return (
        <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
};

export default CellaBotEntityLink;
