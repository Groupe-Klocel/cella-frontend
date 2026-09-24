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
import { AppHead, ContentSpin, HeaderContent, PageContentWrapper } from '@components';
import {
    getModesFromPermissions,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Empty, Modal, Result, Space, Tabs, Tag, Tooltip } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { axisValue, naturalCompare } from 'modules/LocationsOccupancy/occupancyModel';
import { useRouter } from 'next/router';
import {
    FC,
    PointerEvent as ReactPointerEvent,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState
} from 'react';
import { AccessPointLayer } from '../Elements/AccessPointLayer';
import { AisleLayer } from '../Elements/AisleLayer';
import { ColumnPickerModal } from '../Elements/ColumnPickerModal';
import { EditorToolbar } from '../Elements/EditorToolbar';
import { LayoutCanvas, LayoutCanvasApi, WorldBounds } from '../Elements/LayoutCanvas';
import { PanelSelection, PropertiesPanel } from '../Elements/PropertiesPanel';
import { SelectionHandles } from '../Elements/SelectionHandles';
import { ShapeRect } from '../Elements/ShapeRect';
import { UnplacedTray } from '../Elements/UnplacedTray';
import { editorReducer, initialEditorState } from '../editorReducer';
import { useBlockCells, useCartographyData, useSaveLayout } from '../hooks';
import {
    AccessPoint,
    AccessPointKind,
    accessPointsOnFloor,
    adjacentFloor,
    AisleColumnDrift,
    aisleColumnDrift,
    AisleDef,
    aisleLaidColumns,
    BlockedZone,
    buildBlockLayout,
    buildBuildingLayout,
    DEFAULT_BLOCK_SIZE,
    DEFAULT_BLOCKED_SIZE,
    DEFAULT_BUILDING_SIZE,
    parseBlockLayout,
    parseBuildingLayout,
    Pt,
    RectShape,
    snap
} from '../layoutModel';
import { cartographyEditorRoutes } from '../Static/cartographyRoutes';

// stable identity: the picker re-seeds its ticks whenever `initialSelected` changes
const EMPTY_COLUMNS: string[] = [];

// Visual warehouse-layout editor: site (buildings) -> building/floor (blocks) -> block
// (aisle/column cells), drill-down carried by the URL query (?building=&floor=&block=) so the
// browser back button walks back up, like the locations-occupancy screen.

const PERMISSION_NAME = 'wm_cartography';

