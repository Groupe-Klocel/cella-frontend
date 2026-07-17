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
import { FC, ReactNode, useCallback } from 'react';
import { cellKey, occupancyColor, TopViewData } from '../occupancyModel';
import { GridCellVisual, OccupancyGrid } from './OccupancyGrid';
import { buildAggTooltip, formatRate, OccupancyLabels } from './occupancyTooltips';

export interface IOccupancyTopViewProps {
    data: TopViewData;
    labels: OccupancyLabels;
    onDrillDown: (aisle: string, column: string) => void;
}

const OccupancyTopView: FC<IOccupancyTopViewProps> = ({
    data,
    labels,
    onDrillDown
}: IOccupancyTopViewProps) => {
    const getCell = useCallback(
        (row: number, col: number): GridCellVisual => {
            const agg = data.cells.get(cellKey(data.aisles[row], data.columns[col]));
            return agg ? occupancyColor(agg) : null;
        },
        [data]
    );

    const renderTooltip = useCallback(
        (row: number, col: number): ReactNode => {
            const aisle = data.aisles[row];
            const column = data.columns[col];
            const agg = data.cells.get(cellKey(aisle, column));
            if (!agg) return null;
            return buildAggTooltip(
                `${labels.aisle} ${aisle} / ${labels.column} ${column}`,
                agg,
                labels
            );
        },
        [data, labels]
    );

    const handleCellClick = useCallback(
        (row: number, col: number) => {
            onDrillDown(data.aisles[row], data.columns[col]);
        },
        [data, onDrillDown]
    );

    const ariaLabel = `${data.aisles.length} x ${data.columns.length} — ${labels.occupied}: ${
        data.totals.occupied
    } / ${labels.total}: ${data.totals.total} (${labels.occupancyRate}: ${formatRate(
        data.totals
    )})`;

    return (
        <OccupancyGrid
            rowLabels={data.aisles}
            colLabels={data.columns}
            getCell={getCell}
            renderTooltip={renderTooltip}
            onCellClick={handleCellClick}
            ariaLabel={ariaLabel}
        />
    );
};

OccupancyTopView.displayName = 'OccupancyTopView';

export { OccupancyTopView };
