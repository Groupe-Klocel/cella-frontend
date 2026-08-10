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

// Daily inbound pallet capacity.
//
// The cap itself is configuration, held in the INBOUND_MAX_CAPACITY business rule so a warehouse
// can change it (and vary it by season) without a release. Consumption is computed from the
// appointments' `content` JSON.
//
// WHAT COUNTS. The sum of the truck-composition quantities (`content.palettes`). `palettePlaces`
// is deliberately NOT counted: it is a separate declaration of the footprint, and mixing the two
// would double-count a carrier who fills in both.
//
// WHAT A "DAY" IS. Appointment dates come back as naive, offset-less strings and the whole UI
// treats them as UTC (`parseUtcToLocalDate` is `dayjs.utc(v).local()`), while the calendar renders
// local. The capacity day is therefore the user's LOCAL calendar day — the day the carrier picks
// in the date picker and the day the planner reads off the column right above the indicator.
// Anything else makes the figure disagree with the calendar it sits on. Warehouses whose operating
// day crosses local midnight will see a cap split over two days; that needs a shift-aware
// boundary and is out of scope.
//
// FAIL-OPEN. `executeRule` throws when the rule does not exist or has no rows, and returns `{}`
// when rows exist but none match. Both mean "no cap configured on this warehouse", which must
// never block a booking — most warehouses will never configure this.

import { gql } from 'graphql-request';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getInboundAppointmentTypeCodes } from './loadDirection';
import { resolveAppointmentStatusCodes } from './appointmentStatuses';
import { ConfigOrParamItem } from './visitorManagement';

dayjs.extend(utc);

export const INBOUND_MAX_CAPACITY_RULE = 'INBOUND_MAX_CAPACITY';

/**
 * Total pallets declared by one appointment's `content`.
 * `content` may arrive already parsed or as a JSON string depending on the path, so both are
 * handled (the appointment form and the detail page both do the same dance).
 */
export const appointmentPalletCount = (content: any): number => {
    let raw = content;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return 0;
        }
    }
    const palettes = raw?.palettes;
    if (!palettes || typeof palettes !== 'object') return 0;
    return Object.values(palettes).reduce((sum: number, v: any) => {
        const n = Number(v);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
};

/** The naive-UTC window covering a local calendar day, in the form the API filters expect. */
export const localDayUtcWindow = (day: Dayjs): { start: string; end: string } => ({
    start: day.startOf('day').utc().format('YYYY-MM-DDTHH:mm:ss'),
    end: day.endOf('day').utc().format('YYYY-MM-DDTHH:mm:ss')
});

/**
 * The configured cap for a day, or `null` when this warehouse has no cap.
 *
 * The rule's in-params are declared as `Number` on purpose: the rules admin screen only offers the
 * `>=` / `<=` operators for numeric params, so a validity window is only expressible if the day is
 * passed as a `YYYYMMDD` integer. `20260805 >= 20260101` carries exactly the intended meaning.
 */
export const fetchInboundMaxPalettesPerDay = async (
    graphqlRequestClient: any,
    day: Dayjs
): Promise<number | null> => {
    const dayKey = Number(day.format('YYYYMMDD'));
    try {
        const res: any = await graphqlRequestClient.request(
            gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "${INBOUND_MAX_CAPACITY_RULE}", context: $context)
                }
            `,
            { context: { begin_date_yyyymmdd: dayKey, end_date_yyyymmdd: dayKey } }
        );
        const out = res?.executeRule;
        // tolerant read, in the spirit of parseDocumentNames: the named out-param, a bare value,
        // or the first object entry's value
        let value: any = out?.max_palettes_per_day?.value ?? out?.value;
        if (value == null && out && typeof out === 'object') {
            const first: any = Object.values(out)[0];
            value = first && typeof first === 'object' && 'value' in first ? first.value : first;
        }
        const max = Number(value);
        // a non-numeric or non-positive cap is treated as "not configured" rather than as zero,
        // which would otherwise block every booking on the warehouse
        return Number.isFinite(max) && max > 0 ? max : null;
    } catch (e) {
        // rule missing / no rows / network: no cap configured -> never block
        return null;
    }
};

export interface DayPalletUsage {
    used: number;
    count: number;
    /** true when the API had more rows than were returned, so `used` is a floor */
    truncated: boolean;
}

/**
 * Pallets already booked inbound on a day.
 *
 * Only inbound appointment types count. Cancelled / Refused / No Show are excluded — everything
 * else, In Creation and Submitted included, is a truck that has claimed capacity in the planner's
 * mental model, and excluding Submitted would let carriers over-book by racing.
 */
export const fetchInboundPalletsUsedForDay = async (
    graphqlRequestClient: any,
    configs: ConfigOrParamItem[] | undefined,
    day: Dayjs,
    excludeAppointmentId?: string
): Promise<DayPalletUsage> => {
    const inboundTypes = getInboundAppointmentTypeCodes(configs);
    if (inboundTypes.length === 0) return { used: 0, count: 0, truncated: false };

    const statusCodes = resolveAppointmentStatusCodes(configs);
    const excludedStatuses = [
        statusCodes.cancelled,
        statusCodes.refused,
        statusCodes.noShow
    ].filter((c) => c != null) as number[];

    const { start, end } = localDayUtcWindow(day);
    const advancedFilters: any[] = [
        { filter: [{ field: { appointmentDateBegin: start }, searchType: 'SUPERIOR_OR_EQUAL' }] },
        { filter: [{ field: { appointmentDateBegin: end }, searchType: 'INFERIOR_OR_EQUAL' }] }
    ];
    if (excludedStatuses.length > 0) {
        advancedFilters.push({
            filter: [{ field: { status: excludedStatuses }, searchType: 'DIFFERENT' }]
        });
    }

    const res: any = await graphqlRequestClient.request(
        gql`
            query dayInboundPallets(
                $filters: AppointmentSearchFilters
                $advancedFilters: [AppointmentAdvancedSearchFilters!]
            ) {
                appointments(
                    filters: $filters
                    advancedFilters: $advancedFilters
                    page: 1
                    itemsPerPage: 1000
                ) {
                    count
                    results {
                        id
                        content
                    }
                }
            }
        `,
        { filters: { appointmentType: inboundTypes }, advancedFilters }
    );

    const results: any[] = res?.appointments?.results ?? [];
    const count: number = res?.appointments?.count ?? results.length;
    // On edit, the appointment's own pallets are already in the total; drop them client-side
    // (there is no "id !=" filter idiom in this codebase, and the page size is bounded).
    const used = results
        .filter((a) => !excludeAppointmentId || String(a.id) !== String(excludeAppointmentId))
        .reduce((sum, a) => sum + appointmentPalletCount(a.content), 0);

    return { used, count, truncated: count > results.length };
};
