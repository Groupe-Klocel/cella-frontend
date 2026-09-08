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

// Pure editor state for the cartography screen: entity drafts, selection, dirty tracking and a
// bounded undo/redo history. One history entry per completed gesture (commit on pointer-up),
// never per pointer-move; the view transform (zoom/pan) lives outside this reducer on purpose.

import {
    AccessPoint,
    AccessPointKind,
    AisleDef,
    BlockedZone,
    BlockLayout,
    BuildingLayout,
    CellDef,
    computeAisleCells,
    DEFAULT_BLOCKED_SIZE,
    DEFAULT_BUILDING_SIZE,
    nextAccessPointId,
    nextBlockedZoneId,
    RectShape,
    roundCoord
} from './layoutModel';

export type BuildingDraft = {
    id: string;
    name: string;
    modified: string | null;
    layout: BuildingLayout | null;
};

export type BlockDraft = {
    id: string;
    name: string;
    level: number;
    buildingId: string;
    modified: string | null;
    layout: BlockLayout | null;
    // false until the building's layouts have been fetched: `layout: null` then means "unknown",
    // not "not placed", and history must not restore that unknown over a loaded layout
    layoutLoaded?: boolean;
};

export type EditorSelection =
    | { kind: 'building'; id: string }
    | { kind: 'block'; id: string }
    | { kind: 'aisle'; blockId: string; aisle: string; index: number }
    | { kind: 'access'; buildingId: string; id: string }
    | { kind: 'blocked'; blockId: string; id: string }
    | null;

export type EditorMode =
    | { kind: 'idle' }
    | { kind: 'placing'; entity: 'building' | 'block'; id: string }
    | {
          kind: 'laying';
          blockId: string;
          aisle: string;
          // the stretch being laid: an index into the aisle's segments, -1 for a new one
          index: number;
          // the columns THIS stretch carries, chosen in the column picker
          columns: string[];
      }
    | { kind: 'placing-access'; buildingId: string; pointKind: AccessPointKind; floor: number }
    | { kind: 'placing-blocked'; blockId: string };

type GeometrySnapshot = {
    buildingLayouts: { [id: string]: BuildingLayout | null };
    blockLayouts: { [id: string]: BlockLayout | null };
    dirtyBuildingIds: string[];
    dirtyBlockIds: string[];
};

export type EditorState = {
    buildings: BuildingDraft[];
    blocks: BlockDraft[];
    selection: EditorSelection;
    mode: EditorMode;
    dirtyBuildingIds: string[];
    dirtyBlockIds: string[];
    past: GeometrySnapshot[];
    future: GeometrySnapshot[];
};

export const UNDO_LIMIT = 50;

export type EditorAction =
    | { type: 'INIT'; buildings: BuildingDraft[]; blocks: BlockDraft[] }
    | { type: 'SELECT'; selection: EditorSelection }
    | { type: 'SET_MODE'; mode: EditorMode }
    | { type: 'SET_BUILDING_SITE'; id: string; site: RectShape }
    | { type: 'SET_BLOCK_RECT'; id: string; rect: RectShape }
    | { type: 'REMOVE_BUILDING_LAYOUT'; id: string }
    | { type: 'REMOVE_BLOCK_LAYOUT'; id: string }
    | { type: 'SET_BLOCK_ENTRY'; id: string; entry: [number, number] | undefined }
    | {
          type: 'UPSERT_AISLE_SEGMENT';
          blockId: string;
          aisle: string;
          // the segment being written; -1 (or past the end) appends a new stretch
          index: number;
          def: AisleDef;
      }
    | { type: 'REMOVE_AISLE_SEGMENT'; blockId: string; aisle: string; index: number }
    | {
          type: 'ADD_ACCESS_POINT';
          buildingId: string;
          point: Omit<AccessPoint, 'id'>;
      }
    | {
          type: 'UPDATE_ACCESS_POINT';
          buildingId: string;
          id: string;
          patch: Partial<Omit<AccessPoint, 'id'>>;
      }
    | { type: 'REMOVE_ACCESS_POINT'; buildingId: string; id: string }
    | { type: 'ADD_BLOCKED_ZONE'; blockId: string; at: { x: number; y: number } }
    | {
          type: 'UPDATE_BLOCKED_ZONE';
          blockId: string;
          id: string;
          patch: Partial<Omit<BlockedZone, 'id'>>;
      }
    | { type: 'REMOVE_BLOCKED_ZONE'; blockId: string; id: string }
    | { type: 'HYDRATE_BLOCKS'; blocks: BlockDraft[] }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | {
          type: 'MARK_SAVED';
          buildingModified: { [id: string]: string | null };
          blockModified: { [id: string]: string | null };
      };

