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
import {
    FC,
    KeyboardEvent,
    MouseEvent,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import styled from 'styled-components';
import { OCCUPANCY_COLORS } from '../occupancyModel';

// a null visual renders as a faint "hole" so the grid stays aligned when a
// (row, column) combination simply has no location
export type GridCellVisual = {
    fill: string;
    slots?: string[];
    disabledMarker?: boolean;
} | null;

export interface OccupancyGridProps {
    rowLabels: string[];
    colLabels: string[];
    getCell: (row: number, col: number) => GridCellVisual;
    renderTooltip: (row: number, col: number) => ReactNode;
    onCellClick?: (row: number, col: number) => void;
    highlightedCol?: number;
    initialScrollToCol?: number;
    ariaLabel: string;
    testId?: string;
}

const MIN_CELL = 10;
const MAX_CELL = 44;
const GUTTER_Y = 26;
const HIGHLIGHT_FILL = 'rgba(22, 119, 255, 0.16)';
// per-canvas backing-store ceiling in device pixels (~24M px ≈ 96 MB across the two canvases)
const MAX_CANVAS_DEVICE_PIXELS = 24_000_000;

const Scroller = styled.div`
    position: relative;
    overflow: auto;
    max-height: calc(100vh - 380px);
    min-height: 340px;
    border: 1px solid rgba(5, 5, 5, 0.08);
    border-radius: 8px;
    background: #fff;
`;

const Corner = styled.div`
    position: sticky;
    top: 0;
    left: 0;
    z-index: 4;
    background: #fff;
    border-bottom: 1px solid rgba(5, 5, 5, 0.06);
    border-right: 1px solid rgba(5, 5, 5, 0.06);
`;

const TopLabels = styled.div`
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    background: #fff;
    border-bottom: 1px solid rgba(5, 5, 5, 0.06);
`;

const TopLabelCell = styled.div`
    flex: none;
    overflow: hidden;
    align-self: center;
    text-align: center;
    font-size: 11px;
    line-height: 1;
    color: #888;
    white-space: nowrap;
`;

const LeftLabels = styled.div`
    position: sticky;
    left: 0;
    z-index: 2;
    background: #fff;
    border-right: 1px solid rgba(5, 5, 5, 0.06);
`;

const LeftLabelCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    padding-right: 6px;
    font-size: 11px;
    color: #888;
    white-space: nowrap;
`;

const BodyWrap = styled.div`
    position: relative;
`;

const OverlayCanvas = styled.canvas`
    position: absolute;
    inset: 0;
    display: block;
    outline: none;

    /* keyboard users need to see when the grid owns the focus (arrow-key navigation) */
    &:focus-visible {
        outline: 2px solid #1677ff;
        outline-offset: -2px;
    }
`;

const TooltipBox = styled.div`
    position: absolute;
    z-index: 10;
    max-width: 280px;
    max-height: 320px;
    overflow: hidden;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.88);
    color: #fff;
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
`;

const pathRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void => {
    ctx.beginPath();
    if (r <= 0) {
        ctx.rect(x, y, w, h);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

const OccupancyGrid: FC<OccupancyGridProps> = ({
    rowLabels,
    colLabels,
    getCell,
    renderTooltip,
    onCellClick,
    highlightedCol,
    initialScrollToCol,
    ariaLabel,
    testId
}: OccupancyGridProps) => {
    const nRows = rowLabels.length;
    const nCols = colLabels.length;

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const baseRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
    const dprRef = useRef(1);
    const hoverRef = useRef<{ row: number; col: number } | null>(null);
    const drawOverlayRef = useRef<() => void>(() => {});
    const rafRef = useRef(0);
    const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
    const [containerW, setContainerW] = useState(0);
    const [tooltipCell, setTooltipCell] = useState<{ row: number; col: number } | null>(null);

    // row-label gutter sized on the widest label (11px font is ~6.5px/char)
    const gutterX = useMemo(() => {
        const maxLength = rowLabels.reduce((max, label) => Math.max(max, label.length), 1);
        return Math.min(64, Math.max(30, Math.round(maxLength * 6.5) + 14));
    }, [rowLabels]);

    useEffect(() => {
        const element = scrollerRef.current;
        if (!element) return;
        const observer = new ResizeObserver((entries) => {
            setContainerW(entries[0]?.contentRect?.width ?? element.clientWidth);
        });
        observer.observe(element);
        setContainerW(element.clientWidth);
        return () => observer.disconnect();
    }, []);

    // fit-to-width with a legibility floor: horizontal scroll only engages below MIN_CELL
    const cellSize = useMemo(() => {
        if (!nCols || !containerW) return MAX_CELL;
        const fit = Math.floor((containerW - gutterX - 14) / nCols);
        return Math.max(MIN_CELL, Math.min(MAX_CELL, fit));
    }, [containerW, gutterX, nCols]);

    const bodyW = nCols * cellSize;
    const bodyH = nRows * cellSize;
    const labelEvery = cellSize >= 13 ? 1 : Math.ceil(13 / cellSize);

    const drawBase = useCallback(() => {
        const canvas = baseRef.current;
        if (!canvas || !nRows || !nCols) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = dprRef.current;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, bodyW, bodyH);
        const gap = Math.max(1, Math.round(cellSize * 0.08));
        const inner = cellSize - 2 * gap;
        const radius = cellSize >= 16 ? Math.min(4, inner / 4) : 0;
        for (let row = 0; row < nRows; row++) {
            for (let col = 0; col < nCols; col++) {
                const visual = getCell(row, col);
                const x = col * cellSize + gap;
                const y = row * cellSize + gap;
                if (!visual) {
                    ctx.fillStyle = OCCUPANCY_COLORS.empty;
                    pathRoundRect(ctx, x, y, inner, inner, radius);
                    ctx.fill();
                    ctx.strokeStyle = OCCUPANCY_COLORS.emptyBorder;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    continue;
                }
                if (visual.slots && visual.slots.length > 1) {
                    // one vertical stripe per position, separated by a hairline when wide
                    // enough, clipped to the same rounded shape as single-color cells
                    const slotW = inner / visual.slots.length;
                    const slotGap = slotW > 7 ? 1 : 0;
                    ctx.save();
                    pathRoundRect(ctx, x, y, inner, inner, radius);
                    ctx.clip();
                    visual.slots.forEach((color, index) => {
                        ctx.fillStyle = color;
                        ctx.fillRect(x + index * slotW, y, Math.max(1, slotW - slotGap), inner);
                    });
                    ctx.restore();
                } else {
                    ctx.fillStyle = visual.slots?.length === 1 ? visual.slots[0] : visual.fill;
                    pathRoundRect(ctx, x, y, inner, inner, radius);
                    ctx.fill();
                }
                if (visual.disabledMarker && inner >= 8) {
                    const size = Math.max(4, Math.round(inner * 0.38));
                    ctx.fillStyle = OCCUPANCY_COLORS.disabled;
                    ctx.beginPath();
                    ctx.moveTo(x + inner, y);
                    ctx.lineTo(x + inner - size, y);
                    ctx.lineTo(x + inner, y + size);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }, [getCell, nRows, nCols, cellSize, bodyW, bodyH]);

    const drawOverlay = useCallback(() => {
        const canvas = overlayRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = dprRef.current;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, bodyW, bodyH);
        if (highlightedCol !== undefined && highlightedCol >= 0 && highlightedCol < nCols) {
            ctx.fillStyle = HIGHLIGHT_FILL;
            ctx.fillRect(highlightedCol * cellSize, 0, cellSize, bodyH);
        }
        const hover = hoverRef.current;
        if (hover) {
            const x = hover.col * cellSize;
            const y = hover.row * cellSize;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2.5, y + 2.5, cellSize - 5, cellSize - 5);
        }
    }, [bodyW, bodyH, cellSize, highlightedCol, nCols]);

    // (re)size both canvases when the geometry changes, then repaint
    useEffect(() => {
        // Cap the backing store to a fixed device-pixel budget: the allocation scales with
        // dpr² across both canvases, so bound bodyW*bodyH*dpr² rather than the CSS area alone.
        const deviceDpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssArea = Math.max(1, bodyW * bodyH);
        const maxDpr = Math.sqrt(MAX_CANVAS_DEVICE_PIXELS / cssArea);
        const dpr = Math.max(1, Math.min(deviceDpr, maxDpr));
        dprRef.current = dpr;
        [baseRef.current, overlayRef.current].forEach((canvas) => {
            if (!canvas) return;
            canvas.width = Math.max(1, Math.round(bodyW * dpr));
            canvas.height = Math.max(1, Math.round(bodyH * dpr));
        });
        drawBase();
        drawOverlay();
    }, [bodyW, bodyH]);

    useEffect(() => {
        drawBase();
    }, [drawBase]);

    useEffect(() => {
        drawOverlayRef.current = drawOverlay;
        drawOverlay();
    }, [drawOverlay]);

    // hovered/focused cell may be out of bounds after a data change
    useEffect(() => {
        hoverRef.current = null;
        setTooltipCell(null);
    }, [rowLabels, colLabels]);

    useEffect(() => {
        if (initialScrollToCol === undefined || initialScrollToCol < 0) return;
        const element = scrollerRef.current;
        if (!element) return;
        const target =
            gutterX +
            initialScrollToCol * cellSize +
            cellSize / 2 -
            (element.clientWidth - gutterX) / 2 -
            gutterX;
        element.scrollLeft = Math.max(0, target);
    }, [initialScrollToCol, cellSize, gutterX]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const cellFromEvent = (event: MouseEvent<HTMLCanvasElement>) => {
        const canvas = overlayRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const col = Math.floor((event.clientX - rect.left) / cellSize);
        const row = Math.floor((event.clientY - rect.top) / cellSize);
        if (row < 0 || row >= nRows || col < 0 || col >= nCols) return null;
        return { row, col };
    };

    const applyHover = (cell: { row: number; col: number } | null) => {
        const previous = hoverRef.current;
        if (cell?.row === previous?.row && cell?.col === previous?.col) return;
        hoverRef.current = cell;
        if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = 0;
                drawOverlayRef.current();
                setTooltipCell(hoverRef.current);
            });
        }
    };

    const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
        const cell = cellFromEvent(event);
        applyHover(cell);
        const canvas = overlayRef.current;
        if (canvas) {
            canvas.style.cursor =
                cell && onCellClick && getCell(cell.row, cell.col) ? 'pointer' : 'default';
        }
    };

    const handleMouseLeave = () => {
        applyHover(null);
    };

    const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
        mouseDownRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
        const start = mouseDownRef.current;
        mouseDownRef.current = null;
        if (!start || !onCellClick) return;
        // ignore drag-scroll gestures
        if (Math.abs(event.clientX - start.x) > 4 || Math.abs(event.clientY - start.y) > 4) return;
        const cell = cellFromEvent(event);
        if (cell && getCell(cell.row, cell.col)) onCellClick(cell.row, cell.col);
    };

    // keyboard navigation must keep the focused cell visible past the sticky gutters
    const scrollCellIntoView = (row: number, col: number) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const cellLeft = gutterX + col * cellSize;
        const cellTop = GUTTER_Y + row * cellSize;
        if (cellLeft - gutterX < scroller.scrollLeft) {
            scroller.scrollLeft = cellLeft - gutterX;
        } else if (cellLeft + cellSize > scroller.scrollLeft + scroller.clientWidth) {
            scroller.scrollLeft = cellLeft + cellSize - scroller.clientWidth;
        }
        if (cellTop - GUTTER_Y < scroller.scrollTop) {
            scroller.scrollTop = cellTop - GUTTER_Y;
        } else if (cellTop + cellSize > scroller.scrollTop + scroller.clientHeight) {
            scroller.scrollTop = cellTop + cellSize - scroller.clientHeight;
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
        if (!nRows || !nCols) return;
        const current = hoverRef.current;
        if (event.key === 'Escape') {
            applyHover(null);
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            if (current && onCellClick && getCell(current.row, current.col)) {
                onCellClick(current.row, current.col);
            }
            event.preventDefault();
            return;
        }
        let row = current?.row ?? 0;
        let col = current?.col ?? 0;
        switch (event.key) {
            case 'ArrowRight':
                col = current ? col + 1 : 0;
                break;
            case 'ArrowLeft':
                col = current ? col - 1 : 0;
                break;
            case 'ArrowDown':
                row = current ? row + 1 : 0;
                break;
            case 'ArrowUp':
                row = current ? row - 1 : 0;
                break;
            default:
                return;
        }
        event.preventDefault();
        const next = {
            row: Math.max(0, Math.min(nRows - 1, row)),
            col: Math.max(0, Math.min(nCols - 1, col))
        };
        applyHover(next);
        scrollCellIntoView(next.row, next.col);
    };

    const tooltipContent = tooltipCell ? renderTooltip(tooltipCell.row, tooltipCell.col) : null;
    let tooltipStyle: { left: number; top: number; transform?: string } | undefined;
    if (tooltipCell && tooltipContent) {
        // the box is positioned in content coordinates (it scrolls with the cells); flip/clamp
        // decisions use the scroller's current viewport so it stays fully visible near the edges
        const scroller = scrollerRef.current;
        const scrollLeft = scroller?.scrollLeft ?? 0;
        const scrollTop = scroller?.scrollTop ?? 0;
        const viewWidth = scroller?.clientWidth ?? gutterX + bodyW;
        const viewHeight = scroller?.clientHeight ?? GUTTER_Y + bodyH;
        const cellLeft = gutterX + tooltipCell.col * cellSize;
        const cellTop = Math.max(
            scrollTop + 4,
            Math.min(GUTTER_Y + tooltipCell.row * cellSize, scrollTop + viewHeight - 150)
        );
        const flipX =
            cellLeft + cellSize + 300 - scrollLeft > viewWidth && cellLeft - scrollLeft > 300;
        tooltipStyle = flipX
            ? { left: cellLeft - 8, top: cellTop, transform: 'translateX(-100%)' }
            : { left: cellLeft + cellSize + 8, top: cellTop };
    }

    if (!nRows || !nCols) return null;

    return (
        <Scroller ref={scrollerRef} data-testid={testId}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `${gutterX}px ${bodyW}px`,
                    gridTemplateRows: `${GUTTER_Y}px ${bodyH}px`,
                    width: gutterX + bodyW
                }}
            >
                <Corner />
                <TopLabels style={{ height: GUTTER_Y }}>
                    {colLabels.map((label, index) => (
                        <TopLabelCell key={`${label}-${index}`} style={{ width: cellSize }}>
                            {index % labelEvery === 0 ? label : ''}
                        </TopLabelCell>
                    ))}
                </TopLabels>
                <LeftLabels>
                    {rowLabels.map((label, index) => (
                        <LeftLabelCell
                            key={`${label}-${index}`}
                            style={{ height: cellSize }}
                            title={label}
                        >
                            {index % labelEvery === 0 ? label : ''}
                        </LeftLabelCell>
                    ))}
                </LeftLabels>
                <BodyWrap style={{ width: bodyW, height: bodyH }}>
                    <canvas
                        ref={baseRef}
                        style={{ display: 'block', width: bodyW, height: bodyH }}
                    />
                    <OverlayCanvas
                        ref={overlayRef}
                        style={{ width: bodyW, height: bodyH }}
                        role="img"
                        aria-label={ariaLabel}
                        tabIndex={0}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onKeyDown={handleKeyDown}
                    />
                </BodyWrap>
            </div>
            {tooltipContent && tooltipStyle ? (
                <TooltipBox style={tooltipStyle} data-testid="occupancy-tooltip">
                    {tooltipContent}
                </TooltipBox>
            ) : null}
        </Scroller>
    );
};

OccupancyGrid.displayName = 'OccupancyGrid';

export { OccupancyGrid };
