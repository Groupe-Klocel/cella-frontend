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
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { AppHead, ContentSpin, HeaderContent, LinkButton, PageContentWrapper } from '@components';
import {
    findValueByScopeAndCode,
    getModesFromPermissions,
    pathParams,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Empty,
    Result,
    Row,
    Segmented,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip
} from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table as TableName } from 'generated/graphql';
import { OCCUPANCY_COLORS } from 'modules/LocationsOccupancy/occupancyModel';
import { roundsRoutes } from 'modules/Rounds/Static/roundsRoutes';
import { useRouter } from 'next/router';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import { BLOCKED_COLOR, BlockCellsLayer } from '../Elements/BlockCellsLayer';
import { AccessPointLayer } from '../Elements/AccessPointLayer';
import { LayoutCanvas, WorldBounds } from '../Elements/LayoutCanvas';
import { RouteLayer, RouteSegment, RouteStopMarker } from '../Elements/RouteLayer';
import { RouteLegend } from '../Elements/RouteLegend';
import { RouteBlock, RouteRaa, useRouteAnalysis } from '../hooks';
import {
    AislePath,
    AccessGraph,
    accessAwareDistance,
    AccessNode,
    accessPointsOnFloor,
    accessGraphCoversZones,
    accessRoute,
    AccessRoute,
    BLOCKED_CROSSING_PENALTY,
    BlockedZone,
    blockedZoneCorners,
    BlockFrame,
    buildAccessGraph,
    BuildingLayout,
    aisleCorridors,
    AisleDef,
    buildNavGraph,
    cellRect,
    chooseOptionChain,
    localToParent,
    locateCellSides,
    mergeRowRects,
    NavGraph,
    nodeDistance,
    optimizeRoute,
    parseBlockLayout,
    parseBuildingLayout,
    pathHitsRects,
    Pt,
    RectShape,
    routeOnNavGraph,
    routeThroughAisles,
    SitePos
} from '../layoutModel';

// Picking-route analysis of a round: its roundAdvisedAddresses in roundOrderId order, drawn as
// numbered markers joined by navigation-style polylines that NEVER CUT THROUGH RACKS (each leg
// is the shortest path on a per-floor visibility graph of aisle ends and corridor points, and
// the estimated distances measure that same routed path) — one panel per (building, floor). A
// client-side nearest-neighbor simulation compares the current order with a geometry-optimized
// one; nothing is ever written from this screen. Two `round` parameters gate it (value 1 = on):
// SHOW_VISUAL_ROUTE opens the screen itself (and its button on the round detail page), while
// SHOW_OPTIMIZED_ROUTE only adds the optimized-order simulation on top of it.

// how far outside the walked corridors a forbidden zone still counts (meters)
const ZONE_REACH = 15;

const MARKER_RADIUS = 0.55;

const axis = (value: string | null | undefined): string =>
    value === null || value === undefined || value === '' ? '-' : value;

const aisleKey = (blockId: string, aisle: string): string => `${blockId} ${aisle}`;

