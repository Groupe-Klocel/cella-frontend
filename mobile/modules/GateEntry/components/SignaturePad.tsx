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

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
    width: 100%;
    height: 200px;
    background: #ffffff;
    border: 2px dashed #f5c73d;
    border-radius: 5px;
    touch-action: none;
`;

export interface SignaturePadHandle {
    clear: () => void;
    getDataUrl: () => string | null;
    isEmpty: () => boolean;
}

export interface ISignaturePadProps {
    // Fired with `true` as soon as the user starts drawing (so the parent can
    // enable the "Validate" button), and `false` after a clear.
    onDrawnChange?: (hasDrawn: boolean) => void;
    // Existing signature (base64) to pre-load, e.g. from a previous entry.
    initialDataUrl?: string | null;
}

// Lightweight canvas signature pad using pointer events — no external dependency.
export const SignaturePad = forwardRef<SignaturePadHandle, ISignaturePadProps>(
    ({ onDrawnChange, initialDataUrl }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const drawing = useRef(false);
        const hasDrawn = useRef(false);
        const last = useRef<{ x: number; y: number } | null>(null);

        // Pre-load an existing signature onto the canvas (counts as "drawn").
        useEffect(() => {
            if (!initialDataUrl) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                hasDrawn.current = true;
                onDrawnChange?.(true);
            };
            img.src = initialDataUrl;
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initialDataUrl]);

        const getCtx = () => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            // Match the backing store to the displayed size for crisp lines.
            if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#0050b3';
            }
            return ctx;
        };

        const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current!.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            drawing.current = true;
            last.current = pos(e);
            canvasRef.current?.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawing.current) return;
            const ctx = getCtx();
            const p = pos(e);
            if (ctx && last.current) {
                ctx.beginPath();
                ctx.moveTo(last.current.x, last.current.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                if (!hasDrawn.current) {
                    hasDrawn.current = true;
                    onDrawnChange?.(true);
                }
            }
            last.current = p;
        };

        const onPointerUp = () => {
            drawing.current = false;
            last.current = null;
        };

        useImperativeHandle(ref, () => ({
            clear: () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                hasDrawn.current = false;
                onDrawnChange?.(false);
            },
            getDataUrl: () => {
                if (!hasDrawn.current) return null;
                return canvasRef.current?.toDataURL('image/png') ?? null;
            },
            isEmpty: () => !hasDrawn.current
        }));

        return (
            <Canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            />
        );
    }
);

SignaturePad.displayName = 'SignaturePad';