export const initialEditorState: EditorState = {
    buildings: [],
    blocks: [],
    selection: null,
    mode: { kind: 'idle' },
    dirtyBuildingIds: [],
    dirtyBlockIds: [],
    past: [],
    future: []
};

const takeSnapshot = (state: EditorState): GeometrySnapshot => {
    const buildingLayouts: { [id: string]: BuildingLayout | null } = {};
    state.buildings.forEach((building) => {
        buildingLayouts[building.id] = building.layout;
    });
    const blockLayouts: { [id: string]: BlockLayout | null } = {};
    state.blocks.forEach((block) => {
        // a block whose layout is still unknown is left out of the snapshot entirely
        if (block.layoutLoaded !== false) blockLayouts[block.id] = block.layout;
    });
    return {
        buildingLayouts,
        blockLayouts,
        dirtyBuildingIds: [...state.dirtyBuildingIds],
        dirtyBlockIds: [...state.dirtyBlockIds]
    };
};

const applySnapshot = (state: EditorState, snapshot: GeometrySnapshot): EditorState => ({
    ...state,
    buildings: state.buildings.map((building) =>
        snapshot.buildingLayouts[building.id] === building.layout
            ? building
            : { ...building, layout: snapshot.buildingLayouts[building.id] ?? null }
    ),
    blocks: state.blocks.map((block) => {
        // absent from the snapshot = its layout was not loaded when the snapshot was taken
        if (!(block.id in snapshot.blockLayouts)) return block;
        return snapshot.blockLayouts[block.id] === block.layout
            ? block
            : { ...block, layout: snapshot.blockLayouts[block.id] ?? null };
    }),
    dirtyBuildingIds: snapshot.dirtyBuildingIds,
    dirtyBlockIds: snapshot.dirtyBlockIds
});

// every geometry commit goes through here: push history, clear redo, mark dirty
const commitGeometry = (
    state: EditorState,
    mutate: (draft: EditorState) => EditorState,
    dirty: { buildingId?: string; blockId?: string }
): EditorState => {
    const past = [...state.past, takeSnapshot(state)];
    if (past.length > UNDO_LIMIT) past.shift();
    let next = mutate({ ...state, past, future: [] });
    if (dirty.buildingId && !next.dirtyBuildingIds.includes(dirty.buildingId)) {
        next = { ...next, dirtyBuildingIds: [...next.dirtyBuildingIds, dirty.buildingId] };
    }
    if (dirty.blockId && !next.dirtyBlockIds.includes(dirty.blockId)) {
        next = { ...next, dirtyBlockIds: [...next.dirtyBlockIds, dirty.blockId] };
    }
    return next;
};

const normalizeRect = (rect: RectShape): RectShape => {
    const normalized: RectShape = {
        x: roundCoord(rect.x),
        y: roundCoord(rect.y),
        w: roundCoord(Math.max(rect.w, 0.5)),
        d: roundCoord(Math.max(rect.d, 0.5))
    };
    if (rect.r) normalized.r = rect.r;
    return normalized;
};

// a jitter-click snapped back to the same position must not burn an undo slot or dirty the
// entity (Save would then issue a pointless write of an unchanged layout)
const sameRect = (a: RectShape | undefined, b: RectShape): boolean =>
    !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.d === b.d && (a.r ?? 0) === (b.r ?? 0);

const updateBuildingLayout = (
    state: EditorState,
    id: string,
    layout: BuildingLayout | null
): EditorState => ({
    ...state,
    buildings: state.buildings.map((building) =>
        building.id === id ? { ...building, layout } : building
    )
});

