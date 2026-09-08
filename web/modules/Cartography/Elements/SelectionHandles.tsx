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
import { RectShape, roundCoord, snap } from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// Eight resize handles around the selected rectangle. The dashed outline previews the resize
// locally; pointer-up commits once. Rotated rects are display-only in v1 (`r` is reserved), so
// handles simply don't render for them.

export interface ISelectionHandlesProps {
    rect: RectShape;
    snapStep?: number | null;
    minSize?: number;
    onCommit: (rect: RectShape) => void;
}

type HandleName = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: { name: HandleName; cursor: string }[] = [
    { name: 'nw', cursor: 'nwse-resize' },
    { name: 'n', cursor: 'ns-resize' },
    { name: 'ne', cursor: 'nesw-resize' },
    { name: 'e', cursor: 'ew-resize' },
    { name: 'se', cursor: 'nwse-resize' },
    { name: 's', cursor: 'ns-resize' },
    { name: 'sw', cursor: 'nesw-resize' },
    { name: 'w', cursor: 'ew-resize' }
];

const handlePosition = (rect: RectShape, name: HandleName): { x: number; y: number } => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.d / 2;
    switch (name) {
        case 'nw':
            return { x: rect.x, y: rect.y };
        case 'n':
            return { x: cx, y: rect.y };
        case 'ne':
            return { x: rect.x + rect.w, y: rect.y };
        case 'e':
            return { x: rect.x + rect.w, y: cy };
        case 'se':
            return { x: rect.x + rect.w, y: rect.y + rect.d };
        case 's':
            return { x: cx, y: rect.y + rect.d };
        case 'sw':
            return { x: rect.x, y: rect.y + rect.d };
        default:
            return { x: rect.x, y: cy };
    }
};

const applyResize = (
    orig: RectShape,
    name: HandleName,
    dx: number,
    dy: number,
    minSize: number,
    snapStep?: number | null
): RectShape => {
    let { x, y, w, d } = orig;
    if (name.includes('w')) {
        const newX = snap(orig.x + dx, snapStep);
        w = roundCoord(orig.w + (orig.x - newX));
        x = newX;
    }
    if (name.includes('e')) w = snap(orig.w + dx, snapStep);
    if (name.includes('n')) {
        const newY = snap(orig.y + dy, snapStep);
        d = roundCoord(orig.d + (orig.y - newY));
        y = newY;
    }
    if (name.includes('s')) d = snap(orig.d + dy, snapStep);
    if (w < minSize) {
        if (name.includes('w')) x = roundCoord(orig.x + orig.w - minSize);
        w = minSize;
    }
    if (d < minSize) {
        if (name.includes('n')) y = roundCoord(orig.y + orig.d - minSize);
        d = minSize;
    }
    const resized: RectShape = { x, y, w: roundCoord(w), d: roundCoord(d) };
    if (orig.r) resized.r = orig.r;
    return resized;
};

const SelectionHandles: FC<ISelectionHandlesProps> = ({
    rect,
    snapStep,
    minSize = 0.5,
    onCommit
}: ISelectionHandlesProps) => {
    const scale = useCanvasScale();
    const [preview, setPreview] = useState<RectShape | null>(null);
    const dragRef = useRef<{
        name: HandleName;
        startX: number;
        startY: number;
        orig: RectShape;
    } | null>(null);

    if (rect.r) return null;

    const shown = preview ?? rect;
    const size = 8 / scale;

    const handlePointerDown = (name: HandleName) => (event: ReactPointerEvent) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        dragRef.current = { name, startX: event.clientX, startY: event.clientY, orig: rect };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // ignore sub-pixel jitter so a plain click on a handle never commits anything
        if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) <= 3) {
            return;
        }
        const dx = (event.clientX - drag.startX) / scale;
        const dy = (event.clientY - drag.startY) / scale;
        setPreview(applyResize(drag.orig, drag.name, dx, dy, minSize, snapStep));
    };

    const handlePointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag && preview) onCommit(preview);
        setPreview(null);
    };

    const handlePointerCancel = () => {
        dragRef.current = null;
        setPreview(null);
    };

    return (
        <g data-shape="handles">
            <rect
                x={shown.x}
                y={shown.y}
                width={shown.w}
                height={shown.d}
                fill="none"
                stroke="#fa8c16"
                strokeWidth={1 / scale}
                strokeDasharray={`${4 / scale} ${3 / scale}`}
                style={{ pointerEvents: 'none' }}
            />
            {HANDLES.map(({ name, cursor }) => {
                const position = handlePosition(shown, name);
                return (
                    <rect
                        key={name}
                        x={position.x - size / 2}
                        y={position.y - size / 2}
                        width={size}
                        height={size}
                        fill="#fff"
                        stroke="#fa8c16"
                        strokeWidth={1 / scale}
                        style={{ cursor }}
                        onPointerDown={handlePointerDown(name)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onLostPointerCapture={handlePointerCancel}
                    />
                );
            })}
        </g>
    );
};

SelectionHandles.displayName = 'SelectionHandles';

export { SelectionHandles };
