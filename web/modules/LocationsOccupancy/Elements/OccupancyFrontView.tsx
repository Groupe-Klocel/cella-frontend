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
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { cellKey, FrontViewData, positionColor, StatusCodes } from '../occupancyModel';
import { GridCellVisual, OccupancyGrid } from './OccupancyGrid';
import { buildLocationsTooltip, formatRate, OccupancyLabels } from './occupancyTooltips';

export interface IOccupancyFrontViewProps {
    data: FrontViewData;
    codes: StatusCodes;
    labels: OccupancyLabels;
    highlightColumn?: string;
}

const OccupancyFrontView: FC<IOccupancyFrontViewProps> = ({
    data,
    codes,
    labels,
    highlightColumn
}: IOccupancyFrontViewProps) => {
    // levels are displayed bottom-up so the ground level sits on the last row,
    // matching the physical rack face
    const rowLabels = useMemo(() => [...data.levels].reverse(), [data]);

    const levelForRow = useCallback(
        (row: number): string => data.levels[data.levels.length - 1 - row],
        [data]
    );

    const getCell = useCallback(
        (row: number, col: number): GridCellVisual => {
            const bucket = data.cells.get(cellKey(data.columns[col], levelForRow(row)));
            if (!bucket || bucket.length === 0) return null;
            const slots = bucket.map((location) => positionColor(location.status, codes));
            return slots.length === 1 ? { fill: slots[0] } : { fill: slots[0], slots };
        },
        [data, codes, levelForRow]
    );

    const renderTooltip = useCallback(
        (row: number, col: number): ReactNode => {
            const column = data.columns[col];
            const level = levelForRow(row);
            const bucket = data.cells.get(cellKey(column, level));
            if (!bucket || bucket.length === 0) return null;
            return buildLocationsTooltip(
                `${labels.column} ${column} / ${labels.level} ${level}`,
                bucket,
                codes,
                labels
            );
        },
        [data, codes, labels, levelForRow]
    );

    const highlightedCol = useMemo(
        () => (highlightColumn ? data.columns.indexOf(highlightColumn) : -1),
        [data, highlightColumn]
    );

    const ariaLabel = `${data.levels.length} x ${data.columns.length} — ${labels.occupied}: ${
        data.totals.occupied
    } / ${labels.total}: ${data.totals.total} (${labels.occupancyRate}: ${formatRate(
        data.totals
    )})`;

    return (
        <OccupancyGrid
            rowLabels={rowLabels}
            colLabels={data.columns}
            getCell={getCell}
            renderTooltip={renderTooltip}
            highlightedCol={highlightedCol}
            initialScrollToCol={highlightedCol >= 0 ? highlightedCol : undefined}
            ariaLabel={ariaLabel}
        />
    );
};

OccupancyFrontView.displayName = 'OccupancyFrontView';

export { OccupancyFrontView };
