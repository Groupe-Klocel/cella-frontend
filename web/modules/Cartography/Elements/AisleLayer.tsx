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
import { FC, PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from 'react';
import {
    AisleDef,
    aisleCorridors,
    cellPickMarks,
    cellRect,
    computeAisleCells,
    isRowHorizontal,
    mergeRowRects,
    roundCoord,
    snap
} from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// One parametric aisle inside the block view: the rack row segment plus its derived cells
// (computeAisleCells is the single source of that math). Each (aisle, column) is ONE location,
// drawn once on the row; an accent line on each allowed pick side shows where the operator can
// reach it from, and the corridor(s) beside the row are hinted as dashed lines. The aisle's own
// name is written inside its FIRST cell, in the accent colour, so it reads the same whatever the
// pick side. Dragging the segment translates the whole aisle; when selected, each endpoint gets
// its own handle so the aisle can be stretched or reoriented (columns re-flow along the new
// segment). `ghost` renders the live preview of the lay-aisle gesture.

// accent colour of the pick-side marks and of the aisle name (never used for a column label)
const PICK_ACCENT = '#d4380d';

// on-screen width, in pixels, below which a cell is not worth drawing on its own: the row is then
// drawn as the single rectangle its contiguous cells already form (a production block holds a few
// thousand cells — four SVG nodes each would sink the page). Zooming in brings the cells back.
const DETAIL_PX = 6;

export interface IAisleLayerProps {
    aisle: string;
    def: AisleDef;
    cellDefaults?: { w: number; d: number };
    selected?: boolean;
    // the columns stored here no longer match the locations of this aisle: drawn in the warning
    // colour so the drift is visible on the plan, not only in the properties panel
    outOfSync?: boolean;
    readOnly?: boolean;
    ghost?: boolean;
    snapStep?: number | null;
    onSelect?: () => void;
    onCommit?: (def: AisleDef) => void;
}

type DragKind = 'move' | 'from' | 'to';

const AisleLayer: FC<IAisleLayerProps> = ({
    aisle,
    def,
    cellDefaults,
    selected,
    outOfSync,
    readOnly,
    ghost,
    snapStep,
    onSelect,
    onCommit
}: IAisleLayerProps) => {
    const scale = useCanvasScale();
    const [previewDef, setPreviewDef] = useState<AisleDef | null>(null);
    const dragRef = useRef<{
        kind: DragKind;
        startX: number;
        startY: number;
        orig: AisleDef;
        moved: boolean;
    } | null>(null);

    const shownDef: AisleDef = previewDef ?? def;

    const cells = useMemo(
        () => computeAisleCells(shownDef, cellDefaults),
        [shownDef, cellDefaults]
    );
    // Order ALONG the segment: Object.keys would re-sort numeric column names ascending and lose
    // it (CELLA columns are numbers), so the aisle name could land on the far end of a reversed
    // aisle. computeAisleCells lays them out in this very order.
    const columnKeys = useMemo(() => {
        const ordered = shownDef.reversed ? [...shownDef.columns].reverse() : shownDef.columns;
        return ordered.filter((column) => cells[column]);
    }, [shownDef, cells]);

    const applyDrag = (kind: DragKind, orig: AisleDef, dx: number, dy: number): AisleDef => {
        if (kind === 'from') {
            return {
                ...orig,
                from: [snap(orig.from[0] + dx, snapStep), snap(orig.from[1] + dy, snapStep)]
            };
        }
        if (kind === 'to') {
            return {
                ...orig,
                to: [snap(orig.to[0] + dx, snapStep), snap(orig.to[1] + dy, snapStep)]
            };
        }
        return {
            ...orig,
            from: [snap(orig.from[0] + dx, snapStep), snap(orig.from[1] + dy, snapStep)],
            to: [snap(orig.to[0] + dx, snapStep), snap(orig.to[1] + dy, snapStep)]
        };
    };

    const startDrag = (kind: DragKind) => (event: ReactPointerEvent) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        if (kind === 'move') onSelect?.();
        if (readOnly || ghost || !onCommit) return;
        dragRef.current = {
            kind,
            startX: event.clientX,
            startY: event.clientY,
            orig: def,
            moved: false
        };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // screen-pixel threshold: a plain click selects, it must never commit a change
        if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) {
            drag.moved = true;
        }
        if (!drag.moved) return;
        const dx = (event.clientX - drag.startX) / scale;
        const dy = (event.clientY - drag.startY) / scale;
        setPreviewDef(applyDrag(drag.kind, drag.orig, dx, dy));
    };

    const handlePointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.moved && previewDef && onCommit) onCommit(previewDef);
        setPreviewDef(null);
    };

    const handlePointerCancel = () => {
        dragRef.current = null;
        setPreviewDef(null);
    };

    const stroke = ghost ? '#91caff' : selected ? '#fa8c16' : outOfSync ? '#faad14' : '#1677ff';
    const cellW = shownDef.cellW ?? cellDefaults?.w ?? 1.2;
    const cellD = shownDef.cellD ?? cellDefaults?.d ?? 1.0;
    const labelSize = Math.min(Math.max(cellW * 0.5, 0.4), 1.6);
    const handleRadius = 6 / scale;
    // per-cell drawing only while a cell is big enough on screen to be told apart
    const detailed = cellW * scale >= DETAIL_PX;

    return (
        <g
            data-shape="aisle"
            opacity={ghost ? 0.6 : 1}
            onPointerDown={startDrag('move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
            style={{ cursor: readOnly || ghost ? 'default' : 'move' }}
        >
            {/* corridors: where the operator walks, one per allowed pick side */}
            {aisleCorridors({ from: shownDef.from, to: shownDef.to }, shownDef.sides, cellD).map(
                (corridor, index) => (
                    <line
                        key={`corridor-${index}`}
                        x1={corridor.from[0]}
                        y1={corridor.from[1]}
                        x2={corridor.to[0]}
                        y2={corridor.to[1]}
                        stroke={PICK_ACCENT}
                        strokeOpacity={0.35}
                        strokeWidth={1 / scale}
                        strokeDasharray={`${5 / scale} ${4 / scale}`}
                    />
                )
            )}
            <line
                x1={shownDef.from[0]}
                y1={shownDef.from[1]}
                x2={shownDef.to[0]}
                y2={shownDef.to[1]}
                stroke={stroke}
                strokeWidth={(selected ? 3 : 2) / scale}
                strokeDasharray={ghost ? `${6 / scale} ${4 / scale}` : undefined}
            />
            {!detailed
                ? mergeRowRects(
                      columnKeys.map((column) =>
                          cellRect(
                              { x: cells[column].x, y: cells[column].y },
                              shownDef,
                              cells[column].w ?? cellW,
                              cells[column].d ?? cellD
                          )
                      )
                  ).map((rect, index) => {
                      const center = { x: rect.x + rect.w / 2, y: rect.y + rect.d / 2 };
                      const alongX = isRowHorizontal(shownDef);
                      return (
                          <g key={`row-${index}`}>
                              <rect
                                  x={rect.x}
                                  y={rect.y}
                                  width={rect.w}
                                  height={rect.d}
                                  fill={
                                      selected
                                          ? 'rgba(250, 140, 22, 0.15)'
                                          : 'rgba(24, 144, 255, 0.10)'
                                  }
                                  stroke={stroke}
                                  strokeWidth={1 / scale}
                              />
                              {cellPickMarks(
                                  center,
                                  shownDef,
                                  alongX ? rect.w : rect.d,
                                  alongX ? rect.d : rect.w
                              ).map((mark, markIndex) => (
                                  <line
                                      key={markIndex}
                                      x1={mark.x1}
                                      y1={mark.y1}
                                      x2={mark.x2}
                                      y2={mark.y2}
                                      stroke={PICK_ACCENT}
                                      strokeWidth={2.5 / scale}
                                      strokeLinecap="round"
                                  />
                              ))}
                          </g>
                      );
                  })
                : null}
            {!detailed && columnKeys.length > 0 ? (
                <text
                    x={cells[columnKeys[0]].x}
                    y={cells[columnKeys[0]].y + labelSize * 0.35}
                    textAnchor="middle"
                    fontSize={labelSize}
                    fontWeight={600}
                    fill={ghost ? '#91caff' : PICK_ACCENT}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {aisle}
                </text>
            ) : null}
            {(detailed ? columnKeys : []).map((column, columnIndex) => {
                const cell = cells[column];
                const w = cell.w ?? cellW;
                const d = cell.d ?? cellD;
                const rect = cellRect({ x: cell.x, y: cell.y }, shownDef, w, d);
                const isFirst = columnIndex === 0;
                return (
                    <g key={column}>
                        <rect
                            x={rect.x}
                            y={rect.y}
                            width={rect.w}
                            height={rect.d}
                            fill={
                                selected ? 'rgba(250, 140, 22, 0.15)' : 'rgba(24, 144, 255, 0.10)'
                            }
                            stroke={stroke}
                            strokeWidth={1 / scale}
                        />
                        {/* one accent line per allowed pick side: same single location, reachable
                            from one side or from both */}
                        {cellPickMarks({ x: cell.x, y: cell.y }, shownDef, w, d).map(
                            (mark, markIndex) => (
                                <line
                                    key={`pick-${markIndex}`}
                                    x1={mark.x1}
                                    y1={mark.y1}
                                    x2={mark.x2}
                                    y2={mark.y2}
                                    stroke={PICK_ACCENT}
                                    strokeWidth={2.5 / scale}
                                    strokeLinecap="round"
                                />
                            )
                        )}
                        {isFirst ? (
                            <text
                                x={cell.x}
                                y={cell.y - labelSize * 0.1}
                                textAnchor="middle"
                                fontSize={labelSize}
                                fontWeight={600}
                                fill={ghost ? '#91caff' : PICK_ACCENT}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {aisle}
                            </text>
                        ) : null}
                        <text
                            x={cell.x}
                            y={isFirst ? cell.y + labelSize * 0.95 : cell.y + labelSize * 0.35}
                            textAnchor="middle"
                            fontSize={isFirst ? labelSize * 0.8 : labelSize}
                            fill="#555"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                            {column}
                        </text>
                    </g>
                );
            })}
            {columnKeys.length === 0 ? (
                <text
                    x={shownDef.from[0]}
                    y={shownDef.from[1] - labelSize}
                    fontSize={labelSize * 1.4}
                    fontWeight={600}
                    fill={ghost ? '#91caff' : PICK_ACCENT}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {aisle}
                </text>
            ) : null}
            {selected && !readOnly && !ghost ? (
                <>
                    {(['from', 'to'] as DragKind[]).map((endpoint) => (
                        <circle
                            key={endpoint}
                            cx={endpoint === 'from' ? shownDef.from[0] : shownDef.to[0]}
                            cy={endpoint === 'from' ? shownDef.from[1] : shownDef.to[1]}
                            r={handleRadius}
                            fill="#fff"
                            stroke="#fa8c16"
                            strokeWidth={1.5 / scale}
                            style={{ cursor: 'crosshair' }}
                            onPointerDown={startDrag(endpoint)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            onLostPointerCapture={handlePointerCancel}
                        />
                    ))}
                </>
            ) : null}
        </g>
    );
};

AisleLayer.displayName = 'AisleLayer';

export { AisleLayer };
