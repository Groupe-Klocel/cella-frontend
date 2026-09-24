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
import { FC, PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { AccessDirection, AccessPoint, snap } from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// One access point on the floor plan of a building. The marker itself is the standing point;
// what it LEADS TO is drawn outside it, so the two families never read alike: a building access
// is a square with horizontal arrows (in from the left, out to the right, both = the two), a
// floor access is a circle with chevrons above (up) and/or below (down).
//
// A mirrored point (the automatic counterpart of a floor access declared one floor away) is
// drawn dashed, dimmed and inert: it is derived, so it is not the thing to edit — the source
// point, on its own floor, is.

const BUILDING_COLOR = '#722ed1';
const FLOOR_COLOR = '#13c2c2';
const MIRROR_COLOR = '#8c8c8c';

export interface IAccessPointLayerProps {
    point: AccessPoint;
    // direction as seen from the floor being drawn (a mirrored point shows the way BACK)
    direction: AccessDirection;
    mirrored?: boolean;
    label?: string;
    selected?: boolean;
    readOnly?: boolean;
    snapStep?: number | null;
    onSelect?: () => void;
    onCommit?: (position: { x: number; y: number }) => void;
}

const AccessPointLayer: FC<IAccessPointLayerProps> = ({
    point,
    direction,
    mirrored,
    label,
    selected,
    readOnly,
    snapStep,
    onSelect,
    onCommit
}: IAccessPointLayerProps) => {
    const scale = useCanvasScale();
    const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        moved: boolean;
    } | null>(null);

    // a mirrored point is derived (edit the source instead), and a layer given no select handler
    // is a pure read-only overlay: neither may swallow a click meant for the canvas underneath
    const interactive = !mirrored && !!onSelect;

    const handlePointerDown = (event: ReactPointerEvent) => {
        if (event.button !== 0 || !interactive) return;
        event.stopPropagation();
        onSelect?.();
        if (readOnly || !onCommit) return;
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            origX: point.x,
            origY: point.y,
            moved: false
        };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // screen-pixel threshold: a plain click selects, it must never commit a move
        if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) {
            drag.moved = true;
        }
        if (!drag.moved) return;
        const dx = (event.clientX - drag.startX) / scale;
        const dy = (event.clientY - drag.startY) / scale;
        setPreview({ x: snap(drag.origX + dx, snapStep), y: snap(drag.origY + dy, snapStep) });
    };

    const handlePointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.moved && preview && onCommit) onCommit(preview);
        setPreview(null);
    };

    const handlePointerCancel = () => {
        dragRef.current = null;
        setPreview(null);
    };

    const x = preview?.x ?? point.x;
    const y = preview?.y ?? point.y;
    // pixel-constant marker: an access point is a landmark, not a footprint — it must stay
    // readable at every zoom level, like the selection handles
    const r = 10 / scale;
    const stroke = mirrored
        ? MIRROR_COLOR
        : selected
          ? '#fa8c16'
          : point.kind === 'building'
            ? BUILDING_COLOR
            : FLOOR_COLOR;
    const strokeWidth = (selected ? 2.2 : 1.6) / scale;
    const dash = mirrored ? `${3 / scale} ${2.5 / scale}` : undefined;

    // horizontal arrow (building access): head at (hx, y), shaft `length` long behind it
    const arrow = (key: string, hx: number, sign: 1 | -1) => {
        const head = r * 0.55;
        return (
            <g key={key}>
                <line
                    x1={hx - sign * r * 1.3}
                    y1={y}
                    x2={hx}
                    y2={y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                <polygon
                    points={`${hx},${y} ${hx - sign * head},${y - head * 0.7} ${
                        hx - sign * head
                    },${y + head * 0.7}`}
                    fill={stroke}
                />
            </g>
        );
    };

    // chevron (floor access): points away from the marker, above it (up) or below it (down)
    const chevron = (key: string, sign: 1 | -1) => {
        const tipY = y + sign * r * 2.5;
        const baseY = y + sign * r * 1.45;
        return (
            <polyline
                key={key}
                points={`${x - r * 0.8},${baseY} ${x},${tipY} ${x + r * 0.8},${baseY}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth * 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        );
    };

    const glyphs = [];
    if (point.kind === 'building') {
        if (direction === 'in' || direction === 'both') glyphs.push(arrow('in', x - r * 1.3, 1));
        if (direction === 'out' || direction === 'both') {
            glyphs.push(arrow('out', x + r * 2.6, 1));
        }
    } else {
        if (direction === 'up' || direction === 'both') glyphs.push(chevron('up', -1));
        if (direction === 'down' || direction === 'both') glyphs.push(chevron('down', 1));
    }

    const labelSize = 11.5 / scale;

    return (
        <g
            data-shape="access"
            opacity={mirrored ? 0.55 : 1}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
            style={{
                cursor: !interactive ? 'default' : readOnly ? 'pointer' : 'move',
                pointerEvents: interactive ? undefined : 'none'
            }}
        >
            {point.kind === 'building' ? (
                <rect
                    x={x - r}
                    y={y - r}
                    width={r * 2}
                    height={r * 2}
                    rx={r * 0.3}
                    fill="#fff"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                />
            ) : (
                <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill="#fff"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                />
            )}
            {glyphs}
            {label ? (
                <text
                    x={x}
                    y={y + r * 3.4}
                    textAnchor="middle"
                    fontSize={labelSize}
                    fill={stroke}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {label}
                </text>
            ) : null}
        </g>
    );
};

AccessPointLayer.displayName = 'AccessPointLayer';

export { AccessPointLayer };
