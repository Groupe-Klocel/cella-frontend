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
import Link from 'next/link';
import { ComponentProps, FC } from 'react';

// Client-side navigation link (no full app reload). Pass a locale-less relative href
// (e.g. `/articles/123`): next/link prefixes the active locale itself. The `ant-typography`
// class keeps the exact look the previous Typography.Link had — color, bold and hover come
// from the compiled themes (public/*-theme.css), which also handle the dark theme.
const AppLink: FC<ComponentProps<typeof Link>> = ({ className, children, ...props }) => {
    return (
        <Link className={className ? `ant-typography ${className}` : 'ant-typography'} {...props}>
            {children}
        </Link>
    );
};

AppLink.displayName = 'AppLink';

export { AppLink };