// aisles and cells are always rewritten together: `cells` stays the materialized truth every
// reader consumes, and it is the merge of the segments' own cells
const withAisleSegments = (
    base: BlockLayout,
    aisle: string,
    segments: AisleDef[]
): BlockLayout => {
    const aisles = { ...base.aisles };
    const cells = { ...base.cells };
    if (segments.length === 0) {
        delete aisles[aisle];
        delete cells[aisle];
        return { ...base, aisles, cells };
    }
    aisles[aisle] = segments;
    const merged: { [column: string]: CellDef } = {};
    segments.forEach((segment) => {
        Object.assign(merged, computeAisleCells(segment, base.cellDefaults));
    });
    cells[aisle] = merged;
    return { ...base, aisles, cells };
};

const updateBlockLayout = (
    state: EditorState,
    id: string,
    layout: BlockLayout | null
): EditorState => ({
    ...state,
    blocks: state.blocks.map((block) => (block.id === id ? { ...block, layout } : block))
});

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
    switch (action.type) {
        case 'INIT':
            return {
                ...initialEditorState,
                buildings: action.buildings,
                blocks: action.blocks
            };
        // Layouts arrive per building (the editor only fetches the JSON of the blocks it is
        // about to draw), so late arrivals are merged in rather than reinitialising: a block the
        // user has already edited keeps its draft, everything else takes the freshly loaded one.
        case 'HYDRATE_BLOCKS': {
            const incoming = new Map(action.blocks.map((block) => [block.id, block]));
            let changed = false;
            const blocks = state.blocks.map((block) => {
                const fresh = incoming.get(block.id);
                if (!fresh || state.dirtyBlockIds.includes(block.id)) return block;
                if (fresh.modified === block.modified && block.layout !== null) return block;
                changed = true;
                return { ...block, ...fresh, layoutLoaded: true };
            });
            return changed ? { ...state, blocks } : state;
        }
        case 'SELECT':
            return { ...state, selection: action.selection };
        case 'SET_MODE':
            return { ...state, mode: action.mode };
        case 'SET_BUILDING_SITE': {
            const building = state.buildings.find((entry) => entry.id === action.id);
            if (!building) return state;
            if (sameRect(building.layout?.site, normalizeRect(action.site))) return state;
            const site = normalizeRect(action.site);
            const layout: BuildingLayout = building.layout
                ? { ...building.layout, site }
                : { v: 1, unit: 'm', site };
            return commitGeometry(
                state,
                (draft) => updateBuildingLayout(draft, action.id, layout),
                { buildingId: action.id }
            );
        }
        case 'SET_BLOCK_RECT': {
            const block = state.blocks.find((entry) => entry.id === action.id);
            if (!block) return state;
            if (sameRect(block.layout?.b, normalizeRect(action.rect))) return state;
            const rect = normalizeRect(action.rect);
            const layout: BlockLayout = block.layout
                ? { ...block.layout, b: rect }
                : { v: 1, b: rect };
            return commitGeometry(state, (draft) => updateBlockLayout(draft, action.id, layout), {
                blockId: action.id
            });
        }
        case 'REMOVE_BUILDING_LAYOUT':
            if (!state.buildings.find((entry) => entry.id === action.id)?.layout) return state;
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBuildingLayout(draft, action.id, null),
                    selection: null
                }),
                { buildingId: action.id }
            );
        case 'REMOVE_BLOCK_LAYOUT':
            if (!state.blocks.find((entry) => entry.id === action.id)?.layout) return state;
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBlockLayout(draft, action.id, null),
                    selection: null
                }),
                { blockId: action.id }
            );
        case 'SET_BLOCK_ENTRY': {
            const block = state.blocks.find((entry) => entry.id === action.id);
            if (!block?.layout) return state;
            const layout: BlockLayout = { ...block.layout };
            if (action.entry) layout.entry = action.entry;
            else delete layout.entry;
            return commitGeometry(state, (draft) => updateBlockLayout(draft, action.id, layout), {
                blockId: action.id
            });
        }
        case 'UPSERT_AISLE_SEGMENT': {
            const block = state.blocks.find((entry) => entry.id === action.blockId);
            if (!block) return state;
            // laying an aisle into a block that was never placed bootstraps a default frame
            const base: BlockLayout = block.layout ?? {
                v: 1,
                b: { x: 0, y: 0, w: 20, d: 12 }
            };
            const current = base.aisles?.[action.aisle] ?? [];
            const taken = new Set(action.def.columns);
            const segments = current.map((segment, index) =>
                index === action.index
                    ? action.def
                    : // a column belongs to ONE stretch: whatever this segment takes is
                      // removed from its siblings, or `cells` would have two claimants and the
                      // coverage arithmetic would count it twice
                      { ...segment, columns: segment.columns.filter((c) => !taken.has(c)) }
            );
            if (action.index < 0 || action.index >= current.length) segments.push(action.def);
            const kept = segments.filter(
                (segment, index) => segment.columns.length > 0 || index === action.index
            );
            // taking columns off a sibling can empty it, and an emptied sibling is dropped — so
            // the written stretch does not necessarily land on the index it was written to.
            // The selection follows it by identity, or the panel would end up describing another
            // stretch (or nothing at all).
            const writtenIndex = kept.indexOf(action.def);
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBlockLayout(
                        draft,
                        action.blockId,
                        withAisleSegments(base, action.aisle, kept)
                    ),
                    selection:
                        writtenIndex >= 0
                            ? {
                                  kind: 'aisle' as const,
                                  blockId: action.blockId,
                                  aisle: action.aisle,
                                  index: writtenIndex
                              }
                            : draft.selection
                }),
                { blockId: action.blockId }
            );
        }
        case 'REMOVE_AISLE_SEGMENT': {
            const block = state.blocks.find((entry) => entry.id === action.blockId);
            const current = block?.layout?.aisles?.[action.aisle];
            if (!block?.layout || !current?.[action.index]) return state;
            const kept = current.filter((segment, index) => index !== action.index);
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBlockLayout(
                        draft,
                        action.blockId,
                        withAisleSegments(block.layout!, action.aisle, kept)
                    ),
                    selection: null
                }),
                { blockId: action.blockId }
            );
        }
        case 'ADD_ACCESS_POINT': {
            const building = state.buildings.find((entry) => entry.id === action.buildingId);
            if (!building) return state;
            // an access point is stored on the building layout, so placing one in a building
            // that was never put on the site map bootstraps a default footprint (same rule as
            // laying an aisle into an unplaced block)
            const base: BuildingLayout = building.layout ?? {
                v: 1,
                unit: 'm',
                site: { x: 0, y: 0, ...DEFAULT_BUILDING_SIZE }
            };
            const point: AccessPoint = {
                ...action.point,
                id: nextAccessPointId(base.access)
            };
            const layout: BuildingLayout = { ...base, access: [...(base.access ?? []), point] };
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBuildingLayout(draft, action.buildingId, layout),
                    selection: { kind: 'access', buildingId: action.buildingId, id: point.id }
                }),
                { buildingId: action.buildingId }
            );
        }
        case 'UPDATE_ACCESS_POINT': {
            const building = state.buildings.find((entry) => entry.id === action.buildingId);
            const current = building?.layout?.access?.find((point) => point.id === action.id);
            if (!building?.layout || !current) return state;
            // a no-op edit (a number field blurred unchanged) must not burn an undo slot nor
            // dirty the building — Save would then write an identical layout back
            const patch = action.patch as { [key: string]: unknown };
            const changed = Object.keys(patch).some(
                (key) => patch[key] !== (current as { [key: string]: unknown })[key]
            );
            if (!changed) return state;
            const layout: BuildingLayout = {
                ...building.layout,
                access: building.layout.access!.map((point) =>
                    point.id === action.id ? { ...point, ...action.patch } : point
                )
            };
            return commitGeometry(
                state,
                (draft) => updateBuildingLayout(draft, action.buildingId, layout),
                { buildingId: action.buildingId }
            );
        }
        case 'REMOVE_ACCESS_POINT': {
            const building = state.buildings.find((entry) => entry.id === action.buildingId);
            if (!building?.layout?.access?.some((point) => point.id === action.id)) return state;
            const access = building.layout.access.filter((point) => point.id !== action.id);
            const layout: BuildingLayout = { ...building.layout };
            if (access.length > 0) layout.access = access;
            else delete layout.access;
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBuildingLayout(draft, action.buildingId, layout),
                    selection: null
                }),
                { buildingId: action.buildingId }
            );
        }
        case 'ADD_BLOCKED_ZONE': {
            const block = state.blocks.find((entry) => entry.id === action.blockId);
            if (!block) return state;
            // dropping a wall into a block that was never placed bootstraps a default frame,
            // exactly as laying an aisle does
            const base: BlockLayout = block.layout ?? { v: 1, b: { x: 0, y: 0, w: 20, d: 12 } };
            const zone: BlockedZone = {
                id: nextBlockedZoneId(base.blocked),
                x: roundCoord(action.at.x - DEFAULT_BLOCKED_SIZE.w / 2),
                y: roundCoord(action.at.y - DEFAULT_BLOCKED_SIZE.d / 2),
                ...DEFAULT_BLOCKED_SIZE
            };
            const layout: BlockLayout = { ...base, blocked: [...(base.blocked ?? []), zone] };
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBlockLayout(draft, action.blockId, layout),
                    selection: { kind: 'blocked', blockId: action.blockId, id: zone.id }
                }),
                { blockId: action.blockId }
            );
        }
        case 'UPDATE_BLOCKED_ZONE': {
            const block = state.blocks.find((entry) => entry.id === action.blockId);
            const current = block?.layout?.blocked?.find((zone) => zone.id === action.id);
            if (!block?.layout || !current) return state;
            const patch = action.patch as { [key: string]: unknown };
            const changed = Object.keys(patch).some(
                (key) => patch[key] !== (current as { [key: string]: unknown })[key]
            );
            if (!changed) return state;
            const layout: BlockLayout = {
                ...block.layout,
                blocked: block.layout.blocked!.map((zone) =>
                    zone.id === action.id ? { ...zone, ...action.patch } : zone
                )
            };
            return commitGeometry(
                state,
                (draft) => updateBlockLayout(draft, action.blockId, layout),
                {
                    blockId: action.blockId
                }
            );
        }
        case 'REMOVE_BLOCKED_ZONE': {
            const block = state.blocks.find((entry) => entry.id === action.blockId);
            if (!block?.layout?.blocked?.some((zone) => zone.id === action.id)) return state;
            const blocked = block.layout.blocked.filter((zone) => zone.id !== action.id);
            const layout: BlockLayout = { ...block.layout };
            if (blocked.length > 0) layout.blocked = blocked;
            else delete layout.blocked;
            return commitGeometry(
                state,
                (draft) => ({
                    ...updateBlockLayout(draft, action.blockId, layout),
                    selection: null
                }),
                { blockId: action.blockId }
            );
        }
        case 'UNDO': {
            const previous = state.past[state.past.length - 1];
            if (!previous) return state;
            const future = [takeSnapshot(state), ...state.future];
            return {
                ...applySnapshot(state, previous),
                past: state.past.slice(0, -1),
                future
            };
        }
        case 'REDO': {
            const next = state.future[0];
            if (!next) return state;
            const past = [...state.past, takeSnapshot(state)];
            return {
                ...applySnapshot(state, next),
                past,
                future: state.future.slice(1)
            };
        }
        case 'MARK_SAVED': {
            const savedBuildingIds = Object.keys(action.buildingModified);
            const savedBlockIds = Object.keys(action.blockModified);
            // a save is a new baseline: history entries carry dirty sets relative to the OLD
            // baseline, so undoing across a save would show diverged geometry as "clean" and
            // make it unsavable — drop the history instead
            return {
                ...state,
                past: [],
                future: [],
                buildings: state.buildings.map((building) =>
                    savedBuildingIds.includes(building.id)
                        ? { ...building, modified: action.buildingModified[building.id] }
                        : building
                ),
                blocks: state.blocks.map((block) =>
                    savedBlockIds.includes(block.id)
                        ? { ...block, modified: action.blockModified[block.id] }
                        : block
                ),
                dirtyBuildingIds: state.dirtyBuildingIds.filter(
                    (id) => !savedBuildingIds.includes(id)
                ),
                dirtyBlockIds: state.dirtyBlockIds.filter((id) => !savedBlockIds.includes(id))
            };
        }
        default:
            return state;
    }
};
