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
import { OCCUPANCY_COLORS } from 'modules/LocationsOccupancy/occupancyModel';
import { FC, useId, useMemo } from 'react';
import {
    AisleDef,
    AislePath,
    BlockLayout,
    cellPickMarks,
    cellRect,
    isRowHorizontal,
    localToParent,
    mergeRowRects,
    RectShape
} from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// Read-only background of one block on the route-analysis panels: its outline, the corridors the
// operator walks, and its locations.
//
// LEVEL OF DETAIL — a production block holds a few thousand cells, and drawing four SVG nodes per
// cell would put a hundred thousand nodes on the page. So cells are only drawn one by one when a
// cell is actually big enough on screen to be told apart (DETAIL_PX); below that the contiguous
// cells of a rack row collapse into the single rectangle they visually form anyway (mergeRowRects
// — exact, since they touch), with one accent line per allowed pick side. Zooming in restores the
// per-cell drawing.

// on-screen width, in pixels, below which a cell is not worth drawing on its own
const DETAIL_PX = 6;

export const PICK_ACCENT = '#d4380d';

// forbidden zones — deliberately not the pick accent: this is "you may not walk here"
export const BLOCKED_COLOR = '#cf1322';

export interface IBlockCellsLayerProps {
    layout: BlockLayout;
    blockName: string;
    corridors: Map<string, AislePath[]>;
    corridorKey: (aisle: string) => string;
}

