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
    createContext,
    FC,
    MutableRefObject,
    PointerEvent as ReactPointerEvent,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useId,
    useRef,
    useState
} from 'react';
import { Pt } from '../layoutModel';

// Shared SVG stage of the cartography screens: world coordinates in meters (y down), one
// <g transform> for zoom/pan, pointer-based panning and cursor-anchored wheel zoom. Shapes
// mark themselves with data-shape so the stage only handles background gestures; they read
// the current scale through useCanvasScale() to convert pointer deltas to world units.

export type WorldBounds = { x: number; y: number; w: number; d: number };

export type LayoutCanvasApi = {
    zoomIn: () => void;
    zoomOut: () => void;
    fit: () => void;
};

const CanvasContext = createContext<{ scale: number }>({ scale: 1 });

export const useCanvasScale = (): number => useContext(CanvasContext).scale;

const MIN_SCALE = 0.2;
const MAX_SCALE = 400;
const FIT_PADDING_PX = 40;
const ZOOM_STEP = 1.3;

export interface ILayoutCanvasProps {
    children: ReactNode;
    contentBounds: WorldBounds | null;
    readOnly?: boolean;
    height?: number;
    gridStep?: number | null;
    // return true to claim the gesture (placing/laying); false lets the stage pan
    onBackgroundPointerDown?: (world: Pt, event: ReactPointerEvent) => boolean;
    onPointerWorldMove?: (world: Pt) => void;
    onBackgroundPointerUp?: (world: Pt) => void;
    testId?: string;
    apiRef?: MutableRefObject<LayoutCanvasApi | null>;
}

