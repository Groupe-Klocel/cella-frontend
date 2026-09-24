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
import { RectShape, snap } from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// One building/block rectangle on the stage: click selects, drag moves (world-unit deltas
// derived from the canvas scale), double-click drills down. The live preview stays local —
// the commit on pointer-up is the only state (and undo) entry the gesture produces.

export interface IShapeRectProps {
    rect: RectShape;
    label?: string;
    sublabel?: string;
    selected?: boolean;
    readOnly?: boolean;
    // a placement gesture is armed: the whole canvas belongs to it, so the shape must not
    // swallow the click that ends the gesture (it would select instead of place)
    inert?: boolean;
    dimmed?: boolean;
    fill?: string;
    stroke?: string;
    snapStep?: number | null;
    onSelect?: () => void;
    onOpen?: () => void;
    onCommit?: (rect: RectShape) => void;
    testId?: string;
}

const ShapeRect: FC<IShapeRectProps> = ({
    rect,
    label,
    sublabel,
    selected,
    readOnly,
    inert,
    dimmed,
    fill = 'rgba(24, 144, 255, 0.12)',
    stroke = '#1677ff',
    snapStep,
    onSelect,
    onOpen,
    onCommit,
    testId
}: IShapeRectProps) => {
    const scale = useCanvasScale();
    const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        moved: boolean;
    } | null>(null);

    const handlePointerDown = (event: ReactPointerEvent) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect?.();
        if (readOnly || !onCommit) return;
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            origX: rect.x,
            origY: rect.y,
            moved: false
        };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // screen-pixel threshold: sub-pixel jitter on a plain click must not count as a drag
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
        if (drag?.moved && preview && onCommit) {
            onCommit({ ...rect, x: preview.x, y: preview.y });
        }
        setPreview(null);
    };

    // a cancelled gesture (touch scroll, window blur, capture loss) must not keep dragging
    const handlePointerCancel = () => {
        dragRef.current = null;
        setPreview(null);
    };

    const x = preview?.x ?? rect.x;
    const y = preview?.y ?? rect.y;
    const rotation = rect.r ? `rotate(${rect.r} ${x + rect.w / 2} ${y + rect.d / 2})` : undefined;
    const labelSize = Math.min(Math.max(Math.min(rect.w, rect.d) * 0.18, 0.8), 3);

    return (
        <g
            data-shape="rect"
            transform={rotation}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
            onDoubleClick={(event) => {
                event.stopPropagation();
                onOpen?.();
            }}
            style={{
                cursor: readOnly ? 'pointer' : 'move',
                pointerEvents: inert ? 'none' : undefined
            }}
            opacity={dimmed ? 0.45 : 1}
            data-testid={testId}
        >
            <rect
                x={x}
                y={y}
                width={rect.w}
                height={rect.d}
                fill={fill}
                stroke={selected ? '#fa8c16' : stroke}
                strokeWidth={(selected ? 2.5 : 1.5) / scale}
                rx={0.4}
            />
            {label ? (
                <text
                    x={x + rect.w / 2}
                    y={y + rect.d / 2 + (sublabel ? -labelSize * 0.3 : labelSize * 0.35)}
                    textAnchor="middle"
                    fontSize={labelSize}
                    fill="#333"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {label}
                </text>
            ) : null}
            {sublabel ? (
                <text
                    x={x + rect.w / 2}
                    y={y + rect.d / 2 + labelSize}
                    textAnchor="middle"
                    fontSize={labelSize * 0.7}
                    fill="#888"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {sublabel}
                </text>
            ) : null}
        </g>
    );
};

ShapeRect.displayName = 'ShapeRect';

export { ShapeRect };