const BlockCellsLayer: FC<IBlockCellsLayerProps> = ({
    layout,
    blockName,
    corridors,
    corridorKey
}: IBlockCellsLayerProps) => {
    const scale = useCanvasScale();
    // one pattern id per instance: several blocks share a panel, and a duplicated id would make
    // them all paint with whichever definition the DOM saw last
    const hatchId = useId().replace(/:/g, '');

    // One row per SEGMENT, not per aisle: a split aisle has stretches with their own direction
    // and their own pick sides, so merging them into one row would draw a rack across the gap.
    // Columns with no segment claiming them (a hand-edited layout) still get drawn, under the
    // first segment, rather than disappearing. Rows are shape-only: they never depend on zoom.
    const rows = useMemo(() => {
        return Object.keys(layout.cells ?? {}).flatMap((aisle) => {
            const cells = layout.cells![aisle];
            const segments = layout.aisles?.[aisle] ?? [];
            const claimed = new Set<string>();
            const groups: { def: AisleDef | undefined; columns: string[] }[] = segments.map(
                (def) => {
                    const columns = def.columns.filter((column) => {
                        if (!cells[column] || claimed.has(column)) return false;
                        claimed.add(column);
                        return true;
                    });
                    return { def, columns };
                }
            );
            const orphans = Object.keys(cells).filter((column) => !claimed.has(column));
            if (orphans.length > 0) {
                if (groups.length > 0) groups[0].columns.push(...orphans);
                else groups.push({ def: undefined, columns: orphans });
            }
            return groups
                .filter((group) => group.columns.length > 0)
                .map((group, index) => {
                    const rects: RectShape[] = group.columns.map((column) => {
                        const cell = cells[column];
                        return cellRect(
                            { x: cell.x, y: cell.y },
                            group.def,
                            cell.w ?? 1.2,
                            cell.d ?? 1
                        );
                    });
                    const first = cells[group.columns[0]];
                    return {
                        key: `${aisle}-${index}`,
                        aisle,
                        def: group.def,
                        columns: group.columns,
                        cells,
                        rects,
                        merged: mergeRowRects(rects),
                        cellW: first.w ?? 1.2,
                        cellD: first.d ?? 1
                    };
                });
        });
    }, [layout]);

    const place = (point: { x: number; y: number }) => localToParent(point, layout.b);

    return (
        <g>
            <defs>
                <pattern
                    id={hatchId}
                    width={0.6}
                    height={0.6}
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <rect width={0.6} height={0.6} fill="rgba(207, 19, 34, 0.10)" />
                    <line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={0.6}
                        stroke={BLOCKED_COLOR}
                        strokeOpacity={0.5}
                        strokeWidth={0.14}
                    />
                </pattern>
            </defs>
            <rect
                x={layout.b.x}
                y={layout.b.y}
                width={layout.b.w}
                height={layout.b.d}
                fill="none"
                stroke={OCCUPANCY_COLORS.emptyBorder}
                strokeWidth={0.12}
            />
            <text
                x={layout.b.x + 0.8}
                y={layout.b.y + 1.6}
                fontSize={1.2}
                fill="#999"
                style={{ userSelect: 'none' }}
            >
                {blockName}
            </text>
            {/* forbidden zones: walls, machine bays, motorised lanes closed to pickers. Drawn
                hatched so they never read as a rack, and they ARE obstacles of the walking
                graph — a leg is routed round them, never through. */}
            {(layout.blocked ?? []).map((zone) => {
                const origin = place({ x: zone.x, y: zone.y });
                return (
                    <g key={zone.id}>
                        <rect
                            x={origin.x}
                            y={origin.y}
                            width={zone.w}
                            height={zone.d}
                            fill={`url(#${hatchId})`}
                            stroke={BLOCKED_COLOR}
                            strokeWidth={1 / scale}
                        />
                        {zone.name ? (
                            <text
                                x={origin.x + zone.w / 2}
                                y={origin.y + zone.d / 2 + 0.3}
                                textAnchor="middle"
                                fontSize={Math.min(Math.max(zone.d * 0.5, 0.4), 1.1)}
                                fill={BLOCKED_COLOR}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {zone.name}
                            </text>
                        ) : null}
                    </g>
                );
            })}
            {Object.keys(layout.aisles ?? {}).map((aisle) =>
                (corridors.get(corridorKey(aisle)) ?? []).map((path, pathIndex) => (
                    <line
                        key={`walk-${aisle}-${pathIndex}`}
                        x1={path.from[0]}
                        y1={path.from[1]}
                        x2={path.to[0]}
                        y2={path.to[1]}
                        stroke={OCCUPANCY_COLORS.emptyBorder}
                        strokeWidth={0.06}
                        strokeDasharray="0.6 0.4"
                    />
                ))
            )}
            {rows.map((row) => {
                const detailed = row.cellW * scale >= DETAIL_PX;
                if (detailed) {
                    return (
                        <g key={row.key}>
                            {row.columns.map((column) => {
                                const cell = row.cells[column];
                                const w = cell.w ?? 1.2;
                                const d = cell.d ?? 1;
                                const rect = cellRect({ x: cell.x, y: cell.y }, row.def, w, d);
                                const origin = place({ x: rect.x, y: rect.y });
                                return (
                                    <g key={column}>
                                        <rect
                                            x={origin.x}
                                            y={origin.y}
                                            width={rect.w}
                                            height={rect.d}
                                            fill={OCCUPANCY_COLORS.empty}
                                            stroke={OCCUPANCY_COLORS.emptyBorder}
                                            strokeWidth={0.05}
                                        />
                                        {(row.def
                                            ? cellPickMarks({ x: cell.x, y: cell.y }, row.def, w, d)
                                            : []
                                        ).map((mark, markIndex) => {
                                            const a = place({ x: mark.x1, y: mark.y1 });
                                            const b = place({ x: mark.x2, y: mark.y2 });
                                            return (
                                                <line
                                                    key={markIndex}
                                                    x1={a.x}
                                                    y1={a.y}
                                                    x2={b.x}
                                                    y2={b.y}
                                                    stroke={PICK_ACCENT}
                                                    strokeOpacity={0.55}
                                                    strokeWidth={0.08}
                                                    strokeLinecap="round"
                                                />
                                            );
                                        })}
                                    </g>
                                );
                            })}
                        </g>
                    );
                }
                // zoomed out: the whole row is the one rectangle its cells already form
                return (
                    <g key={row.key}>
                        {row.merged.map((rect, index) => {
                            const origin = place({ x: rect.x, y: rect.y });
                            const center = { x: rect.x + rect.w / 2, y: rect.y + rect.d / 2 };
                            const alongX = row.def ? isRowHorizontal(row.def) : rect.w >= rect.d;
                            const marks = row.def
                                ? cellPickMarks(
                                      center,
                                      row.def,
                                      alongX ? rect.w : rect.d,
                                      alongX ? rect.d : rect.w
                                  )
                                : [];
                            return (
                                <g key={index}>
                                    <rect
                                        x={origin.x}
                                        y={origin.y}
                                        width={rect.w}
                                        height={rect.d}
                                        fill={OCCUPANCY_COLORS.empty}
                                        stroke={OCCUPANCY_COLORS.emptyBorder}
                                        strokeWidth={0.05}
                                    />
                                    {marks.map((mark, markIndex) => {
                                        const a = place({ x: mark.x1, y: mark.y1 });
                                        const b = place({ x: mark.x2, y: mark.y2 });
                                        return (
                                            <line
                                                key={markIndex}
                                                x1={a.x}
                                                y1={a.y}
                                                x2={b.x}
                                                y2={b.y}
                                                stroke={PICK_ACCENT}
                                                strokeOpacity={0.55}
                                                strokeWidth={0.08}
                                                strokeLinecap="round"
                                            />
                                        );
                                    })}
                                </g>
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
};

BlockCellsLayer.displayName = 'BlockCellsLayer';

export { BlockCellsLayer };