const LayoutCanvas: FC<ILayoutCanvasProps> = ({
    children,
    contentBounds,
    readOnly,
    height = 560,
    gridStep,
    onBackgroundPointerDown,
    onPointerWorldMove,
    onBackgroundPointerUp,
    testId,
    apiRef
}: ILayoutCanvasProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height });
    const [view, setView] = useState<{ scale: number; tx: number; ty: number }>({
        scale: 4,
        tx: FIT_PADDING_PX,
        ty: FIT_PADDING_PX
    });
    const viewRef = useRef(view);
    viewRef.current = view;
    const gridId = useId().replace(/:/g, '');

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const toWorld = useCallback((clientX: number, clientY: number): Pt => {
        const rect = svgRef.current?.getBoundingClientRect();
        const current = viewRef.current;
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (clientX - rect.left - current.tx) / current.scale,
            y: (clientY - rect.top - current.ty) / current.scale
        };
    }, []);

    const fit = useCallback(() => {
        const element = containerRef.current;
        if (!element || !contentBounds) return;
        const width = element.clientWidth;
        const innerHeight = element.clientHeight;
        const boundsW = Math.max(contentBounds.w, 10);
        const boundsD = Math.max(contentBounds.d, 10);
        const scale = Math.min(
            (width - FIT_PADDING_PX * 2) / boundsW,
            (innerHeight - FIT_PADDING_PX * 2) / boundsD
        );
        const clamped = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
        setView({
            scale: clamped,
            tx: (width - boundsW * clamped) / 2 - contentBounds.x * clamped,
            ty: (innerHeight - boundsD * clamped) / 2 - contentBounds.y * clamped
        });
    }, [contentBounds]);

    const zoomBy = useCallback((factor: number, anchor?: { x: number; y: number }) => {
        setView((current) => {
            const scale = Math.min(Math.max(current.scale * factor, MIN_SCALE), MAX_SCALE);
            const element = containerRef.current;
            const center = anchor ?? {
                x: (element?.clientWidth ?? 0) / 2,
                y: (element?.clientHeight ?? 0) / 2
            };
            const ratio = scale / current.scale;
            return {
                scale,
                tx: center.x - (center.x - current.tx) * ratio,
                ty: center.y - (center.y - current.ty) * ratio
            };
        });
    }, []);

    useEffect(() => {
        if (apiRef) {
            apiRef.current = {
                zoomIn: () => zoomBy(ZOOM_STEP),
                zoomOut: () => zoomBy(1 / ZOOM_STEP),
                fit
            };
        }
    }, [apiRef, zoomBy, fit]);

    // first fit once the content extent is known
    const fittedRef = useRef(false);
    useEffect(() => {
        if (fittedRef.current || !contentBounds || size.width === 0) return;
        fittedRef.current = true;
        fit();
    }, [contentBounds, size.width, fit]);

    // React registers wheel listeners passively at the root: a native active listener is the
    // only way to preventDefault (page scroll) while zooming
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = svg.getBoundingClientRect();
            zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            });
        };
        svg.addEventListener('wheel', handleWheel, { passive: false });
        return () => svg.removeEventListener('wheel', handleWheel);
    }, [zoomBy]);

    const interactionRef = useRef<
        | { kind: 'pan'; startX: number; startY: number; tx: number; ty: number; moved: boolean }
        | { kind: 'custom' }
        | null
    >(null);

    const handlePointerDown = (event: ReactPointerEvent) => {
        if (event.button !== 0 && event.button !== 1) return;
        // shapes handle their own gestures — except elements that opt back in (the invisible
        // hover strips of the route legs cover a lot of canvas and must stay pannable)
        const target = event.target as Element;
        if (target.closest?.('[data-shape]') && !target.closest?.('[data-pan="allow"]')) return;
        const world = toWorld(event.clientX, event.clientY);
        if (!readOnly && onBackgroundPointerDown?.(world, event)) {
            interactionRef.current = { kind: 'custom' };
        } else {
            interactionRef.current = {
                kind: 'pan',
                startX: event.clientX,
                startY: event.clientY,
                tx: viewRef.current.tx,
                ty: viewRef.current.ty,
                moved: false
            };
        }
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        onPointerWorldMove?.(toWorld(event.clientX, event.clientY));
        const interaction = interactionRef.current;
        if (!interaction || interaction.kind !== 'pan') return;
        const dx = event.clientX - interaction.startX;
        const dy = event.clientY - interaction.startY;
        if (Math.abs(dx) + Math.abs(dy) > 2) interaction.moved = true;
        setView((current) => ({
            ...current,
            tx: interaction.tx + dx,
            ty: interaction.ty + dy
        }));
    };

    const handlePointerUp = (event: ReactPointerEvent) => {
        const interaction = interactionRef.current;
        interactionRef.current = null;
        if (interaction?.kind === 'custom') {
            onBackgroundPointerUp?.(toWorld(event.clientX, event.clientY));
        }
    };

    // a cancelled pointer (capture loss, touch scroll) must not leave the pan stuck to hover
    const handlePointerCancel = () => {
        interactionRef.current = null;
    };

    // visible world area, used to bound the grid pattern rect
    const worldLeft = -view.tx / view.scale;
    const worldTop = -view.ty / view.scale;
    const worldWidth = size.width / view.scale;
    const worldHeight = size.height / view.scale;

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height,
                border: '1px solid rgba(140, 140, 140, 0.3)',
                borderRadius: 4,
                background: '#fff',
                overflow: 'hidden',
                position: 'relative'
            }}
            data-testid={testId}
        >
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ display: 'block', touchAction: 'none', cursor: 'grab' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onLostPointerCapture={handlePointerCancel}
            >
                {gridStep ? (
                    <defs>
                        <pattern
                            id={`grid-${gridId}`}
                            width={gridStep * view.scale}
                            height={gridStep * view.scale}
                            patternUnits="userSpaceOnUse"
                            patternTransform={`translate(${view.tx}, ${view.ty})`}
                        >
                            <path
                                d={`M ${gridStep * view.scale} 0 L 0 0 0 ${gridStep * view.scale}`}
                                fill="none"
                                stroke="rgba(140, 140, 140, 0.15)"
                                strokeWidth={1}
                            />
                        </pattern>
                    </defs>
                ) : null}
                {gridStep ? (
                    <rect width="100%" height="100%" fill={`url(#grid-${gridId})`} />
                ) : null}
                <g transform={`translate(${view.tx}, ${view.ty}) scale(${view.scale})`}>
                    <CanvasContext.Provider value={{ scale: view.scale }}>
                        {children}
                    </CanvasContext.Provider>
                </g>
                {/* origin axes, drawn only when the visible area contains them */}
                {worldLeft < 0 && worldLeft + worldWidth > 0 ? (
                    <line
                        x1={view.tx}
                        y1={0}
                        x2={view.tx}
                        y2={size.height}
                        stroke="rgba(140, 140, 140, 0.25)"
                        strokeDasharray="4 4"
                    />
                ) : null}
                {worldTop < 0 && worldTop + worldHeight > 0 ? (
                    <line
                        x1={0}
                        y1={view.ty}
                        x2={size.width}
                        y2={view.ty}
                        stroke="rgba(140, 140, 140, 0.25)"
                        strokeDasharray="4 4"
                    />
                ) : null}
            </svg>
        </div>
    );
};

LayoutCanvas.displayName = 'LayoutCanvas';

export { LayoutCanvas };
