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
/**
 * The seasonal decorations of the header and the side menu (components/common/smart/Header,
 * components/layouts/MainLayout.tsx, through components/layouts/SeasonProvider.tsx, which
 * components/layouts/AppLayout.tsx mounts around every page): which season is on. The styles are
 * in styles/seasons.css, the scenes in components/common/smart/Header/SeasonDecor.tsx. One
 * animated scene per season (the former intensity levels 1 to 4 — a sober line, a glyph, a
 * watermark, a tinted bar, lighter festive scenes — are archived as a patch on the App Router branch, claude/inspiring-planck-geo5zz:
 * .claude/archive/seasonal-header-levels-1-to-4).
 *
 * Seasons (the browser's local dates, bounds included):
 *   Christmas  the whole of December (1 → 31)
 *   Halloween  the week of Halloween: October 25 → 31
 *   Easter     Easter Sunday and the six days after it (Easter Sunday → Easter Sunday + 6 days,
 *              Meeus / Jones / Butcher computus for the Sunday)
 *
 * The environment variable NEXT_PUBLIC_SEASONAL_DECORATIONS (`true`, helpers/configs/env.ts) offers
 * them in a deployment; then one setting, the user's: `globalParameters.valueJson.seasonalDecorations`,
 * in the settings drawer — off until the user switches them on (`true`). No warehouse parameter,
 * and nothing else decides: no override by the URL. To see a scene out of its season, change the
 * computer's date (the harness: Playwright's `page.clock.setFixedTime`).
 */
export type SeasonKey = 'christmas' | 'halloween' | 'easter';
/** `dark` = a dark bar, the header's texts in white. */
export type SeasonTone = 'light' | 'dark';
export type SeasonTheme = { season: SeasonKey; tone: SeasonTone };

export const SEASON_KEYS: SeasonKey[] = ['christmas', 'halloween', 'easter'];
/** The tone of each season's scene (a night sky, a pink meadow). */
export const SEASON_TONES: Record<SeasonKey, SeasonTone> = {
    christmas: 'dark',
    halloween: 'dark',
    easter: 'light'
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/** Easter Sunday (Gregorian calendar), Meeus / Jones / Butcher algorithm. */
export const easterSunday = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
};

/** The window of a season for a year, bounds included (none runs into the next year). */
export const getSeasonWindow = (season: SeasonKey, year: number): { start: Date; end: Date } => {
    switch (season) {
        case 'christmas':
            return { start: new Date(year, 11, 1), end: new Date(year, 11, 31) };
        case 'halloween':
            return { start: new Date(year, 9, 25), end: new Date(year, 9, 31) };
        case 'easter': {
            // Easter Sunday and the six days after it
            const sunday = easterSunday(year);
            return { start: sunday, end: addDays(sunday, 6) };
        }
    }
};

export const getSeasonForDate = (date: Date): SeasonKey | null => {
    const day = startOfDay(date);
    for (const season of SEASON_KEYS) {
        const { start, end } = getSeasonWindow(season, day.getFullYear());
        if (day >= start && day <= end) {
            return season;
        }
    }
    return null;
};

export const isSeasonKey = (value: unknown): value is SeasonKey =>
    typeof value === 'string' && (SEASON_KEYS as string[]).includes(value);

/** The season to show on `date`, none when the user has not switched the decorations on. */
export const resolveSeasonTheme = ({
    date,
    userEnabled
}: {
    date: Date;
    userEnabled: boolean;
}): SeasonTheme | null => {
    if (!userEnabled) {
        return null;
    }
    const season = getSeasonForDate(date);
    return season ? { season, tone: SEASON_TONES[season] } : null;
};
