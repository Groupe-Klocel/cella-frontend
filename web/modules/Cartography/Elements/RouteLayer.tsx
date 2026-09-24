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
import { Tooltip } from 'antd';
import { FC, ReactNode, useId, useMemo, useState } from 'react';
import { Pt } from '../layoutModel';
import { useCanvasScale } from './LayoutCanvas';

// Navigation-style overlay of a picking route: numbered markers in visit order joined by
// per-leg colored polylines routed along the walkways (an SVG gradient cannot follow a path,
// so each leg gets its own ramp color). Dashed legs mark zone transitions and unplaced stops.
// Only ONE order is ever drawn — the one the screen is showing.
//
// Hovering reads the route both ways: hover a STOP and its incoming/outgoing legs light up with
// marching dashes running in the direction of travel; hover a LEG and it lights up the same way
// together with the two stops it joins. Segments name their endpoints through `fromKey`/`toKey`,
// which are the marker keys — the caller keys both by pick point, so a location visited twice
// carries a single marker and every leg touching it highlights together.

export type RouteStopMarker = {
    key: string;
    x: number;
    y: number;
    label: string;
    state: 'start' | 'end' | 'picked' | 'remaining';
    unplaced?: boolean;
    tooltip?: ReactNode;
    // accessible name for the marker when it is actionable (SVG text alone has no semantics)
    ariaLabel?: string;
    onClick?: () => void;
};

export type RouteSegment = {
    key: string;
    points: Pt[];
    color: string;
    dashed?: boolean;
    // marker keys this leg runs from / to (absent on the stubs of a zone transition)
    fromKey?: string;
    toKey?: string;
    label?: string;
};

export const ROUTE_COLORS = {
    start: '#52c41a',
    end: '#f5222d',
    picked: '#8c8c8c',
    remaining: '#1677ff',
    unplaced: '#faad14'
};

export interface IRouteLayerProps {
    stops: RouteStopMarker[];
    segments: RouteSegment[];
    markerRadius?: number;
}

type Hover = { kind: 'stop' | 'segment'; key: string } | null;

