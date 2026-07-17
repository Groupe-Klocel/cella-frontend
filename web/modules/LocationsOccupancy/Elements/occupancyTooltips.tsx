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
import { CSSProperties, ReactNode } from 'react';
import {
    CellAgg,
    LocationLite,
    OCCUPANCY_COLORS,
    occupancyRate,
    positionColor,
    StatusCodes
} from '../occupancyModel';

// display labels resolved once by the page container (DB translations + configs labels)
export type OccupancyLabels = {
    aisle: string;
    column: string;
    level: string;
    position: string;
    total: string;
    available: string;
    occupied: string;
    disabled: string;
    occupancyRate: string;
};

export const statusLabelFor = (
    status: number,
    codes: StatusCodes,
    labels: OccupancyLabels
): string => {
    if (status === codes.occupied) return labels.occupied;
    if (status === codes.disabled) return labels.disabled;
    if (status === codes.available) return labels.available;
    return String(status);
};

export const formatRate = (agg: CellAgg): string => {
    const rate = occupancyRate(agg);
    return rate === null ? '-' : `${Math.round(rate * 1000) / 10}%`;
};

const dotStyle = (color: string): CSSProperties => ({
    display: 'inline-block',
    flex: 'none',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    marginRight: 6,
    border: '1px solid rgba(255, 255, 255, 0.4)'
});

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' };

// tooltip body for an aggregated cell (top view and 3D block view)
export const buildAggTooltip = (
    title: ReactNode,
    agg: CellAgg,
    labels: OccupancyLabels
): ReactNode => (
    <>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={rowStyle}>
            <span style={dotStyle(OCCUPANCY_COLORS.gradientStops[2])} />
            {`${labels.occupied}: ${agg.occupied}`}
        </div>
        <div style={rowStyle}>
            <span style={dotStyle(OCCUPANCY_COLORS.available)} />
            {`${labels.available}: ${agg.available}`}
        </div>
        {agg.disabled > 0 ? (
            <div style={rowStyle}>
                <span style={dotStyle(OCCUPANCY_COLORS.disabled)} />
                {`${labels.disabled}: ${agg.disabled}`}
            </div>
        ) : null}
        <div style={{ marginTop: 4, opacity: 0.85 }}>
            {`${labels.total}: ${agg.total} — ${labels.occupancyRate}: ${formatRate(agg)}`}
        </div>
    </>
);

// The tooltip must stay pointer-transparent (it floats under the cursor), so it cannot
// scroll: bulk cells with many positions are capped and summarised with a "+N" line.
const MAX_TOOLTIP_LOCATIONS = 12;

// tooltip body for a (column, level) cell listing its positions (front view and 3D aisle view)
export const buildLocationsTooltip = (
    title: ReactNode,
    locations: LocationLite[],
    codes: StatusCodes,
    labels: OccupancyLabels
): ReactNode => (
    <>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        {locations.slice(0, MAX_TOOLTIP_LOCATIONS).map((location) => (
            <div style={rowStyle} key={location.id}>
                <span style={dotStyle(positionColor(location.status, codes))} />
                {`${location.name} — ${statusLabelFor(location.status, codes, labels)}`}
            </div>
        ))}
        {locations.length > MAX_TOOLTIP_LOCATIONS ? (
            <div style={{ marginTop: 4, opacity: 0.85 }}>
                {`+${locations.length - MAX_TOOLTIP_LOCATIONS}…`}
            </div>
        ) : null}
    </>
);