// A two-sided aisle has two corridors; the fallback heuristic must use the one the stop really
// stands in. They are parallel and share the same extent, so the nearer midpoint is the nearer
// corridor — the along-axis part of the distance is identical for both.
const nearestCorridor = (paths: AislePath[] | undefined, point: Pt): AislePath | null => {
    if (!paths || paths.length === 0) return null;
    if (paths.length === 1) return paths[0];
    let best = paths[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    paths.forEach((path) => {
        const midX = (path.from[0] + path.to[0]) / 2;
        const midY = (path.from[1] + path.to[1]) / 2;
        const distance = Math.hypot(midX - point.x, midY - point.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = path;
        }
    });
    return best;
};

// blue -> red ramp along the route (an SVG gradient cannot follow a path)
const routeRamp = (progress: number): string => {
    const clamped = Math.max(0, Math.min(1, progress));
    const from = [22, 119, 255];
    const to = [245, 34, 45];
    const channel = (index: number) =>
        Math.round(from[index] + (to[index] - from[index]) * clamped);
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

type Stop = {
    key: string;
    raas: RouteRaa[];
    seqFrom: number;
    seqTo: number;
    blockId: string;
    blockName: string;
    aisle: string;
    column: string;
    panelKey: string;
    // every standing point this location offers (one per allowed pick side, primary first);
    // `local`/`site` hold the one the route actually walks, chosen per leg by `resolveSides`
    options: Array<{ local: Pt; site: SitePos }>;
    local: Pt | null;
    site: SitePos | null;
    placed: boolean;
    picked: boolean;
    locationName: string;
    locationId: string;
};

type Panel = {
    key: string;
    buildingId: string;
    buildingName: string;
    buildingLayout: BuildingLayout | null;
    floor: number;
    blocks: RouteBlock[];
    bounds: WorldBounds;
};

type OrderMetrics = {
    distance: number;
    aisleChanges: number;
    blockChanges: number;
    floorChanges: number;
    buildingChanges: number;
};

export interface IRoundRouteAnalysisProps {
    id: string;
}

const RoundRouteAnalysis: FC<IRoundRouteAnalysisProps> = ({ id }: IRoundRouteAnalysisProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions, parameters } = useAppState();
    const modes = getModesFromPermissions(permissions, TableName.RoundAdvisedAddress);
    // `parameters` is undefined until loaded (and stays so if the fetch errored): fail closed,
    // never throw. SHOW_VISUAL_ROUTE opens the screen — same gate as its button on the round
    // detail page; SHOW_OPTIMIZED_ROUTE additionally offers the optimized-order simulation.
    const isParameterOn = (code: string): boolean =>
        String(findValueByScopeAndCode(parameters ?? [], 'round', code) ?? '') === '1';
    const routeAnalysisEnabled = isParameterOn('SHOW_VISUAL_ROUTE');
    const optimizedRouteEnabled = isParameterOn('SHOW_OPTIMIZED_ROUTE');
    const canRead = modes.includes(ModeEnum.Read) && routeAnalysisEnabled;

    const { round, raas, blocks, site, truncatedCount, isLoading, reload } = useRouteAnalysis(
        id,
        canRead
    );
    const [order, setOrder] = useState<'current' | 'optimized'>('current');
    const [drawerStop, setDrawerStop] = useState<Stop | null>(null);

    // ---------- geometry frames, one per block of the round ----------

    const frames = useMemo(() => {
        const map = new Map<string, BlockFrame & { blockName: string; buildingName: string }>();
        (blocks ?? []).forEach((block) => {
            map.set(block.id, {
                blockId: block.id,
                blockName: block.name,
                buildingId: block.building?.id ?? '-',
                buildingName: block.building?.name ?? '-',
                floor: block.level,
                layout: parseBlockLayout(block.layout),
                buildingLayout: parseBuildingLayout(block.building?.layout)
            });
        });
        return map;
    }, [blocks]);

    // The floors a building HAS, which is what decides the neighbour of a floor access (a hole in
    // the numbering must be skipped, not assumed to be floor +/- 1). Same definition as the
    // cartography editor's floor tabs — the block_level parameter completed by the levels the
    // blocks actually use — so a staircase resolves here exactly as it was configured there.
    const floorLevels = useMemo(() => {
        const shared: number[] = [];
        (parameters ?? [])
            .filter((parameter: any) => parameter.scope === 'block_level')
            .forEach((parameter: any) => {
                const code = Number(parameter.code);
                if (Number.isFinite(code)) shared.push(code);
            });
        // Per building, from EVERY block of the site — never from the blocks this round happens
        // to visit: `adjacentFloor` answers only from the list it is given, so a round-shaped
        // list would make the same staircase link different floors on this screen than in the
        // editor (and than in the standard function that rewrites the order).
        const perBuilding = new Map<string, number[]>();
        (site?.levels ?? []).forEach((row) => {
            const list = perBuilding.get(row.buildingId) ?? [...shared];
            list.push(row.level);
            perBuilding.set(row.buildingId, list);
        });
        const sorted = new Map<string, number[]>();
        perBuilding.forEach((list, buildingId) => {
            sorted.set(
                buildingId,
                Array.from(new Set(list)).sort((a, b) => a - b)
            );
        });
        return { shared: Array.from(new Set(shared)).sort((a, b) => a - b), byBuilding: sorted };
    }, [parameters, site]);

    const floorsOf = useCallback(
        (buildingId: string): number[] =>
            floorLevels.byBuilding.get(buildingId) ?? floorLevels.shared,
        [floorLevels]
    );

    // Doors and vertical links, as one small directed graph shared by the metrics, the
    // optimizer and the drawing. Built from EVERY building of the site, because a building the
    // round does not pick in can still be the one a covered walkway crosses.
    const siteAccessGraph = useMemo(
        () =>
            buildAccessGraph(
                (site?.buildings ?? []).map((building) => ({
                    id: building.id,
                    layout: parseBuildingLayout(building.layout),
                    floors: floorsOf(building.id)
                }))
            ),
        [site, floorsOf]
    );

    // ... but used only when it serves EVERY zone this round visits. A configured hop can never
    // be cheaper than the flat estimate of the same pair (the detour through a door is at least
    // the straight line), so mixing the two models inside one round would make the floors
    // somebody equipped look expensive and push the route towards the ones nobody configured.
    // All or nothing: below full coverage the round keeps exactly the behaviour it had before.
    const accessGraph: AccessGraph | null = useMemo(() => {
        const zones = new Map<string, { buildingId: string; floor: number }>();
        frames.forEach((frame) => {
            zones.set(`${frame.buildingId} ${frame.floor}`, {
                buildingId: frame.buildingId,
                floor: frame.floor
            });
        });
        return accessGraphCoversZones(siteAccessGraph, Array.from(zones.values()))
            ? siteAccessGraph
            : null;
    }, [siteAccessGraph, frames]);

    // Walkable corridors beside every laid aisle (an aisle segment is the rack row itself, so
    // the operator walks along its allowed pick side(s)), in building-local coords (drawing &
    // same-building routing) and in site coords (the optimizer's distance function). All allowed
    // sides are walkable: a two-sided aisle contributes both of its corridors, and `resolveSides`
    // decides per leg which one a stop is actually reached from (index 0 is the primary side).
    const aisleGeo = useMemo(() => {
        const local = new Map<string, AislePath[]>();
        const site = new Map<string, AislePath[]>();
        frames.forEach((frame, blockId) => {
            const layout = frame.layout;
            if (!layout?.aisles) return;
            Object.keys(layout.aisles).forEach((aisle) => {
                const localPaths: AislePath[] = [];
                const sitePaths: AislePath[] = [];
                // every SEGMENT of the aisle contributes its own corridors; they all live under
                // the aisle's key and `nearestCorridor` picks the stretch a stop really stands in
                const corridors = layout.aisles![aisle].flatMap((def) =>
                    aisleCorridors(
                        { from: def.from, to: def.to },
                        def.sides,
                        def.cellD ?? layout.cellDefaults?.d ?? 1
                    )
                );
                corridors.forEach((corridor) => {
                    const fromLocal = localToParent(
                        { x: corridor.from[0], y: corridor.from[1] },
                        layout.b
                    );
                    const toLocal = localToParent(
                        { x: corridor.to[0], y: corridor.to[1] },
                        layout.b
                    );
                    localPaths.push({
                        from: [fromLocal.x, fromLocal.y],
                        to: [toLocal.x, toLocal.y]
                    });
                    const fromSite = frame.buildingLayout
                        ? localToParent(fromLocal, frame.buildingLayout.site)
                        : fromLocal;
                    const toSite = frame.buildingLayout
                        ? localToParent(toLocal, frame.buildingLayout.site)
                        : toLocal;
                    sitePaths.push({
                        from: [fromSite.x, fromSite.y],
                        to: [toSite.x, toSite.y]
                    });
                });
                local.set(aisleKey(blockId, aisle), localPaths);
                site.set(aisleKey(blockId, aisle), sitePaths);
            });
        });
        return { local, site };
    }, [frames]);

    // ---------- RAAs -> coalesced stops (consecutive picks in the same cell) ----------

    const { stops, noStock } = useMemo(() => {
        const coalesced: Stop[] = [];
        const skipped: RouteRaa[] = [];
        (raas ?? []).forEach((raa) => {
            if (!raa.locationId || !raa.location) {
                skipped.push(raa);
                return;
            }
            const frame = frames.get(raa.location.blockId);
            const aisle = axis(raa.location.aisle);
            const column = axis(raa.location.column);
            const sequence = raa.roundOrderId ?? 0;
            const previous = coalesced[coalesced.length - 1];
            if (
                previous &&
                previous.blockId === raa.location.blockId &&
                previous.aisle === aisle &&
                previous.column === column
            ) {
                previous.raas.push(raa);
                previous.seqTo = sequence;
                previous.picked = previous.picked && (raa.quantity ?? 0) === 0;
                return;
            }
            const options = frame ? locateCellSides(aisle, column, frame) : [];
            const located = options[0] ?? null;
            coalesced.push({
                key: `stop-${raa.id}`,
                raas: [raa],
                seqFrom: sequence,
                seqTo: sequence,
                blockId: raa.location.blockId,
                blockName: frame?.blockName ?? '-',
                aisle,
                column,
                panelKey: frame ? `${frame.buildingId} ${frame.floor}` : '-',
                options,
                local: located?.local ?? null,
                site: located?.site ?? null,
                placed: !!located,
                picked: (raa.quantity ?? 0) === 0,
                locationName: raa.location.name,
                locationId: raa.location.id
            });
        });
        return { stops: coalesced, noStock: skipped };
    }, [raas, frames]);

    // Rack-free navigation graph per (building, floor) panel. Two things keep it affordable on a
    // production block (a 30 000-location block is ~2 000 cells): the obstacles are the rack ROWS
    // (contiguous cells merged, see mergeRowRects) rather than every single cell, and the walkable
    // corridors are only those of the aisles the round actually VISITS — the cost follows the
    // number of aisles walked, never the size of the warehouse. Every row stays an obstacle, so a
    // leg still never crosses a location. `origin` translates site coords back to building-local
    // (the two frames differ by the building's placement only), `cache` memoizes legs for the
    // optimizer's O(n^2) distance calls.
    const panelNav = useMemo(() => {
        const visitedAisles = new Set<string>();
        stops.forEach((stop) => {
            if (stop.placed) visitedAisles.add(aisleKey(stop.blockId, stop.aisle));
        });
        const perPanel = new Map<
            string,
            {
                aisles: { from: Pt; to: Pt }[];
                obstacles: RectShape[];
                // forbidden zones of this floor, before the walked-area filter below
                zones: RectShape[];
                // turning points beside the forbidden zones — without them the graph has no
                // node next to a wall and simply finds no way round it
                corners: Pt[];
                origin: Pt;
            }
        >();
        frames.forEach((frame, blockId) => {
            const layout = frame.layout;
            if (!layout) return;
            const panelKey = `${frame.buildingId} ${frame.floor}`;
            let entry = perPanel.get(panelKey);
            if (!entry) {
                entry = {
                    aisles: [],
                    obstacles: [],
                    zones: [],
                    corners: [],
                    origin: frame.buildingLayout
                        ? { x: frame.buildingLayout.site.x, y: frame.buildingLayout.site.y }
                        : { x: 0, y: 0 }
                };
                perPanel.set(panelKey, entry);
            }
            Object.keys(layout.aisles ?? {}).forEach((aisle) => {
                if (!visitedAisles.has(aisleKey(blockId, aisle))) return;
                (aisleGeo.local.get(aisleKey(blockId, aisle)) ?? []).forEach((path) => {
                    entry!.aisles.push({
                        from: { x: path.from[0], y: path.from[1] },
                        to: { x: path.to[0], y: path.to[1] }
                    });
                });
            });
            Object.keys(layout.cells ?? {}).forEach((aisle) => {
                const cells = layout.cells![aisle];
                // merged PER SEGMENT: the stretches of a split aisle have their own direction,
                // and merging across the gap would build a rack where the gap is
                const segments = layout.aisles?.[aisle] ?? [];
                const claimed = new Set<string>();
                const groups: { def: AisleDef | undefined; columns: string[] }[] = segments.map(
                    (def) => ({
                        def,
                        columns: def.columns.filter((column) => {
                            if (!cells[column] || claimed.has(column)) return false;
                            claimed.add(column);
                            return true;
                        })
                    })
                );
                const orphans = Object.keys(cells).filter((column) => !claimed.has(column));
                if (orphans.length > 0) groups.push({ def: segments[0], columns: orphans });
                groups.forEach((group) => {
                    const rects = group.columns.map((column) => {
                        const cell = cells[column];
                        return cellRect(
                            { x: cell.x, y: cell.y },
                            group.def,
                            cell.w ?? 1.2,
                            cell.d ?? 1
                        );
                    });
                    mergeRowRects(rects).forEach((rect) => {
                        const origin = localToParent({ x: rect.x, y: rect.y }, layout.b);
                        entry!.obstacles.push({ x: origin.x, y: origin.y, w: rect.w, d: rect.d });
                    });
                });
            });
            // a forbidden zone is an obstacle like a rack row, and unlike a rack row it also
            // contributes the four points a walk can turn at to get round it. Collected here,
            // filtered to the walked area below.
            (layout.blocked ?? []).forEach((zone) => {
                const origin = localToParent({ x: zone.x, y: zone.y }, layout.b);
                entry!.zones.push({ x: origin.x, y: origin.y, w: zone.w, d: zone.d });
            });
        });
        // Zones nowhere near what the round walks are dropped, exactly as unvisited aisles are:
        // the graph cost is O(nodes^2 x obstacles) and refuses past a budget, so a warehouse
        // with walls everywhere would otherwise lose rack-free routing for the whole floor —
        // the very thing the zones are there to improve. A zone within ZONE_REACH of the walked
        // corridors is kept; nothing a leg of this round can reach lies further out.
        perPanel.forEach((entry) => {
            if (entry.zones.length === 0) return;
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            entry.aisles.forEach((aisle) => {
                [aisle.from, aisle.to].forEach((point) => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
            });
            if (minX === Infinity) return;
            const near = entry.zones.filter(
                (zone) =>
                    zone.x <= maxX + ZONE_REACH &&
                    zone.x + zone.w >= minX - ZONE_REACH &&
                    zone.y <= maxY + ZONE_REACH &&
                    zone.y + zone.d >= minY - ZONE_REACH
            );
            near.forEach((zone) => {
                entry.obstacles.push(zone);
                blockedZoneCorners(zone).forEach((corner) => entry.corners.push(corner));
            });
        });
        const graphs = new Map<string, NavGraph | null>();
        const origins = new Map<string, Pt>();
        const zones = new Map<string, RectShape[]>();
        perPanel.forEach((entry, panelKey) => {
            const kept = entry.obstacles.filter((rect) => entry.zones.includes(rect));
            graphs.set(panelKey, buildNavGraph(entry.aisles, entry.obstacles, entry.corners, kept));
            origins.set(panelKey, entry.origin);
            zones.set(panelKey, kept);
        });
        return {
            graphs,
            origins,
            zones,
            cache: new Map<string, { points: Pt[]; distance: number } | null>()
        };
    }, [frames, aisleGeo, stops]);

    const routeInPanel = useCallback(
        (panelKey: string, a: Pt, b: Pt): { points: Pt[]; distance: number } | null => {
            const graph = panelNav.graphs.get(panelKey);
            if (!graph) return null;
            const key = `${panelKey}|${a.x},${a.y}|${b.x},${b.y}`;
            if (panelNav.cache.has(key)) return panelNav.cache.get(key) ?? null;
            const route = routeOnNavGraph(graph, a, b);
            panelNav.cache.set(key, route);
            return route;
        },
        [panelNav]
    );

    // ---------- panels: one per (building, floor), ordered by first visit ----------

    const panels = useMemo(() => {
        const list: Panel[] = [];
        const byKey = new Map<string, Panel>();
        stops.forEach((stop) => {
            if (byKey.has(stop.panelKey)) return;
            const frame = frames.get(stop.blockId);
            if (!frame) return;
            const panelBlocks = (blocks ?? []).filter(
                (block) =>
                    (block.building?.id ?? '-') === frame.buildingId && block.level === frame.floor
            );
            const panel: Panel = {
                key: stop.panelKey,
                buildingId: frame.buildingId,
                buildingName: frame.buildingName,
                buildingLayout: frame.buildingLayout,
                floor: frame.floor,
                blocks: panelBlocks,
                bounds: { x: 0, y: 0, w: 40, d: 20 }
            };
            byKey.set(stop.panelKey, panel);
            list.push(panel);
        });
        // panel extent: placed block rects + the building outline + stop points
        list.forEach((panel) => {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            const include = (x: number, y: number) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            };
            panel.blocks.forEach((block) => {
                const layout = frames.get(block.id)?.layout;
                if (!layout) return;
                include(layout.b.x, layout.b.y);
                include(layout.b.x + layout.b.w, layout.b.y + layout.b.d);
            });
            accessPointsOnFloor(
                panel.buildingLayout,
                panel.floor,
                floorsOf(panel.buildingId)
            ).forEach((placed) => include(placed.point.x, placed.point.y));
            stops.forEach((stop) => {
                if (stop.panelKey !== panel.key) return;
                // every side the stop MAY be picked from, not just the primary one: the panel
                // must not clip a marker that the per-leg side choice moves to the other corridor
                if (stop.local) include(stop.local.x, stop.local.y);
                stop.options.forEach((option) => include(option.local.x, option.local.y));
            });
            if (minX !== Infinity) {
                panel.bounds = { x: minX - 2, y: minY - 2, w: maxX - minX + 4, d: maxY - minY + 4 };
            }
        });
        return list;
    }, [stops, frames, blocks, floorsOf]);

    // unplaced stops get a deterministic slot in a row under their panel, badged "not placed"
    const placedStops = useMemo(() => {
        const byPanel = new Map<string, number>();
        return stops.map((stop) => {
            if (stop.local) return stop;
            const panel = panels.find((entry) => entry.key === stop.panelKey);
            const index = byPanel.get(stop.panelKey) ?? 0;
            byPanel.set(stop.panelKey, index + 1);
            const base = panel?.bounds ?? { x: 0, y: 0, w: 40, d: 20 };
            return {
                ...stop,
                local: { x: base.x + 2 + index * 2.6, y: base.y + base.d + 2.5 }
            };
        });
    }, [stops, panels]);

    // ---------- walkway routing (never through the racks) ----------

    const routeLegLocal = useCallback(
        (a: Stop, b: Stop): { points: Pt[]; distance: number; blocked?: boolean } | null => {
            if (!a.local || !b.local || a.panelKey !== b.panelKey) return null;
            if (!a.placed || !b.placed) {
                return { points: [a.local, b.local], distance: 0 };
            }
            const routed = routeInPanel(a.panelKey, a.local, b.local);
            if (routed) return routed;
            // no rack-free path (or oversized layout): degrade to the aisle-ends heuristic
            const sameAisle = a.blockId === b.blockId && a.aisle === b.aisle;
            const fallback = routeThroughAisles(
                a.local,
                b.local,
                nearestCorridor(aisleGeo.local.get(aisleKey(a.blockId, a.aisle)), a.local),
                nearestCorridor(aisleGeo.local.get(aisleKey(b.blockId, b.aisle)), b.local),
                sameAisle
            );
            // The heuristic knows nothing about the forbidden zones. When what it draws goes
            // through one, this is NOT a route: the layout gives no legal way between these two
            // stops (a lane shut across its whole width, a stop standing inside a zone). Say so
            // rather than drawing a plausible line — and see routedSiteDistance, which prices it
            // so the optimizer can never prefer it.
            const blocked = pathHitsRects(fallback.points, panelNav.zones.get(a.panelKey) ?? []);
            return blocked ? { ...fallback, blocked } : fallback;
        },
        [aisleGeo, routeInPanel, panelNav]
    );

    const routedSiteDistance = useCallback(
        (a: SitePos, b: SitePos): number => {
            if (a.buildingId !== b.buildingId || a.floor !== b.floor) {
                // leaving the zone: walk it through the configured doors and stairs when they
                // describe a way, keep the flat penalty when they do not
                return accessAwareDistance(a, b, accessGraph);
            }
            const panelKey = `${a.buildingId} ${a.floor}`;
            const origin = panelNav.origins.get(panelKey);
            if (origin) {
                // site -> building-local is a pure translation, and distances are invariant
                const routed = routeInPanel(
                    panelKey,
                    { x: a.x - origin.x, y: a.y - origin.y },
                    { x: b.x - origin.x, y: b.y - origin.y }
                );
                if (routed) return routed.distance;
            }
            const sameAisle = a.blockId === b.blockId && a.aisle === b.aisle;
            const fallback = routeThroughAisles(
                { x: a.x, y: a.y },
                { x: b.x, y: b.y },
                nearestCorridor(aisleGeo.site.get(aisleKey(a.blockId, a.aisle)), a),
                nearestCorridor(aisleGeo.site.get(aisleKey(b.blockId, b.aisle)), b),
                sameAisle
            );
            // the heuristic ignores the forbidden zones: if what it produces goes through one,
            // there is no known legal path — price it so the optimizer never chooses it
            const zones = panelNav.zones.get(panelKey);
            if (zones?.length && origin) {
                const shifted = fallback.points.map((point) => ({
                    x: point.x - origin.x,
                    y: point.y - origin.y
                }));
                if (pathHitsRects(shifted, zones)) {
                    return fallback.distance + BLOCKED_CROSSING_PENALTY;
                }
            }
            return fallback.distance;
        },
        [aisleGeo, panelNav, routeInPanel, accessGraph]
    );

    // ---------- per-leg pick side (the Z / U shape of a two-sided aisle) ----------

    // An aisle picked from BOTH sides gives each of its locations two standing points, one per
    // corridor. Which one the operator uses is a property of the ROUTE, not of the location:
    // coming from the left, crossing over to the right-hand corridor is a pointless detour. For
    // a FIXED visit order the best assignment is exact and cheap — `chooseOptionChain` runs one
    // Viterbi pass over the sequence, i.e. ~4 routed legs per stop instead of enumerating 2^n
    // combinations. It minimises the very distance `computeMetrics` reports, so the metric and
    // the drawing always agree, and the marker ends up where the operator really stands — which
    // is what makes the chosen side readable on the map.
    // The visit ORDER itself is still decided on the primary side: making the nearest-neighbour
    // + 2-opt search side-aware would multiply its O(n^2) routed-distance calls by four for a
    // second-order gain.
    const resolveSides = useCallback(
        (sequence: Stop[]): Stop[] => {
            if (!sequence.some((stop) => stop.options.length > 1)) return sequence;
            // unplaced stops carry no geometry: they are skipped exactly as computeMetrics
            // skips them, so the chain measures the same legs the screen draws
            const chain: number[] = [];
            sequence.forEach((stop, index) => {
                if (stop.options.length > 0) chain.push(index);
            });
            if (chain.length === 0) return sequence;
            const picked = chooseOptionChain(
                chain.map((index) => sequence[index].options),
                (a, b) => routedSiteDistance(a.site, b.site)
            );
            const resolved = [...sequence];
            chain.forEach((index, step) => {
                const stop = sequence[index];
                const option = stop.options[picked[step]];
                if (!option) return;
                resolved[index] = { ...stop, local: option.local, site: option.site };
            });
            return resolved;
        },
        [routedSiteDistance]
    );

    const computeMetrics = useCallback(
        (sequence: Stop[]): OrderMetrics => {
            const metrics: OrderMetrics = {
                distance: 0,
                aisleChanges: 0,
                blockChanges: 0,
                floorChanges: 0,
                buildingChanges: 0
            };
            // measure over the placed stops only, skipping unplaced ones as if they were not
            // there: both orders then measure the exact same set of legs (the optimizer tails
            // the unplaced stops, so keeping legs anchored on them would under-measure the
            // current order and bias the delta)
            const placed = sequence.filter((stop): stop is Stop & { site: SitePos } => !!stop.site);
            for (let index = 1; index < placed.length; index++) {
                const previous = placed[index - 1];
                const current = placed[index];
                if (previous.site.buildingId !== current.site.buildingId) {
                    metrics.buildingChanges++;
                } else if (previous.site.floor !== current.site.floor) {
                    metrics.floorChanges++;
                } else if (previous.site.blockId !== current.site.blockId) {
                    metrics.blockChanges++;
                } else if (previous.site.aisle !== current.site.aisle) {
                    metrics.aisleChanges++;
                }
                // every resolved leg counts: same-floor legs measure the routed walkway path,
                // cross-floor/building legs the tiered estimate (meter-equivalent penalties) —
                // the same function the optimizer minimizes, so the delta compares like with like
                metrics.distance += routedSiteDistance(previous.site, current.site);
            }
            metrics.distance = Math.round(metrics.distance * 10) / 10;
            return metrics;
        },
        [routedSiteDistance]
    );

    // ---------- what-if simulation (client-side only, nothing is written) ----------

    // the real order, with the pick side of every two-sided stop resolved along it
    const currentStops = useMemo(() => resolveSides(placedStops), [resolveSides, placedStops]);

    const optimizedStops = useMemo(() => {
        // opting out of the simulation opts out of its cost: this is the heaviest computation of
        // the screen (nearest-neighbour over routed distances, i.e. O(n^2) graph searches)
        if (!optimizedRouteEnabled) return currentStops;
        const firstPlaced = placedStops.find((stop) => stop.site);
        return resolveSides(
            optimizeRoute(
                placedStops,
                (stop) => stop.site,
                firstPlaced?.site ? { x: firstPlaced.site.x, y: firstPlaced.site.y } : null,
                routedSiteDistance
            )
        );
    }, [placedStops, currentStops, resolveSides, routedSiteDistance, optimizedRouteEnabled]);

    const currentMetrics = useMemo(
        () => computeMetrics(currentStops),
        [computeMetrics, currentStops]
    );
    const optimizedMetrics = useMemo(
        () => computeMetrics(optimizedStops),
        [computeMetrics, optimizedStops]
    );
    const deltaPercent =
        currentMetrics.distance > 0
            ? Math.round(
                  ((optimizedMetrics.distance - currentMetrics.distance) /
                      currentMetrics.distance) *
                      100
              )
            : 0;

    // the toggle only exists when SHOW_OPTIMIZED_ROUTE is on, so a stale 'optimized' selection
    // (parameter turned off meanwhile) still falls back to the real order
    const shownOrder = optimizedRouteEnabled ? order : 'current';
    const shownStops = shownOrder === 'current' ? currentStops : optimizedStops;
    const shownMetrics = shownOrder === 'current' ? currentMetrics : optimizedMetrics;

    // ---------- per-panel markers and segments ----------

    // Marker identity = pick point + location, so a leg can name the markers it joins and the
    // several visits of ONE location share a single marker instead of hiding each other. Two
    // DIFFERENT locations reached from the same point stay two markers (fanned out below).
    const markerKey = (point: Pt, locationId: string): string =>
        `${point.x.toFixed(2)},${point.y.toFixed(2)}|${locationId}`;

    // "12","13" -> "12-13" ; "11","14" -> "11,14" ; long runs -> "11+3"
    const mergeVisitLabels = (labels: string[]): string => {
        if (labels.length === 1) return labels[0];
        const numbers = labels.map((label) => Number(label));
        if (numbers.every((value) => Number.isFinite(value))) {
            const sorted = [...numbers].sort((a, b) => a - b);
            const consecutive = sorted.every(
                (value, index) => index === 0 || value === sorted[index - 1] + 1
            );
            if (consecutive) return `${sorted[0]}-${sorted[sorted.length - 1]}`;
        }
        const joined = labels.join(',');
        return joined.length <= 5 ? joined : `${labels[0]}+${labels.length - 1}`;
    };

    // only the order currently selected is drawn: overlaying the other one made the map
    // unreadable (two routes over the same racks)
    // One access-route resolution per LEG, not per (leg, panel): `buildPanelRoute` is a plain
    // function run on every render — hover included — and a cross-zone leg is asked about by
    // every panel it touches. Resolving it here keeps that O(legs), not O(legs x panels).
    const accessChains = useMemo(() => {
        const chains = new Map<number, AccessRoute>();
        if (!accessGraph) return chains;
        for (let index = 0; index < shownStops.length - 1; index++) {
            const from = shownStops[index];
            const to = shownStops[index + 1];
            if (from.panelKey === to.panelKey || !from.site || !to.site) continue;
            const chain = accessRoute(from.site, to.site, accessGraph);
            if (chain) chains.set(index, chain);
        }
        return chains;
    }, [shownStops, accessGraph]);

    const buildPanelRoute = (
        panel: Panel,
        sequence: Stop[]
    ): {
        markers: RouteStopMarker[];
        segments: RouteSegment[];
        visits: number;
        blockedLegs: number;
    } => {
        const markers: RouteStopMarker[] = [];
        const segments: RouteSegment[] = [];
        const total = Math.max(sequence.length - 1, 1);
        // markers merge the several visits of one location, so they are no longer 1:1 with stops
        const visits = sequence.filter((stop) => stop.panelKey === panel.key && stop.local).length;

        {
            // group the visits of this panel by pick point: a location visited twice in the
            // round (or twice in a row after optimization) is ONE marker listing both numbers
            const groups = new Map<
                string,
                { stops: Stop[]; labels: string[]; indexes: number[]; point: Pt }
            >();
            sequence.forEach((stop, index) => {
                if (stop.panelKey !== panel.key || !stop.local) return;
                const label =
                    shownOrder === 'current'
                        ? stop.seqFrom === stop.seqTo
                            ? `${stop.seqFrom}`
                            : `${stop.seqFrom}-${stop.seqTo}`
                        : `${index + 1}`;
                const key = markerKey(stop.local, stop.locationId);
                const group = groups.get(key);
                if (group) {
                    group.stops.push(stop);
                    group.labels.push(label);
                    group.indexes.push(index);
                } else {
                    groups.set(key, {
                        stops: [stop],
                        labels: [label],
                        indexes: [index],
                        point: stop.local
                    });
                }
            });
            groups.forEach((group, key) => {
                const first = group.stops[0];
                const orderLabel = mergeVisitLabels(group.labels);
                const isStart = group.indexes.includes(0);
                const isEnd = group.indexes.includes(sequence.length - 1);
                const allRaas = group.stops.flatMap((stop) => stop.raas);
                markers.push({
                    key,
                    x: group.point.x,
                    y: group.point.y,
                    label: orderLabel,
                    ariaLabel: `${orderLabel} — ${first.locationName}`,
                    // a location visited both first and last keeps the terminus colour: the
                    // label lists every visit, so the start is not lost
                    state: isEnd
                        ? 'end'
                        : isStart
                          ? 'start'
                          : group.stops.every((stop) => stop.picked)
                            ? 'picked'
                            : 'remaining',
                    unplaced: group.stops.some((stop) => !stop.placed),
                    tooltip: (
                        <>
                            <div>{`${first.locationName}`}</div>
                            {group.labels.length > 1 ? (
                                <div>{`${t('common:stops')}: ${group.labels.join(', ')}`}</div>
                            ) : null}
                            {allRaas.slice(0, 4).map((raa) => (
                                <div key={raa.id}>
                                    {`${raa.roundLineDetail?.roundLine?.article?.name ?? '-'} × ${
                                        raa.quantity ?? 0
                                    }`}
                                </div>
                            ))}
                            {allRaas.length > 4 ? <div>…</div> : null}
                        </>
                    ),
                    onClick: () => setDrawerStop({ ...first, raas: allRaas })
                });
            });
            // distinct locations picked from the same spot would still overlap: fan them out on
            // a small circle so every marker stays readable (their legs keep the true point)
            const byPoint = new Map<string, RouteStopMarker[]>();
            markers.forEach((marker) => {
                const key = `${marker.x.toFixed(2)},${marker.y.toFixed(2)}`;
                byPoint.set(key, [...(byPoint.get(key) ?? []), marker]);
            });
            byPoint.forEach((group) => {
                if (group.length < 2) return;
                // stay inside one marker radius: the legs still end at the true point, so a
                // wider fan would leave the markers floating away from their own route
                const radius = MARKER_RADIUS * 0.7;
                group.forEach((marker, index) => {
                    const angle = (2 * Math.PI * index) / group.length;
                    marker.x += radius * Math.cos(angle);
                    marker.y += radius * Math.sin(angle);
                });
            });
        }

        // legs the layout offers no legal way for (a lane shut across its width, a stop inside
        // a forbidden zone): drawn in the blocked colour, and reported — the line on screen
        // crosses the zone because there is nothing else to draw, and it must not be mistaken
        // for a route
        let blockedLegs = 0;
        // legs walk the consecutive PAIRS of the whole sequence, so a zone transition draws its
        // exit stub on the panel it leaves AND its entry stub on the panel it reaches
        for (let index = 0; index < sequence.length - 1; index++) {
            const from = sequence[index];
            const to = sequence[index + 1];
            if (!from.local || !to.local) continue;
            const color = routeRamp(index / total);
            if (from.panelKey === panel.key && to.panelKey === panel.key) {
                const route = routeLegLocal(from, to);
                if (!route || route.points.length < 2) continue;
                // two stops on the same pick point: no leg to draw (one merged marker holds both)
                if (
                    route.distance < 0.01 &&
                    Math.abs(from.local.x - to.local.x) + Math.abs(from.local.y - to.local.y) < 0.01
                ) {
                    continue;
                }
                if (route.blocked) blockedLegs++;
                segments.push({
                    key: `${from.key}-leg`,
                    points: route.points,
                    color: route.blocked ? BLOCKED_COLOR : color,
                    dashed: route.blocked || !from.placed || !to.placed,
                    fromKey: markerKey(from.local, from.locationId),
                    toKey: markerKey(to.local, to.locationId),
                    label: `${from.locationName} → ${to.locationName}`
                });
            } else {
                // A zone transition. When the buildings declare the doors and stairs it goes
                // through, draw the PIECE OF THAT WALK that happens on this panel — which also
                // makes a floor merely passed through show the way across it. Without them, keep
                // the historical symbolic stubs: the transition is real, its path is unknown.
                const chain = accessChains.get(index) ?? null;
                const onPanel = (chain?.via ?? []).filter(
                    (node: AccessNode) =>
                        node.buildingId === panel.buildingId && node.floor === panel.floor
                );
                const points: Pt[] = onPanel.map((node: AccessNode) => node.local);
                if (from.panelKey === panel.key) points.unshift(from.local);
                if (to.panelKey === panel.key) points.push(to.local);
                if (chain && points.length >= 2) {
                    segments.push({
                        key: `${from.key}-access-${panel.key}`,
                        points,
                        color,
                        dashed: true,
                        fromKey:
                            from.panelKey === panel.key
                                ? markerKey(from.local, from.locationId)
                                : undefined,
                        toKey:
                            to.panelKey === panel.key
                                ? markerKey(to.local, to.locationId)
                                : undefined,
                        label: `${from.locationName} → ${to.locationName}`
                    });
                } else if (from.panelKey === panel.key) {
                    segments.push({
                        key: `${from.key}-exit`,
                        points: [from.local, { x: from.local.x + 3, y: from.local.y - 1.5 }],
                        color,
                        dashed: true,
                        fromKey: markerKey(from.local, from.locationId)
                    });
                } else if (to.panelKey === panel.key) {
                    segments.push({
                        key: `${from.key}-entry`,
                        points: [{ x: to.local.x - 3, y: to.local.y - 1.5 }, to.local],
                        color,
                        dashed: true,
                        toKey: markerKey(to.local, to.locationId)
                    });
                }
            }
        }
        return { markers, segments, visits, blockedLegs };
    };

    // ---------- table (readable inventory, also the print-friendly view) ----------

    const tableColumns = [
        {
            title: t('d:roundOrderId'),
            dataIndex: 'roundOrderId',
            key: 'roundOrderId',
            width: 90
        },
        {
            title: t('common:location'),
            key: 'location',
            render: (raa: RouteRaa) => raa.location?.name ?? t('common:no-location')
        },
        {
            title: t('common:article'),
            key: 'article',
            render: (raa: RouteRaa) => raa.roundLineDetail?.roundLine?.article?.name ?? '-'
        },
        { title: t('common:quantity'), dataIndex: 'quantity', key: 'quantity', width: 100 },
        { title: t('d:status'), dataIndex: 'statusText', key: 'statusText', width: 140 }
    ];

    // ---------- rendering ----------

    if (!canRead) {
        return <Result status="403" title={t('messages:access-denied')} />;
    }

    const breadcrumb = [
        ...roundsRoutes,
        { path: `/rounds/${id}`, breadcrumbName: round?.name ?? '' },
        { breadcrumbName: t('menu:route-analysis') }
    ];

    let body: ReactNode;
    if (raas === undefined || blocks === undefined || round === undefined) {
        body = <ContentSpin />;
    } else if (raas === null || blocks === null || round === null) {
        body = <Empty description={t('messages:error-getting-data')} />;
    } else if (stops.length === 0) {
        body = <Empty description={t('messages:no-data')} />;
    } else {
        const placedCount = stops.filter((stop) => stop.placed).length;
        body = (
            <>
                {round.equipment?.patternId ? (
                    <Alert
                        style={{ marginBottom: 12 }}
                        type="info"
                        showIcon
                        message={t('messages:pattern-path-priority')}
                    />
                ) : null}
                {truncatedCount > 0 ? (
                    <Alert
                        style={{ marginBottom: 12 }}
                        type="warning"
                        showIcon
                        message={`${t('messages:route-truncated')} (${truncatedCount})`}
                    />
                ) : null}
                <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col>
                        <Card size="small">
                            <Statistic
                                title={t('common:distance-estimate')}
                                value={shownMetrics.distance}
                                suffix="m"
                            />
                        </Card>
                    </Col>
                    <Col>
                        <Card size="small">
                            <Statistic
                                title={t('common:aisle-changes')}
                                value={shownMetrics.aisleChanges}
                            />
                        </Card>
                    </Col>
                    <Col>
                        <Card size="small">
                            <Statistic
                                title={t('common:zone-changes')}
                                value={
                                    shownMetrics.blockChanges +
                                    shownMetrics.floorChanges +
                                    shownMetrics.buildingChanges
                                }
                            />
                        </Card>
                    </Col>
                    <Col>
                        <Card size="small">
                            <Statistic
                                title={t('common:placed-coverage')}
                                value={`${placedCount}/${stops.length}`}
                            />
                        </Card>
                    </Col>
                    {optimizedRouteEnabled && currentMetrics.distance > 0 ? (
                        <Col>
                            <Card size="small">
                                <Statistic
                                    title={t('common:optimized-delta')}
                                    value={deltaPercent}
                                    suffix="%"
                                    valueStyle={{
                                        // 0% means "already optimal", not a regression
                                        color: deltaPercent <= 0 ? '#3f8600' : '#cf1322'
                                    }}
                                />
                            </Card>
                        </Col>
                    ) : null}
                </Row>
                {panels.map((panel) => {
                    const { markers, segments, visits, blockedLegs } = buildPanelRoute(
                        panel,
                        shownStops
                    );
                    return (
                        <Card
                            key={panel.key}
                            size="small"
                            style={{ marginBottom: 12 }}
                            title={
                                <Space wrap>
                                    <Tag color="geekblue">{panel.buildingName}</Tag>
                                    <Tag>{`${t('common:floor')} ${panel.floor}`}</Tag>
                                    <Tag color="blue">{`${visits} ${t('common:stops')}`}</Tag>
                                    {blockedLegs > 0 ? (
                                        <Tag color="error">
                                            {`${blockedLegs} ${t('messages:legs-through-blocked-zone')}`}
                                        </Tag>
                                    ) : null}
                                </Space>
                            }
                        >
                            <LayoutCanvas
                                contentBounds={panel.bounds}
                                readOnly
                                height={420}
                                testId="route-analysis-canvas"
                            >
                                {panel.blocks.map((block) => {
                                    const layout = frames.get(block.id)?.layout;
                                    if (!layout) return null;
                                    return (
                                        <BlockCellsLayer
                                            key={block.id}
                                            layout={layout}
                                            blockName={block.name}
                                            corridors={aisleGeo.local}
                                            corridorKey={(aisle) => aisleKey(block.id, aisle)}
                                        />
                                    );
                                })}
                                {accessPointsOnFloor(
                                    panel.buildingLayout,
                                    panel.floor,
                                    floorsOf(panel.buildingId)
                                ).map((placed) => (
                                    <AccessPointLayer
                                        key={`${placed.point.id}-${
                                            placed.mirrorOf ? 'mirror' : 'own'
                                        }`}
                                        point={placed.point}
                                        direction={placed.direction}
                                        mirrored={!!placed.mirrorOf}
                                        label={placed.point.name}
                                        readOnly
                                    />
                                ))}
                                <RouteLayer
                                    stops={markers}
                                    segments={segments}
                                    markerRadius={MARKER_RADIUS}
                                />
                            </LayoutCanvas>
                        </Card>
                    );
                })}
                <RouteLegend
                    noStockCount={noStock.length}
                    unplacedCount={stops.length - placedCount}
                />
                <Card size="small" style={{ marginTop: 12 }} title={t('common:route-details')}>
                    <Table
                        size="small"
                        rowKey="id"
                        columns={tableColumns as any}
                        dataSource={raas}
                        pagination={false}
                    />
                </Card>
            </>
        );
    }

    return (
        <>
            <AppHead title={t('menu:route-analysis')} />
            <HeaderContent
                title={`${t('menu:route-analysis')} - ${round?.name ?? id}`}
                routes={breadcrumb}
                onBack={() => router.push(`/rounds/${id}`)}
                actionsRight={
                    <Space wrap>
                        {optimizedRouteEnabled ? (
                            <Segmented
                                options={[
                                    { value: 'current', label: t('common:current-order') },
                                    { value: 'optimized', label: t('common:optimized-order') }
                                ]}
                                value={shownOrder}
                                onChange={(value) => setOrder(value as 'current' | 'optimized')}
                            />
                        ) : null}
                        <Tooltip title={t('actions:print')}>
                            <Button icon={<PrinterOutlined />} onClick={() => window.print()} />
                        </Tooltip>
                        <Tooltip title={t('actions:refresh')}>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={reload}
                                loading={isLoading}
                            />
                        </Tooltip>
                    </Space>
                }
            />
            <PageContentWrapper>{body}</PageContentWrapper>
            <Drawer
                open={!!drawerStop}
                onClose={() => setDrawerStop(null)}
                title={drawerStop?.locationName}
                width={420}
            >
                {drawerStop ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <LinkButton
                            title={t('common:location')}
                            path={pathParams('/locations/[id]', drawerStop.locationId)}
                            type="primary"
                        />
                        {drawerStop.raas.map((raa) => (
                            <Descriptions
                                key={raa.id}
                                size="small"
                                column={1}
                                bordered
                                items={[
                                    {
                                        key: 'order',
                                        label: t('d:roundOrderId'),
                                        children: raa.roundOrderId
                                    },
                                    {
                                        key: 'article',
                                        label: t('common:article'),
                                        children:
                                            raa.roundLineDetail?.roundLine?.article?.name ?? '-'
                                    },
                                    {
                                        key: 'quantity',
                                        label: t('common:quantity'),
                                        children: raa.quantity ?? 0
                                    },
                                    {
                                        key: 'status',
                                        label: t('d:status'),
                                        children: raa.statusText ?? raa.status ?? '-'
                                    }
                                ]}
                            />
                        ))}
                    </Space>
                ) : null}
            </Drawer>
        </>
    );
};

RoundRouteAnalysis.displayName = 'RoundRouteAnalysis';

export { RoundRouteAnalysis };