const RouteLayer: FC<IRouteLayerProps> = ({
    stops,
    segments,
    markerRadius = 0.9
}: IRouteLayerProps) => {
    const scale = useCanvasScale();
    const arrowId = useId().replace(/:/g, '');
    const [hover, setHover] = useState<Hover>(null);

    // what the current hover lights up: a stop lights its adjacent legs (and their far ends),
    // a leg lights itself and the two stops it joins
    const highlight = useMemo(() => {
        const legs = new Set<string>();
        const markers = new Set<string>();
        if (!hover) return { legs, markers, active: false };
        if (hover.kind === 'stop') {
            // a stale key (the stop vanished on a re-render) must not dim the whole panel
            if (!stops.some((stop) => stop.key === hover.key))
                return { legs, markers, active: false };
            markers.add(hover.key);
            segments.forEach((segment) => {
                if (segment.fromKey === hover.key || segment.toKey === hover.key) {
                    legs.add(segment.key);
                    if (segment.fromKey) markers.add(segment.fromKey);
                    if (segment.toKey) markers.add(segment.toKey);
                }
            });
        } else {
            const segment = segments.find((entry) => entry.key === hover.key);
            if (segment) {
                legs.add(segment.key);
                if (segment.fromKey) markers.add(segment.fromKey);
                if (segment.toKey) markers.add(segment.toKey);
            }
        }
        return { legs, markers, active: legs.size > 0 || markers.size > 0 };
    }, [hover, segments, stops]);

    const dash = 10 / scale;
    const gap = 6 / scale;

    return (
        <g data-shape="route">
            <defs>
                <marker
                    id={`arrow-${arrowId}`}
                    viewBox="0 0 10 10"
                    refX={8}
                    refY={5}
                    markerWidth={5}
                    markerHeight={5}
                    orient="auto-start-reverse"
                >
                    {/* context-stroke matches each leg's own color (harmless where unsupported) */}
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                </marker>
            </defs>
            {segments.map((segment) => {
                const points = segment.points.map((point) => `${point.x},${point.y}`).join(' ');
                const lit = highlight.legs.has(segment.key);
                const dimmed = highlight.active && !lit;
                return (
                    <g key={segment.key} data-shape="route-leg" data-lit={lit ? 'true' : undefined}>
                        <polyline
                            points={points}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={(lit ? 5 : 2.5) / scale}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={dimmed ? 0.15 : 1}
                            strokeDasharray={
                                lit
                                    ? `${dash} ${gap}`
                                    : segment.dashed
                                      ? `${6 / scale} ${5 / scale}`
                                      : undefined
                            }
                            markerEnd={`url(#arrow-${arrowId})`}
                            style={{ pointerEvents: 'none' }}
                        >
                            {/* marching dashes: the offset runs down to 0, so the pattern
                                travels from the first point to the last — the way to walk it */}
                            {lit ? (
                                <animate
                                    attributeName="stroke-dashoffset"
                                    from={dash + gap}
                                    to="0"
                                    dur="0.7s"
                                    repeatCount="indefinite"
                                />
                            ) : null}
                        </polyline>
                        {/* invisible fat hit area: a 2.5px stroke is far too thin to hover */}
                        <polyline
                            points={points}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={12 / scale}
                            strokeLinecap="round"
                            data-pan="allow"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHover({ kind: 'segment', key: segment.key })}
                            onMouseLeave={() => setHover(null)}
                        >
                            {segment.label ? <title>{segment.label}</title> : null}
                        </polyline>
                    </g>
                );
            })}
            {stops.map((stop) => {
                const fill = ROUTE_COLORS[stop.state];
                const lit = highlight.markers.has(stop.key);
                const dimmed = highlight.active && !lit;
                const marker = (
                    // an actionable marker is a real button for the keyboard too: focusable SVG
                    // group, Enter/Space activation (modern browsers draw the focus ring on the
                    // group's bounding box)
                    <g
                        key={stop.key}
                        onClick={stop.onClick}
                        role={stop.onClick ? 'button' : undefined}
                        tabIndex={stop.onClick ? 0 : undefined}
                        aria-label={stop.onClick ? (stop.ariaLabel ?? stop.label) : undefined}
                        onKeyDown={
                            stop.onClick
                                ? (event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          stop.onClick!();
                                      }
                                  }
                                : undefined
                        }
                        style={{ cursor: stop.onClick ? 'pointer' : 'default' }}
                        // focus lands on THIS element (it carries tabIndex), and focus events do
                        // not travel down to children — so the keyboard highlight belongs here
                        onFocus={() => setHover({ kind: 'stop', key: stop.key })}
                        onBlur={() => setHover(null)}
                    >
                        {/* nested group: the tooltip clones the outer one, our own hover
                            handlers stay untouched here */}
                        <g
                            data-shape="route-stop"
                            opacity={dimmed ? 0.3 : 1}
                            onMouseEnter={() => setHover({ kind: 'stop', key: stop.key })}
                            onMouseLeave={() => setHover(null)}
                        >
                            {lit ? (
                                <circle
                                    cx={stop.x}
                                    cy={stop.y}
                                    r={markerRadius * 1.75}
                                    fill="none"
                                    stroke={stop.unplaced ? ROUTE_COLORS.unplaced : fill}
                                    strokeWidth={markerRadius * 0.22}
                                    opacity={0.55}
                                />
                            ) : null}
                            <circle
                                cx={stop.x}
                                cy={stop.y}
                                r={markerRadius}
                                fill={stop.unplaced ? ROUTE_COLORS.unplaced : fill}
                                stroke="#fff"
                                strokeWidth={markerRadius * 0.18}
                                strokeDasharray={
                                    stop.unplaced
                                        ? `${markerRadius * 0.4} ${markerRadius * 0.3}`
                                        : undefined
                                }
                            />
                            <text
                                x={stop.x}
                                y={stop.y + markerRadius * 0.32}
                                textAnchor="middle"
                                fontSize={
                                    stop.label.length > 2
                                        ? markerRadius * (2 / stop.label.length)
                                        : markerRadius
                                }
                                fontWeight={600}
                                fill="#fff"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {stop.label}
                            </text>
                        </g>
                    </g>
                );
                return stop.tooltip ? (
                    <Tooltip key={stop.key} title={stop.tooltip} trigger={['hover', 'focus']}>
                        {marker}
                    </Tooltip>
                ) : (
                    marker
                );
            })}
        </g>
    );
};

RouteLayer.displayName = 'RouteLayer';

export { RouteLayer };
