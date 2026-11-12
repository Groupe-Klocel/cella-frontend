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
import { useAppState } from 'context/AppContext';
import { IS_SEASONAL_DECORATIONS_ENABLED } from 'helpers/configs/env';
import { resolveSeasonTheme, SeasonTheme } from 'helpers/utils/season';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

/**
 * The seasonal decorations of the header and the side menu (Christmas, Halloween, Easter:
 * helpers/utils/season.ts for the dates and the user's setting, offered by the environment
 * variable NEXT_PUBLIC_SEASONAL_DECORATIONS — helpers/configs/env.ts —, the styles in
 * styles/seasons.css, the scenes in components/common/smart/Header/SeasonDecor.tsx): AppLayout
 * (components/layouts/AppLayout.tsx) mounts this provider inside the theme switcher, around the
 * layout of every page; the header, the main layout (the side menu's share) and the settings
 * drawer read it with `useSeason()`. Without the provider — the pages shown before the login —
 * there is no season and no setting shown.
 *
 * The season is the browser's date's, resolved after the mount so the server's HTML and the
 * hydration agree (the server does not know the browser's local date): the header shows plain
 * first, then dressed — once per full page load, AppLayout staying mounted across the Pages
 * Router's navigations. The date is read again every hour, for a season starting while the tab
 * stays open.
 */
type Season = {
    /** the season shown, null for none */
    theme: SeasonTheme | null;
    /** whether seasonal decorations exist here at all (the environment variable set): the setting is shown */
    available: boolean;
};

const SeasonContext = createContext<Season>({ theme: null, available: false });

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export const SeasonProvider = ({ children }: { children: ReactNode }) => {
    const { userSettings } = useAppState();
    // null until the mount: the server renders no season
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, []);

    const value = useMemo<Season>(() => {
        if (!IS_SEASONAL_DECORATIONS_ENABLED) return { theme: null, available: false };
        if (!now) return { theme: null, available: true };
        const general = (userSettings ?? []).find((item: any) => item.code === 'globalParameters');
        // off until the user switches them on
        const userEnabled = general?.valueJson?.seasonalDecorations === true;
        return {
            theme: resolveSeasonTheme({ date: now, userEnabled }),
            available: true
        };
    }, [now, userSettings]);

    return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
};

/** The season of the header, and whether decorations exist here (none under the Pages Router). */
export const useSeason = (): Season => useContext(SeasonContext);