const CartographyEditor: FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { permissions, parameters } = useAppState();
    const modes = getModesFromPermissions(permissions, PERMISSION_NAME);
    const canRead = modes.includes(ModeEnum.Read);
    const canWrite = modes.includes(ModeEnum.Update);
    const readOnly = !canWrite;

    const buildingId =
        typeof router.query.building === 'string' ? router.query.building : undefined;
    const floorQuery = typeof router.query.floor === 'string' ? router.query.floor : undefined;
    const blockId = typeof router.query.block === 'string' ? router.query.block : undefined;

    const { buildings, blocks, isLoading, reload, fetchBuildingLayouts } =
        useCartographyData(canRead);
    const blockCells = useBlockCells();
    const { save, isSaving } = useSaveLayout();

    const [state, dispatch] = useReducer(editorReducer, initialEditorState);
    const [snapOn, setSnapOn] = useState(true);
    const [gridStep, setGridStep] = useState(0.5);
    const [pointerWorld, setPointerWorld] = useState<Pt | null>(null);
    const [layStart, setLayStart] = useState<Pt | null>(null);
    // which columns the stretch about to be laid carries; null while the picker is closed
    const [columnPicker, setColumnPicker] = useState<{
        aisle: string;
        index: number;
        selected: string[];
    } | null>(null);
    const canvasApiRef = useRef<LayoutCanvasApi | null>(null);
    const snapStep = snapOn ? gridStep : null;

    const dirtyCount = state.dirtyBuildingIds.length + state.dirtyBlockIds.length;
    const dirtyRef = useRef(dirtyCount > 0);
    dirtyRef.current = dirtyCount > 0;

    // (re)hydrate drafts whenever a fetch lands — an explicit refresh discards local edits
    useEffect(() => {
        if (!buildings || !blocks) return;
        dispatch({
            type: 'INIT',
            buildings: buildings.map((building) => ({
                id: building.id,
                name: building.name,
                modified: building.modified,
                layout: parseBuildingLayout(building.layout)
            })),
            // layouts land later, per building (HYDRATE_BLOCKS): until then `layout` is unknown
            blocks: blocks.map((block) => ({
                layoutLoaded: false,
                id: block.id,
                name: block.name,
                level: block.level,
                buildingId: block.buildingId,
                modified: block.modified,
                layout: parseBlockLayout(block.layout)
            }))
        });
    }, [buildings, blocks]);

    useEffect(() => {
        if (!router.isReady || !canRead) return;
        if (blockId) blockCells.fetchBlock(blockId);
        else blockCells.reset();
    }, [router.isReady, canRead, blockId]);

    // the block list arrives without its layouts (they are the heavy part): load them for the
    // building being opened, once per building, and merge them into the drafts
    const hydratedBuildingsRef = useRef<Set<string>>(new Set());
    const [hydratedBuildings, setHydratedBuildings] = useState<string[]>([]);
    // buildings whose per-building layout fetch ERRORED. Distinct from "not hydrated yet": the
    // canvas is unblocked either way, but a failed fetch leaves every block's layout at null,
    // which is indistinguishable from "not placed" — and offering a PLACED block in the unplaced
    // tray lets one click overwrite its aisles, cells and zones with an empty layout on Save.
    const [failedBuildings, setFailedBuildings] = useState<string[]>([]);
    useEffect(() => {
        hydratedBuildingsRef.current = new Set();
        setHydratedBuildings([]);
        setFailedBuildings([]);
    }, [blocks]);
    useEffect(() => {
        if (!canRead || !buildingId || !blocks) return;
        if (hydratedBuildingsRef.current.has(buildingId)) return;
        hydratedBuildingsRef.current.add(buildingId);
        let cancelled = false;
        fetchBuildingLayouts(buildingId).then((rows) => {
            if (cancelled) return;
            if (!rows) {
                // failed fetch: unblock the canvas and allow a retry on the next visit, but mark
                // the building so nothing offers its blocks as unplaced (see failedBuildings)
                hydratedBuildingsRef.current.delete(buildingId);
                setHydratedBuildings((current) =>
                    current.includes(buildingId) ? current : [...current, buildingId]
                );
                setFailedBuildings((current) =>
                    current.includes(buildingId) ? current : [...current, buildingId]
                );
                return;
            }
            setHydratedBuildings((current) =>
                current.includes(buildingId) ? current : [...current, buildingId]
            );
            setFailedBuildings((current) => current.filter((entry) => entry !== buildingId));
            dispatch({
                type: 'HYDRATE_BLOCKS',
                blocks: rows.map((block) => ({
                    id: block.id,
                    name: block.name,
                    level: block.level,
                    buildingId: block.buildingId,
                    modified: block.modified,
                    layout: parseBlockLayout(block.layout)
                }))
            });
        });
        return () => {
            cancelled = true;
        };
    }, [canRead, buildingId, blocks, fetchBuildingLayouts]);

    // browser back/forward walks the drill-down without going through pushQuery: a selection or
    // an armed placing/laying gesture from another level must not survive (its commit would
    // write coordinates in the wrong frame)
    const levelKey = `${buildingId ?? ''}|${blockId ?? ''}|${floorQuery ?? ''}`;
    useEffect(() => {
        dispatch({ type: 'SELECT', selection: null });
        dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
        setLayStart(null);
        setPointerWorld(null);
    }, [levelKey]);

    // leaving the page with unsaved work: warn (in-editor drill-down keeps the state, so the
    // shallow /cartography pushes are exempt)
    useEffect(() => {
        const warnUnload = (event: BeforeUnloadEvent) => {
            if (dirtyRef.current) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        // in-editor drill-downs are shallow pushes (and the URL is locale-prefixed for non
        // default locales, so a path prefix check would misfire) — exempt shallow transitions
        const warnRoute = (url: string, options?: { shallow?: boolean }) => {
            if (options?.shallow || !dirtyRef.current) return;
            if (window.confirm(tRef.current('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'route change aborted: unsaved cartography changes';
        };
        window.addEventListener('beforeunload', warnUnload);
        router.events.on('routeChangeStart', warnRoute);
        return () => {
            window.removeEventListener('beforeunload', warnUnload);
            router.events.off('routeChangeStart', warnRoute);
        };
    }, []);

    // keyboard: escape cancels placing/laying, ctrl+z / ctrl+shift+z / ctrl+y drive history
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
                setLayStart(null);
                return;
            }
            const target = event.target as HTMLElement;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                dispatch({ type: 'REDO' });
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const pushQuery = useCallback(
        (query: { [key: string]: string | undefined }) => {
            const clean: { [key: string]: string } = {};
            Object.entries(query).forEach(([key, value]) => {
                if (value) clean[key] = value;
            });
            dispatch({ type: 'SELECT', selection: null });
            dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
            setLayStart(null);
            router.push({ pathname: router.pathname, query: clean }, undefined, { shallow: true });
        },
        [router]
    );

    const currentBuilding = useMemo(
        () => state.buildings.find((building) => building.id === buildingId),
        [state.buildings, buildingId]
    );
    const currentBlock = useMemo(
        () => state.blocks.find((block) => block.id === blockId),
        [state.blocks, blockId]
    );

    // floor tabs: parameter scope block_level, completed by the levels actually used
    const buildingBlocks = useMemo(
        () => state.blocks.filter((block) => block.buildingId === buildingId),
        [state.blocks, buildingId]
    );
    const floors = useMemo(() => {
        const values = new Set<number>();
        (parameters ?? [])
            .filter((parameter: any) => parameter.scope === 'block_level')
            .forEach((parameter: any) => {
                const code = Number(parameter.code);
                if (Number.isFinite(code)) values.add(code);
            });
        buildingBlocks.forEach((block) => values.add(block.level));
        return Array.from(values).sort((a, b) => a - b);
    }, [parameters, buildingBlocks]);
    const currentFloor = useMemo(() => {
        const parsed = Number(floorQuery);
        if (floorQuery !== undefined && Number.isFinite(parsed)) return parsed;
        const withBlocks = floors.find((floor) =>
            buildingBlocks.some((block) => block.level === floor)
        );
        return withBlocks ?? floors[0] ?? 0;
    }, [floorQuery, floors, buildingBlocks]);
    const floorLabel = useCallback(
        (floor: number): string => {
            const row = (parameters ?? []).find(
                (parameter: any) =>
                    parameter.scope === 'block_level' && Number(parameter.code) === floor
            );
            return row?.value ?? String(floor);
        },
        [parameters]
    );

    const floorBlocks = useMemo(
        () => buildingBlocks.filter((block) => block.level === currentFloor),
        [buildingBlocks, currentFloor]
    );

    // distinct (aisle -> columns) of the opened block, from the grouped aggregate; blank axis
    // values normalize exactly like everywhere else ('' and null both -> '-') so the cells keys
    // written here always match what the route-analysis lookup computes
    const aisleColumns = useMemo(() => {
        const map = new Map<string, Set<string>>();
        (blockCells.rows ?? []).forEach((row) => {
            const aisle = axisValue(row.aisle);
            const column = axisValue(row.column);
            let set = map.get(aisle);
            if (!set) {
                set = new Set<string>();
                map.set(aisle, set);
            }
            set.add(column);
        });
        const sorted = new Map<string, string[]>();
        Array.from(map.keys())
            .sort(naturalCompare)
            .forEach((aisle) => {
                sorted.set(aisle, Array.from(map.get(aisle)!).sort(naturalCompare));
            });
        return sorted;
    }, [blockCells.rows]);

    // ---------- level-specific derived data ----------

    const level: 'site' | 'building' | 'block' = blockId
        ? 'block'
        : buildingId
          ? 'building'
          : 'site';

    // while a building's layouts are still in flight its blocks would all look "unplaced"
    const layoutsLoading = !!buildingId && !hydratedBuildings.includes(buildingId);
    const layoutsFailed = !!buildingId && failedBuildings.includes(buildingId);
    const placedBuildings = state.buildings.filter((building) => building.layout);
    const unplacedBuildings = state.buildings.filter((building) => !building.layout);
    const placedBlocks = floorBlocks.filter((block) => block.layout);
    // `layout: null` means "not placed" ONLY once the fetch has actually answered: while it is in
    // flight, and after it failed, it means "unknown", and offering those blocks would invite the
    // operator to re-place an already-placed one — a Save then writes an empty document over it.
    const unplacedBlocks =
        layoutsLoading || layoutsFailed ? [] : floorBlocks.filter((block) => !block.layout);
    const laidAisles = currentBlock?.layout?.aisles ?? {};
    // An aisle is "placed" only once every one of its live columns is carried by one of its
    // stretches — a row cut in four is four gestures, and the tray keeps offering what is left.
    const aisleCoverage = useMemo(() => {
        const coverage = new Map<string, { laid: Set<string>; missing: string[] }>();
        const segments = currentBlock?.layout?.aisles ?? {};
        aisleColumns.forEach((columns, aisle) => {
            const laid = new Set(aisleLaidColumns(segments[aisle]));
            coverage.set(aisle, {
                laid,
                missing: columns.filter((column) => !laid.has(column))
            });
        });
        return coverage;
    }, [currentBlock?.layout?.aisles, aisleColumns]);
    const unplacedAisles = Array.from(aisleColumns.keys()).filter(
        (aisle) => (aisleCoverage.get(aisle)?.missing.length ?? 0) > 0
    );

    // A laid aisle materializes its cells once, from the columns that existed at that moment,
    // and nothing re-derives them afterwards: a column created (or dropped) later is invisible
    // to every reader until someone resynchronises. So compare the two — across every stretch —
    // but only once the live columns are actually loaded (`rows` is undefined while fetching,
    // null on error), or every aisle would be reported as having lost all of its columns.
    const liveColumnsKnown = Array.isArray(blockCells.rows);
    const aisleDrifts = useMemo(() => {
        const drifts = new Map<string, AisleColumnDrift>();
        if (!liveColumnsKnown) return drifts;
        const aisles = currentBlock?.layout?.aisles ?? {};
        Object.keys(aisles).forEach((aisle) => {
            const drift = aisleColumnDrift(
                aisleLaidColumns(aisles[aisle]),
                aisleColumns.get(aisle) ?? []
            );
            if (drift) drifts.set(aisle, drift);
        });
        return drifts;
    }, [currentBlock?.layout?.aisles, aisleColumns, liveColumnsKnown]);

    // access points drawn on the floor being edited: those placed there, plus the automatic
    // counterparts of the floor accesses declared on the adjacent floors
    const floorAccessPoints = useMemo(
        () => accessPointsOnFloor(currentBuilding?.layout, currentFloor, floors),
        [currentBuilding?.layout, currentFloor, floors]
    );

    const contentBounds: WorldBounds | null = useMemo(() => {
        if (level === 'site') {
            if (placedBuildings.length === 0) return null;
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            placedBuildings.forEach((building) => {
                const site = building.layout!.site;
                minX = Math.min(minX, site.x);
                minY = Math.min(minY, site.y);
                maxX = Math.max(maxX, site.x + site.w);
                maxY = Math.max(maxY, site.y + site.d);
            });
            return { x: minX, y: minY, w: maxX - minX, d: maxY - minY };
        }
        if (level === 'building') {
            const site = currentBuilding?.layout?.site;
            if (site) return { x: 0, y: 0, w: site.w, d: site.d };
            return { x: 0, y: 0, w: DEFAULT_BUILDING_SIZE.w, d: DEFAULT_BUILDING_SIZE.d };
        }
        const rect = currentBlock?.layout?.b;
        if (rect) return { x: 0, y: 0, w: rect.w, d: rect.d };
        return { x: 0, y: 0, w: DEFAULT_BLOCK_SIZE.w, d: DEFAULT_BLOCK_SIZE.d };
    }, [level, state.buildings, state.blocks, buildingId, blockId]);

    // ---------- gesture handling (placing / laying) ----------

    const handleBackgroundPointerDown = useCallback(
        (world: Pt, event: ReactPointerEvent): boolean => {
            if (
                state.mode.kind === 'placing' ||
                state.mode.kind === 'placing-access' ||
                state.mode.kind === 'placing-blocked'
            ) {
                return true;
            }
            if (state.mode.kind === 'laying') {
                setLayStart({ x: snap(world.x, snapStep), y: snap(world.y, snapStep) });
                return true;
            }
            if (event.button === 0) dispatch({ type: 'SELECT', selection: null });
            return false;
        },
        [state.mode, snapStep]
    );

    const handlePointerWorldMove = useCallback(
        (world: Pt) => {
            if (state.mode.kind !== 'idle') setPointerWorld(world);
        },
        [state.mode.kind]
    );

    const handleBackgroundPointerUp = useCallback(
        (world: Pt) => {
            const snapped: Pt = { x: snap(world.x, snapStep), y: snap(world.y, snapStep) };
            if (state.mode.kind === 'placing') {
                if (state.mode.entity === 'building') {
                    dispatch({
                        type: 'SET_BUILDING_SITE',
                        id: state.mode.id,
                        site: {
                            x: snapped.x - DEFAULT_BUILDING_SIZE.w / 2,
                            y: snapped.y - DEFAULT_BUILDING_SIZE.d / 2,
                            ...DEFAULT_BUILDING_SIZE
                        }
                    });
                    dispatch({
                        type: 'SELECT',
                        selection: { kind: 'building', id: state.mode.id }
                    });
                } else {
                    dispatch({
                        type: 'SET_BLOCK_RECT',
                        id: state.mode.id,
                        rect: {
                            x: snapped.x - DEFAULT_BLOCK_SIZE.w / 2,
                            y: snapped.y - DEFAULT_BLOCK_SIZE.d / 2,
                            ...DEFAULT_BLOCK_SIZE
                        }
                    });
                    dispatch({ type: 'SELECT', selection: { kind: 'block', id: state.mode.id } });
                }
                dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
                setPointerWorld(null);
            } else if (state.mode.kind === 'placing-access') {
                // ADD_ACCESS_POINT selects the new point itself (it mints its own id)
                dispatch({
                    type: 'ADD_ACCESS_POINT',
                    buildingId: state.mode.buildingId,
                    point: {
                        kind: state.mode.pointKind,
                        x: snapped.x,
                        y: snapped.y,
                        floor: state.mode.floor,
                        direction: 'both'
                    }
                });
                dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
                setPointerWorld(null);
            } else if (state.mode.kind === 'placing-blocked') {
                // ADD_BLOCKED_ZONE mints the id and selects the new zone itself
                dispatch({ type: 'ADD_BLOCKED_ZONE', blockId: state.mode.blockId, at: snapped });
                dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
                setPointerWorld(null);
            } else if (state.mode.kind === 'laying' && layStart) {
                const to: [number, number] =
                    Math.hypot(snapped.x - layStart.x, snapped.y - layStart.y) < 0.5
                        ? [layStart.x + 4, layStart.y]
                        : [snapped.x, snapped.y];
                const previous = currentBlock?.layout?.aisles?.[state.mode.aisle]?.[
                    state.mode.index
                ];
                const def: AisleDef = {
                    // re-laying a stretch keeps its pitch, cell size, order and pick side: the
                    // gesture moves it, it does not reset how it was configured
                    ...previous,
                    from: [layStart.x, layStart.y],
                    to,
                    columns: state.mode.columns
                };
                dispatch({
                    type: 'UPSERT_AISLE_SEGMENT',
                    blockId: state.mode.blockId,
                    aisle: state.mode.aisle,
                    index: state.mode.index,
                    def
                });
                // UPSERT_AISLE_SEGMENT selects the stretch it just wrote (it alone knows where
                // it landed once emptied siblings are dropped)
                dispatch({ type: 'SET_MODE', mode: { kind: 'idle' } });
                setLayStart(null);
                setPointerWorld(null);
            }
        },
        [state.mode, layStart, snapStep, currentBlock]
    );

    // the columns another stretch of the same aisle already carries: ticking one here takes it
    // away from that stretch (UPSERT_AISLE_SEGMENT strips it), so they stay tickable
    const pickerTakenElsewhere = useMemo(() => {
        const taken = new Set<string>();
        if (!columnPicker) return taken;
        (currentBlock?.layout?.aisles?.[columnPicker.aisle] ?? []).forEach((segment, index) => {
            if (index === columnPicker.index) return;
            segment.columns.forEach((column) => taken.add(column));
        });
        return taken;
    }, [columnPicker, currentBlock]);

    const handleColumnPickerConfirm = useCallback(
        (columns: string[]) => {
            const picker = columnPicker;
            setColumnPicker(null);
            if (!picker || !blockId) return;
            if (picker.index < 0) {
                // a brand-new stretch: the geometry comes next, drawn on the canvas. Drop any
                // half-finished gesture first — arming a new laying mode over a live start point
                // would draw the segment from where the PREVIOUS one had been started.
                setLayStart(null);
                dispatch({
                    type: 'SET_MODE',
                    mode: { kind: 'laying', blockId, aisle: picker.aisle, index: -1, columns }
                });
                return;
            }
            // an existing stretch keeps its segment and re-flows the picked columns along it
            const def = currentBlock?.layout?.aisles?.[picker.aisle]?.[picker.index];
            if (!def) return;
            dispatch({
                type: 'UPSERT_AISLE_SEGMENT',
                blockId,
                aisle: picker.aisle,
                index: picker.index,
                def: { ...def, columns }
            });
        },
        [columnPicker, blockId, currentBlock]
    );

    const handleTrayPick = useCallback(
        (key: string) => {
            if (level === 'site') {
                dispatch({
                    type: 'SET_MODE',
                    mode: { kind: 'placing', entity: 'building', id: key }
                });
            } else if (level === 'building') {
                dispatch({ type: 'SET_MODE', mode: { kind: 'placing', entity: 'block', id: key } });
            } else if (blockId) {
                // laying starts by choosing WHICH columns this stretch carries: everything the
                // aisle still has unplaced is pre-ticked, which is all of them the first time
                const missing = aisleCoverage.get(key)?.missing ?? [];
                setColumnPicker({
                    aisle: key,
                    index: -1,
                    selected: missing.length > 0 ? missing : (aisleColumns.get(key) ?? [])
                });
            }
        },
        [level, blockId, aisleCoverage, aisleColumns]
    );

    // ---------- save ----------

    const performSave = useCallback(
        async (force?: boolean) => {
            const buildingWrites = state.dirtyBuildingIds
                .map((id) => state.buildings.find((building) => building.id === id))
                .filter((building): building is NonNullable<typeof building> => !!building)
                .map((building) => ({
                    id: building.id,
                    layout: building.layout
                        ? buildBuildingLayout(building.layout.site, building.layout)
                        : null,
                    modified: building.modified
                }));
            const blockWrites = state.dirtyBlockIds
                .map((id) => state.blocks.find((block) => block.id === id))
                .filter((block): block is NonNullable<typeof block> => !!block)
                .map((block) => ({
                    id: block.id,
                    layout: block.layout ? buildBlockLayout(block.layout) : null,
                    modified: block.modified
                }));
            if (buildingWrites.length === 0 && blockWrites.length === 0) return;
            try {
                const result = await save(buildingWrites, blockWrites, force);
                if (result.status === 'conflict') {
                    const names = result.conflicts.map((conflict) => {
                        const entity =
                            conflict.kind === 'building'
                                ? state.buildings.find((building) => building.id === conflict.id)
                                : state.blocks.find((block) => block.id === conflict.id);
                        return `${entity?.name ?? conflict.id} (${conflict.modifiedBy ?? '?'})`;
                    });
                    Modal.confirm({
                        title: tRef.current('messages:layout-conflict'),
                        content: names.join(', '),
                        okText: tRef.current('actions:overwrite'),
                        cancelText: tRef.current('messages:cancel'),
                        onOk: () => performSave(true)
                    });
                    return;
                }
                dispatch({
                    type: 'MARK_SAVED',
                    buildingModified: result.buildingModified,
                    blockModified: result.blockModified
                });
                showSuccess(tRef.current('messages:layout-saved'));
            } catch (error) {
                console.log(error);
                showError(tRef.current('messages:error-saving-layout'));
            }
        },
        [state, save]
    );

    const handleRefresh = useCallback(() => {
        if (dirtyRef.current) {
            Modal.confirm({
                title: tRef.current('messages:confirm-leaving-page'),
                onOk: () => reload()
            });
        } else {
            reload();
        }
    }, [reload]);

    // ---------- selection plumbing ----------

    const panelSelection: PanelSelection = useMemo(() => {
        const selection = state.selection;
        if (!selection) return null;
        if (selection.kind === 'building') {
            const building = state.buildings.find((entry) => entry.id === selection.id);
            if (!building?.layout) return null;
            return {
                kind: 'building',
                id: building.id,
                name: building.name,
                rect: building.layout.site
            };
        }
        if (selection.kind === 'block') {
            const block = state.blocks.find((entry) => entry.id === selection.id);
            if (!block?.layout) return null;
            return { kind: 'block', id: block.id, name: block.name, rect: block.layout.b };
        }
        if (selection.kind === 'access') {
            const building = state.buildings.find((entry) => entry.id === selection.buildingId);
            const point = building?.layout?.access?.find((entry) => entry.id === selection.id);
            if (!point) return null;
            const upper = adjacentFloor(floors, point.floor, 1);
            const lower = adjacentFloor(floors, point.floor, -1);
            return {
                kind: 'access',
                buildingId: selection.buildingId,
                point,
                floorLabel: floorLabel(point.floor),
                upperFloorLabel: upper === null ? null : floorLabel(upper),
                lowerFloorLabel: lower === null ? null : floorLabel(lower)
            };
        }
        if (selection.kind === 'blocked') {
            const zone = state.blocks
                .find((entry) => entry.id === selection.blockId)
                ?.layout?.blocked?.find((entry) => entry.id === selection.id);
            if (!zone) return null;
            return {
                kind: 'blocked',
                blockId: selection.blockId,
                id: zone.id,
                name: zone.name,
                rect: { x: zone.x, y: zone.y, w: zone.w, d: zone.d }
            };
        }
        const segments = state.blocks.find((entry) => entry.id === selection.blockId)?.layout
            ?.aisles?.[selection.aisle];
        const def = segments?.[selection.index];
        if (!def) return null;
        return {
            kind: 'aisle',
            blockId: selection.blockId,
            aisle: selection.aisle,
            index: selection.index,
            segmentCount: segments!.length,
            def,
            liveColumns: liveColumnsKnown ? (aisleColumns.get(selection.aisle) ?? []) : null,
            drift: aisleDrifts.get(selection.aisle) ?? null
        };
    }, [
        state.selection,
        state.buildings,
        state.blocks,
        floors,
        floorLabel,
        liveColumnsKnown,
        aisleColumns,
        aisleDrifts
    ]);

    const handlePanelRectChange = useCallback(
        (patch: Partial<RectShape>) => {
            if (
                panelSelection?.kind !== 'building' &&
                panelSelection?.kind !== 'block' &&
                panelSelection?.kind !== 'blocked'
            ) {
                return;
            }
            const rect = { ...panelSelection.rect, ...patch };
            if (panelSelection.kind === 'building') {
                dispatch({ type: 'SET_BUILDING_SITE', id: panelSelection.id, site: rect });
            } else if (panelSelection.kind === 'block') {
                dispatch({ type: 'SET_BLOCK_RECT', id: panelSelection.id, rect });
            } else {
                dispatch({
                    type: 'UPDATE_BLOCKED_ZONE',
                    blockId: panelSelection.blockId,
                    id: panelSelection.id,
                    patch: { x: rect.x, y: rect.y, w: rect.w, d: rect.d }
                });
            }
        },
        [panelSelection]
    );

    const handlePanelAisleChange = useCallback(
        (def: AisleDef) => {
            if (panelSelection?.kind !== 'aisle') return;
            dispatch({
                type: 'UPSERT_AISLE_SEGMENT',
                blockId: panelSelection.blockId,
                aisle: panelSelection.aisle,
                index: panelSelection.index,
                def
            });
        },
        [panelSelection]
    );

    // change WHICH columns this stretch carries, without moving it
    const handlePanelPickColumns = useCallback(() => {
        if (panelSelection?.kind !== 'aisle') return;
        setColumnPicker({
            aisle: panelSelection.aisle,
            index: panelSelection.index,
            selected: panelSelection.def.columns
        });
    }, [panelSelection]);

    const handlePanelAccessChange = useCallback(
        (patch: Partial<Omit<AccessPoint, 'id'>>) => {
            if (panelSelection?.kind !== 'access') return;
            dispatch({
                type: 'UPDATE_ACCESS_POINT',
                buildingId: panelSelection.buildingId,
                id: panelSelection.point.id,
                patch
            });
        },
        [panelSelection]
    );

    // Re-reads the columns from the locations and re-flows them along the SAME segment. Never
    // done on load: it moves the pick points of existing locations, which is a decision, not a
    // refresh — the drift badge is what asks for it.
    const handleResyncAisle = useCallback(() => {
        if (panelSelection?.kind !== 'aisle' || !panelSelection.liveColumns) return;
        // On a SPLIT aisle only this stretch is resynchronised, and only with the columns it
        // already carries plus the ones no stretch carries: re-flowing every column here would
        // silently swallow the other stretches.
        const laid = new Set(panelSelection.def.columns);
        const takenElsewhere = new Set(
            aisleLaidColumns(
                currentBlock?.layout?.aisles?.[panelSelection.aisle]?.filter(
                    (segment, index) => index !== panelSelection.index
                )
            )
        );
        const columns = panelSelection.liveColumns.filter(
            (column) => laid.has(column) || !takenElsewhere.has(column)
        );
        dispatch({
            type: 'UPSERT_AISLE_SEGMENT',
            blockId: panelSelection.blockId,
            aisle: panelSelection.aisle,
            index: panelSelection.index,
            def: { ...panelSelection.def, columns }
        });
    }, [panelSelection, currentBlock]);

    const handleAddAccessPoint = useCallback(
        (pointKind: AccessPointKind) => {
            if (!buildingId) return;
            dispatch({
                type: 'SET_MODE',
                mode: { kind: 'placing-access', buildingId, pointKind, floor: currentFloor }
            });
            setPointerWorld(null);
        },
        [buildingId, currentFloor]
    );

    const handlePanelBlockedChange = useCallback(
        (patch: Partial<Omit<BlockedZone, 'id'>>) => {
            if (panelSelection?.kind !== 'blocked') return;
            dispatch({
                type: 'UPDATE_BLOCKED_ZONE',
                blockId: panelSelection.blockId,
                id: panelSelection.id,
                patch
            });
        },
        [panelSelection]
    );

    const handleAddBlockedZone = useCallback(() => {
        if (!blockId) return;
        dispatch({ type: 'SET_MODE', mode: { kind: 'placing-blocked', blockId } });
        setPointerWorld(null);
    }, [blockId]);

    const handlePanelRemove = useCallback(() => {
        if (!panelSelection) return;
        if (panelSelection.kind === 'building') {
            dispatch({ type: 'REMOVE_BUILDING_LAYOUT', id: panelSelection.id });
        } else if (panelSelection.kind === 'block') {
            dispatch({ type: 'REMOVE_BLOCK_LAYOUT', id: panelSelection.id });
        } else if (panelSelection.kind === 'access') {
            dispatch({
                type: 'REMOVE_ACCESS_POINT',
                buildingId: panelSelection.buildingId,
                id: panelSelection.point.id
            });
        } else if (panelSelection.kind === 'blocked') {
            dispatch({
                type: 'REMOVE_BLOCKED_ZONE',
                blockId: panelSelection.blockId,
                id: panelSelection.id
            });
        } else {
            dispatch({
                type: 'REMOVE_AISLE_SEGMENT',
                blockId: panelSelection.blockId,
                aisle: panelSelection.aisle,
                index: panelSelection.index
            });
        }
    }, [panelSelection]);

    const handlePanelRelay = useCallback(() => {
        if (panelSelection?.kind !== 'aisle') return;
        dispatch({
            type: 'SET_MODE',
            mode: {
                kind: 'laying',
                blockId: panelSelection.blockId,
                aisle: panelSelection.aisle,
                index: panelSelection.index,
                columns: panelSelection.def.columns
            }
        });
        setLayStart(null);
    }, [panelSelection]);

    const handlePanelOpen = useCallback(() => {
        if (panelSelection?.kind === 'building') {
            pushQuery({ building: panelSelection.id });
        } else if (panelSelection?.kind === 'block') {
            const block = state.blocks.find((entry) => entry.id === panelSelection.id);
            pushQuery({
                building: block?.buildingId,
                floor: String(block?.level ?? currentFloor),
                block: panelSelection.id
            });
        }
    }, [panelSelection, state.blocks, currentFloor, pushQuery]);

    // ---------- rendering ----------

    if (!canRead) {
        return <Result status="403" title={t('messages:access-denied')} />;
    }

    let canvasChildren: ReactNode = null;
    let trayItems: { key: string; label: string }[] = [];
    if (level === 'site') {
        trayItems = unplacedBuildings.map((building) => ({
            key: building.id,
            label: building.name
        }));
        canvasChildren = (
            <>
                {placedBuildings.map((building) => (
                    <ShapeRect
                        key={building.id}
                        rect={building.layout!.site}
                        label={building.name}
                        selected={
                            state.selection?.kind === 'building' &&
                            state.selection.id === building.id
                        }
                        inert={state.mode.kind === 'placing'}
                        readOnly={readOnly}
                        snapStep={snapStep}
                        onSelect={() =>
                            dispatch({
                                type: 'SELECT',
                                selection: { kind: 'building', id: building.id }
                            })
                        }
                        onOpen={() => pushQuery({ building: building.id })}
                        onCommit={(rect) =>
                            dispatch({ type: 'SET_BUILDING_SITE', id: building.id, site: rect })
                        }
                    />
                ))}
                {!readOnly && panelSelection && panelSelection.kind === 'building' ? (
                    <SelectionHandles
                        rect={panelSelection.rect}
                        snapStep={snapStep}
                        minSize={2}
                        onCommit={(rect) =>
                            dispatch({
                                type: 'SET_BUILDING_SITE',
                                id: panelSelection.id,
                                site: rect
                            })
                        }
                    />
                ) : null}
            </>
        );
    } else if (level === 'building') {
        const site = currentBuilding?.layout?.site;
        trayItems = unplacedBlocks.map((block) => ({ key: block.id, label: block.name }));
        canvasChildren = (
            <>
                {site ? (
                    <rect
                        x={0}
                        y={0}
                        width={site.w}
                        height={site.d}
                        fill="none"
                        stroke="rgba(140, 140, 140, 0.6)"
                        strokeWidth={0.15}
                    />
                ) : null}
                {placedBlocks.map((block) => (
                    <ShapeRect
                        key={block.id}
                        rect={block.layout!.b}
                        label={block.name}
                        fill="rgba(82, 196, 26, 0.10)"
                        stroke="#389e0d"
                        selected={
                            state.selection?.kind === 'block' && state.selection.id === block.id
                        }
                        inert={
                            state.mode.kind === 'placing' || state.mode.kind === 'placing-access'
                        }
                        readOnly={readOnly}
                        snapStep={snapStep}
                        onSelect={() =>
                            dispatch({ type: 'SELECT', selection: { kind: 'block', id: block.id } })
                        }
                        onOpen={() =>
                            pushQuery({
                                building: buildingId,
                                floor: String(currentFloor),
                                block: block.id
                            })
                        }
                        onCommit={(rect) =>
                            dispatch({ type: 'SET_BLOCK_RECT', id: block.id, rect })
                        }
                    />
                ))}
                {!readOnly && panelSelection && panelSelection.kind === 'block' ? (
                    <SelectionHandles
                        rect={panelSelection.rect}
                        snapStep={snapStep}
                        minSize={1}
                        onCommit={(rect) =>
                            dispatch({ type: 'SET_BLOCK_RECT', id: panelSelection.id, rect })
                        }
                    />
                ) : null}
                {floorAccessPoints.map((placed) => (
                    <AccessPointLayer
                        key={`${placed.point.id}-${placed.mirrorOf ? 'mirror' : 'own'}`}
                        point={placed.point}
                        direction={placed.direction}
                        mirrored={!!placed.mirrorOf}
                        label={
                            placed.mirrorOf
                                ? `${placed.point.name ? `${placed.point.name} · ` : ''}${t(
                                      'common:floor'
                                  )} ${floorLabel(placed.mirrorOf.floor)}`
                                : placed.point.name
                        }
                        selected={
                            state.selection?.kind === 'access' &&
                            state.selection.id === placed.point.id &&
                            !placed.mirrorOf
                        }
                        readOnly={readOnly}
                        snapStep={snapStep}
                        onSelect={() =>
                            dispatch({
                                type: 'SELECT',
                                selection: {
                                    kind: 'access',
                                    buildingId: buildingId!,
                                    id: placed.point.id
                                }
                            })
                        }
                        onCommit={(position) =>
                            dispatch({
                                type: 'UPDATE_ACCESS_POINT',
                                buildingId: buildingId!,
                                id: placed.point.id,
                                patch: position
                            })
                        }
                    />
                ))}
            </>
        );
    } else {
        const rect = currentBlock?.layout?.b;
        trayItems = unplacedAisles.map((aisle) => ({
            key: aisle,
            label: `${aisle} (${aisleColumns.get(aisle)?.length ?? 0})`
        }));
        canvasChildren = (
            <>
                {rect ? (
                    <rect
                        x={0}
                        y={0}
                        width={rect.w}
                        height={rect.d}
                        fill="none"
                        stroke="rgba(140, 140, 140, 0.6)"
                        strokeWidth={0.1}
                    />
                ) : null}
                {Object.keys(laidAisles)
                    .flatMap((aisle) =>
                        laidAisles[aisle].map((def, index) => ({ aisle, def, index }))
                    )
                    // the selected stretch renders last so its endpoint handles stay on top of the
                    // neighbouring aisles' racks (SVG paints siblings in document order)
                    .sort((a, b) => {
                        const selected = state.selection?.kind === 'aisle' ? state.selection : null;
                        const rank = (entry: { aisle: string; index: number }) =>
                            selected &&
                            selected.aisle === entry.aisle &&
                            selected.index === entry.index
                                ? 1
                                : 0;
                        return rank(a) - rank(b);
                    })
                    .map(({ aisle, def, index }) => (
                        <AisleLayer
                            key={`${aisle}-${index}`}
                            aisle={aisle}
                            def={def}
                            cellDefaults={currentBlock?.layout?.cellDefaults}
                            selected={
                                state.selection?.kind === 'aisle' &&
                                state.selection.aisle === aisle &&
                                state.selection.index === index
                            }
                            outOfSync={aisleDrifts.has(aisle)}
                            readOnly={readOnly}
                            snapStep={snapStep}
                            onSelect={() =>
                                dispatch({
                                    type: 'SELECT',
                                    selection: { kind: 'aisle', blockId: blockId!, aisle, index }
                                })
                            }
                            onCommit={(next) =>
                                dispatch({
                                    type: 'UPSERT_AISLE_SEGMENT',
                                    blockId: blockId!,
                                    aisle,
                                    index,
                                    def: next
                                })
                            }
                        />
                    ))}
                {(currentBlock?.layout?.blocked ?? []).map((zone) => (
                    <ShapeRect
                        key={zone.id}
                        rect={{ x: zone.x, y: zone.y, w: zone.w, d: zone.d }}
                        label={zone.name}
                        fill="rgba(207, 19, 34, 0.14)"
                        stroke="#cf1322"
                        selected={
                            state.selection?.kind === 'blocked' && state.selection.id === zone.id
                        }
                        inert={state.mode.kind !== 'idle'}
                        readOnly={readOnly}
                        snapStep={snapStep}
                        onSelect={() =>
                            dispatch({
                                type: 'SELECT',
                                selection: { kind: 'blocked', blockId: blockId!, id: zone.id }
                            })
                        }
                        onCommit={(rect) =>
                            dispatch({
                                type: 'UPDATE_BLOCKED_ZONE',
                                blockId: blockId!,
                                id: zone.id,
                                patch: { x: rect.x, y: rect.y, w: rect.w, d: rect.d }
                            })
                        }
                    />
                ))}
                {!readOnly && panelSelection && panelSelection.kind === 'blocked' ? (
                    <SelectionHandles
                        rect={panelSelection.rect}
                        snapStep={snapStep}
                        minSize={0.5}
                        onCommit={(rect) =>
                            dispatch({
                                type: 'UPDATE_BLOCKED_ZONE',
                                blockId: panelSelection.blockId,
                                id: panelSelection.id,
                                patch: { x: rect.x, y: rect.y, w: rect.w, d: rect.d }
                            })
                        }
                    />
                ) : null}
                {state.mode.kind === 'laying' && layStart && pointerWorld ? (
                    <AisleLayer
                        aisle={state.mode.aisle}
                        def={{
                            from: [layStart.x, layStart.y],
                            to: [snap(pointerWorld.x, snapStep), snap(pointerWorld.y, snapStep)],
                            columns: aisleColumns.get(state.mode.aisle) ?? []
                        }}
                        cellDefaults={currentBlock?.layout?.cellDefaults}
                        ghost
                        readOnly
                    />
                ) : null}
            </>
        );
    }

    const accessGhost =
        state.mode.kind === 'placing-access' && pointerWorld ? (
            <g style={{ pointerEvents: 'none' }}>
                <circle
                    cx={pointerWorld.x}
                    cy={pointerWorld.y}
                    r={0.6}
                    fill="rgba(114, 46, 209, 0.12)"
                    stroke={state.mode.pointKind === 'building' ? '#722ed1' : '#13c2c2'}
                    strokeWidth={0.12}
                    strokeDasharray="0.4 0.3"
                />
            </g>
        ) : null;

    const blockedGhost =
        state.mode.kind === 'placing-blocked' && pointerWorld ? (
            <g style={{ pointerEvents: 'none' }}>
                <rect
                    x={pointerWorld.x - DEFAULT_BLOCKED_SIZE.w / 2}
                    y={pointerWorld.y - DEFAULT_BLOCKED_SIZE.d / 2}
                    width={DEFAULT_BLOCKED_SIZE.w}
                    height={DEFAULT_BLOCKED_SIZE.d}
                    fill="rgba(207, 19, 34, 0.12)"
                    stroke="#cf1322"
                    strokeDasharray="0.5 0.35"
                    strokeWidth={0.12}
                />
            </g>
        ) : null;

    const placingGhost =
        state.mode.kind === 'placing' && pointerWorld ? (
            <g style={{ pointerEvents: 'none' }}>
                <rect
                    x={
                        pointerWorld.x -
                        (state.mode.entity === 'building'
                            ? DEFAULT_BUILDING_SIZE.w
                            : DEFAULT_BLOCK_SIZE.w) /
                            2
                    }
                    y={
                        pointerWorld.y -
                        (state.mode.entity === 'building'
                            ? DEFAULT_BUILDING_SIZE.d
                            : DEFAULT_BLOCK_SIZE.d) /
                            2
                    }
                    width={
                        state.mode.entity === 'building'
                            ? DEFAULT_BUILDING_SIZE.w
                            : DEFAULT_BLOCK_SIZE.w
                    }
                    height={
                        state.mode.entity === 'building'
                            ? DEFAULT_BUILDING_SIZE.d
                            : DEFAULT_BLOCK_SIZE.d
                    }
                    fill="rgba(24, 144, 255, 0.08)"
                    stroke="#91caff"
                    strokeDasharray="1 0.6"
                    strokeWidth={0.2}
                />
            </g>
        ) : null;

    const breadcrumb = [
        ...cartographyEditorRoutes,
        ...(currentBuilding ? [{ breadcrumbName: currentBuilding.name }] : []),
        ...(currentBlock ? [{ breadcrumbName: currentBlock.name }] : [])
    ];

    let body: ReactNode;
    if (buildings === undefined || blocks === undefined) {
        body = <ContentSpin />;
    } else if (buildings === null || blocks === null) {
        body = <Empty description={t('messages:error-getting-data')} />;
    } else {
        body = (
            <>
                {level === 'building' ? (
                    <Tabs
                        size="small"
                        activeKey={String(currentFloor)}
                        onChange={(key) => pushQuery({ building: buildingId, floor: key })}
                        items={floors.map((floor) => ({
                            key: String(floor),
                            label: `${t('common:floor')} ${floorLabel(floor)}`
                        }))}
                    />
                ) : null}
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <LayoutCanvas
                            key={`level-${buildingId ?? 'site'}-${blockId ?? ''}-${
                                level === 'building' ? currentFloor : ''
                            }`}
                            contentBounds={contentBounds}
                            readOnly={readOnly}
                            gridStep={snapOn ? gridStep : null}
                            onBackgroundPointerDown={handleBackgroundPointerDown}
                            onPointerWorldMove={handlePointerWorldMove}
                            onBackgroundPointerUp={handleBackgroundPointerUp}
                            apiRef={canvasApiRef}
                            testId="cartography-canvas"
                        >
                            {canvasChildren}
                            {placingGhost}
                            {accessGhost}
                            {blockedGhost}
                        </LayoutCanvas>
                        <UnplacedTray
                            items={trayItems}
                            activeKey={
                                state.mode.kind === 'placing'
                                    ? state.mode.id
                                    : state.mode.kind === 'laying'
                                      ? state.mode.aisle
                                      : null
                            }
                            readOnly={readOnly}
                            onPick={handleTrayPick}
                        />
                    </div>
                    <PropertiesPanel
                        selection={panelSelection}
                        readOnly={readOnly}
                        onRectChange={handlePanelRectChange}
                        onAisleChange={handlePanelAisleChange}
                        onAccessChange={handlePanelAccessChange}
                        onBlockedChange={handlePanelBlockedChange}
                        onRemoveFromMap={handlePanelRemove}
                        onRelayAisle={handlePanelRelay}
                        onResyncAisle={handleResyncAisle}
                        onPickColumns={handlePanelPickColumns}
                        onOpen={
                            panelSelection &&
                            (panelSelection.kind === 'building' || panelSelection.kind === 'block')
                                ? handlePanelOpen
                                : undefined
                        }
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <AppHead title={t('menu:cartography-editor')} />
            <HeaderContent
                title={t('menu:cartography-editor')}
                routes={breadcrumb}
                onBack={
                    level === 'block'
                        ? () => pushQuery({ building: buildingId, floor: String(currentFloor) })
                        : level === 'building'
                          ? () => pushQuery({})
                          : undefined
                }
                actionsRight={
                    <EditorToolbar
                        readOnly={readOnly}
                        dirtyCount={dirtyCount}
                        canUndo={state.past.length > 0}
                        canRedo={state.future.length > 0}
                        snapOn={snapOn}
                        setSnapOn={setSnapOn}
                        gridStep={gridStep}
                        setGridStep={setGridStep}
                        isSaving={isSaving}
                        onZoomIn={() => canvasApiRef.current?.zoomIn()}
                        onZoomOut={() => canvasApiRef.current?.zoomOut()}
                        onFit={() => canvasApiRef.current?.fit()}
                        onUndo={() => dispatch({ type: 'UNDO' })}
                        onRedo={() => dispatch({ type: 'REDO' })}
                        onRefresh={handleRefresh}
                        onSave={() => performSave(false)}
                    />
                }
            />
            <PageContentWrapper>
                <Space style={{ marginBottom: 8 }} wrap>
                    {level !== 'site' && currentBuilding ? (
                        <Tag color="geekblue">{`${t('d:building')}: ${currentBuilding.name}`}</Tag>
                    ) : null}
                    {level === 'block' && currentBlock ? (
                        <Tag color="green">{`${t('d:block')}: ${currentBlock.name}`}</Tag>
                    ) : null}
                    {state.mode.kind === 'laying' ? (
                        <Tag color="orange">{`${t('actions:lay-aisle')}: ${state.mode.aisle}`}</Tag>
                    ) : null}
                    {state.mode.kind === 'placing-blocked' ? (
                        <Tag color="red">{t('actions:add-blocked-zone')}</Tag>
                    ) : null}
                    {state.mode.kind === 'placing-access' ? (
                        <Tag color="purple">
                            {state.mode.pointKind === 'building'
                                ? t('actions:add-building-access')
                                : t('actions:add-floor-access')}
                        </Tag>
                    ) : null}
                    {level === 'block' && aisleDrifts.size > 0 ? (
                        <Tooltip title={Array.from(aisleDrifts.keys()).join(', ')}>
                            <Tag color="warning">
                                {`${t('messages:aisles-out-of-sync')} (${aisleDrifts.size})`}
                            </Tag>
                        </Tooltip>
                    ) : null}
                    {isLoading || blockCells.isLoading || layoutsLoading ? (
                        <Tag>{t('common:loading')}</Tag>
                    ) : null}
                    {/* the layouts of this building did not load: say so, or the empty unplaced
                        tray would read as "everything is placed" */}
                    {layoutsFailed ? (
                        <Tag color="error">{t('messages:error-getting-data')}</Tag>
                    ) : null}
                    {level === 'block' && !readOnly ? (
                        <Button size="small" danger onClick={handleAddBlockedZone}>
                            {t('actions:add-blocked-zone')}
                        </Button>
                    ) : null}
                    {level === 'building' && !readOnly ? (
                        <>
                            <Button size="small" onClick={() => handleAddAccessPoint('building')}>
                                {t('actions:add-building-access')}
                            </Button>
                            <Button size="small" onClick={() => handleAddAccessPoint('floor')}>
                                {t('actions:add-floor-access')}
                            </Button>
                        </>
                    ) : null}
                </Space>
                {body}
            </PageContentWrapper>
            <ColumnPickerModal
                open={!!columnPicker}
                aisle={columnPicker?.aisle ?? ''}
                columns={columnPicker ? (aisleColumns.get(columnPicker.aisle) ?? []) : []}
                takenElsewhere={pickerTakenElsewhere}
                initialSelected={columnPicker?.selected ?? EMPTY_COLUMNS}
                onCancel={() => setColumnPicker(null)}
                onConfirm={handleColumnPickerConfirm}
            />
        </>
    );
};

CartographyEditor.displayName = 'CartographyEditor';

export { CartographyEditor };
