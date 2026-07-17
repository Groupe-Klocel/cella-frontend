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
import { findCodeByScopeAndValue } from '@helpers';
import configsJson from '../../../common/configs.json';

export type StatusCodes = { available: number; occupied: number; disabled: number };

export type CellAgg = { total: number; occupied: number; disabled: number; available: number };

// One row of the grouped `locations(functions: [{function: "count", fields: ["id"]}])` query:
// the API groups by the selected scalar fields (aisle, column, status).
export type OccupancyGroupRow = {
    aisle: string | null;
    column: string | null;
    status: number;
    functionCount?: { id?: number } | null;
};

export type LocationLite = {
    id: string;
    name: string;
    column: string | null;
    level: string | null;
    position: string | null;
    status: number;
};

export type TopViewData = {
    aisles: string[];
    columns: string[];
    cells: Map<string, CellAgg>;
    totals: CellAgg;
};

export type FrontViewData = {
    columns: string[];
    levels: string[];
    cells: Map<string, LocationLite[]>;
    totals: CellAgg;
};

// aisle/column/level/position are free-form strings: NUL is the only safe separator
export const cellKey = (a: string, b: string): string => `${a}\u0000${b}`;

export const naturalCompare = (a: string, b: string): number =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// bulk blocks can leave aisle/column/level/position empty
export const axisValue = (value: string | null | undefined): string =>
    value === null || value === undefined || value === '' ? '-' : value;

// Status codes are warehouse configs (scope location_status), resolved by their semantic value;
// common/configs.json only provides the canonical defaults when a config row is missing.
export const resolveStatusCodes = (configs: any[] | null | undefined): StatusCodes => {
    const byValue = (value: string, fallback: number): number => {
        const code = parseInt(findCodeByScopeAndValue(configs ?? [], 'location_status', value), 10);
        return Number.isNaN(code) ? fallback : code;
    };
    return {
        available: byValue('available', configsJson.LOCATION_STATUS_AVAILABLE),
        occupied: byValue('occupied', configsJson.LOCATION_STATUS_OCCUPIED),
        disabled: byValue('disabled', configsJson.LOCATION_STATUS_DISABLED)
    };
};

export const emptyCellAgg = (): CellAgg => ({ total: 0, occupied: 0, disabled: 0, available: 0 });

// unknown status codes only count toward total (they stay out of the occupied/available buckets)
const addStatus = (agg: CellAgg, status: number, count: number, codes: StatusCodes): void => {
    agg.total += count;
    if (status === codes.occupied) agg.occupied += count;
    else if (status === codes.disabled) agg.disabled += count;
    else if (status === codes.available) agg.available += count;
};

export const buildTopViewData = (
    rows: OccupancyGroupRow[] | null | undefined,
    codes: StatusCodes
): TopViewData => {
    const cells = new Map<string, CellAgg>();
    const aisleSet = new Set<string>();
    const columnSet = new Set<string>();
    const totals = emptyCellAgg();
    (rows ?? []).forEach((row) => {
        const count = row?.functionCount?.id ?? 0;
        if (!count) return;
        const aisle = axisValue(row.aisle);
        const column = axisValue(row.column);
        aisleSet.add(aisle);
        columnSet.add(column);
        const key = cellKey(aisle, column);
        let agg = cells.get(key);
        if (!agg) {
            agg = emptyCellAgg();
            cells.set(key, agg);
        }
        addStatus(agg, row.status, count, codes);
        addStatus(totals, row.status, count, codes);
    });
    return {
        aisles: Array.from(aisleSet).sort(naturalCompare),
        columns: Array.from(columnSet).sort(naturalCompare),
        cells,
        totals
    };
};

export const buildFrontViewData = (
    locations: LocationLite[] | null | undefined,
    codes: StatusCodes
): FrontViewData => {
    const cells = new Map<string, LocationLite[]>();
    const columnSet = new Set<string>();
    const levelSet = new Set<string>();
    const totals = emptyCellAgg();
    (locations ?? []).forEach((location) => {
        const column = axisValue(location.column);
        const level = axisValue(location.level);
        columnSet.add(column);
        levelSet.add(level);
        const key = cellKey(column, level);
        let bucket = cells.get(key);
        if (!bucket) {
            bucket = [];
            cells.set(key, bucket);
        }
        bucket.push(location);
        addStatus(totals, location.status, 1, codes);
    });
    cells.forEach((bucket) =>
        bucket.sort((a, b) => naturalCompare(axisValue(a.position), axisValue(b.position)))
    );
    return {
        columns: Array.from(columnSet).sort(naturalCompare),
        levels: Array.from(levelSet).sort(naturalCompare),
        cells,
        totals
    };
};

export const OCCUPANCY_COLORS = {
    available: '#52c41a',
    gradientStops: ['#fa8c16', '#fa541c', '#f5222d'],
    disabled: '#141414',
    unknown: '#8c8c8c',
    empty: 'rgba(140, 140, 140, 0.08)',
    emptyBorder: 'rgba(140, 140, 140, 0.3)'
};

const hexToRgb = (hex: string): number[] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
];

const GRADIENT_RGB = OCCUPANCY_COLORS.gradientStops.map(hexToRgb);

// t in [0, 1] -> orange (t=0) ... volcano ... red (t=1)
export const rampColor = (t: number): string => {
    const clamped = Math.max(0, Math.min(1, t));
    const scaled = clamped * (GRADIENT_RGB.length - 1);
    const index = Math.min(Math.floor(scaled), GRADIENT_RGB.length - 2);
    const fraction = scaled - index;
    const from = GRADIENT_RGB[index];
    const to = GRADIENT_RGB[index + 1];
    const channel = (k: number) => Math.round(from[k] + (to[k] - from[k]) * fraction);
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

export type CellColor = { fill: string; disabledMarker: boolean };

// Fill rules: all disabled -> black; no occupied -> green; otherwise a gradient from
// orange (a single occupied location) to red (every non-disabled location occupied).
// Disabled locations are excluded from the ratio; a mixed cell keeps a black corner marker.
export const occupancyColor = (cell: CellAgg): CellColor => {
    const denominator = cell.total - cell.disabled;
    if (denominator <= 0) return { fill: OCCUPANCY_COLORS.disabled, disabledMarker: false };
    const disabledMarker = cell.disabled > 0;
    if (cell.occupied <= 0) return { fill: OCCUPANCY_COLORS.available, disabledMarker };
    const occupied = Math.min(cell.occupied, denominator);
    const t = denominator === 1 ? 1 : (occupied - 1) / (denominator - 1);
    return { fill: rampColor(t), disabledMarker };
};

export const positionColor = (status: number, codes: StatusCodes): string => {
    if (status === codes.occupied) return OCCUPANCY_COLORS.gradientStops[2];
    if (status === codes.disabled) return OCCUPANCY_COLORS.disabled;
    if (status === codes.available) return OCCUPANCY_COLORS.available;
    return OCCUPANCY_COLORS.unknown;
};

// occupied / (total - disabled), null when every location is disabled (or there is none)
export const occupancyRate = (agg: CellAgg): number | null => {
    const denominator = agg.total - agg.disabled;
    if (denominator <= 0) return null;
    return Math.min(agg.occupied, denominator) / denominator;
};
