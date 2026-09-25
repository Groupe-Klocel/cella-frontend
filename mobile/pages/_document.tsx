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

// The mobile app is installable as a full-screen web app ("Add to Home screen" on a reception tablet
// or an RF handheld). The manifest has to be linked from EVERY page, whatever <AppHead> a page
// renders, so the link lives in this Document. Nothing else is customised here: no styled-components
// SSR sheet (unlike web/pages/_document.tsx), so the runtime behaviour of the pages is unchanged.
// `Html` carries no `lang`: Next derives it from the locale. The manifest itself is
// mobile/public/manifest.webmanifest; its icons are under mobile/public/images/ (pwa-*.png,
// apple-touch-icon.png - the latter is what AppHead already links).

import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html>
            <Head>
                <link rel="manifest" href="/manifest.webmanifest" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
