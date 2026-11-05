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

// Pure geometry model for the warehouse cartography feature.
//
// Layouts live in the dedicated `layout` jsonb column of buildings and blocks (nowhere else) —
// the whole document IS the column, so `parse*Layout` takes it as it comes off the API and
// `build*Layout` produces exactly what goes back in.
//
// WRITE CONTRACT — the generic update mutation shallow-merges a JSON field ONE level deep
// (`old | new`, dictionary_manager/resolvers.py). Since the column is now the layout itself,
// that merge bites at the level of its top-level keys: a key ABSENT from the payload keeps its
// stored value, so omitting `blocked` when the last zone is deleted would resurrect the zones.
// Hence the rule the serializers below obey: EVERY optional top-level key is always emitted,
// empty (`{}` / `[]` / `null`) rather than omitted. Concretely, the emitted key set must stay
// equal to the parsed one — `v/unit/site/floors/access` for a building, `v/b/cellDefaults/entry/
// levels/aisles/cells/blocked` for a block. ADDING AN OPTIONAL KEY LATER MEANS EMITTING IT
// UNCONDITIONALLY TOO; emitting it only when set silently brings back "the zone I deleted came
// back after reload". Nested values are replaced wholesale (the merge does not recurse), and
// `layout: null` clears the column — that is "remove from map".
//
// The flip side of that merge, and the one case this contract cannot fix: a top-level key this
// version never writes is IMMORTAL — no payload deletes a key. So a document written by a future
// schema version (`v: 2`) that this parser rejects still renders as "not placed", and re-placing
// the entity lands a full v1 document ON TOP of it: the v2-only keys survive and `v` drops back
// to 1. Under `extras` the whole layout was one key and was replaced atomically, so this could
// not happen. Keep it in mind before running an older frontend against a newer schema.
//
// Conventions (schema v1):
// - units are abstract meters, y grows downward (SVG convention);
// - every frame is local: a building is placed in the shared site frame, a block in its
//   building's frame, a cell in its block's frame — moving a parent never rewrites children;
// - the anchor of a rect is the top-left of the unrotated bounding box; `r` is a rotation in
//   degrees, clockwise, around the bbox center (reserved: not editable in v1);
// - a cell's (x, y) is the CENTRE OF THE LOCATION on its rack row (the aisle segment is that
//   row's axis, never a walkway); the point where the operator stands is derived from it by
//   `cellAccessPoint`, in the corridor running along the allowed pick side;
// - `aisles` are the editor's parametric gesture (re-flowable); `cells` are the materialized
//   truth every reader consumes. The editor always rewrites both together; `cells` wins. That
//   materialisation is also why `aisleColumnDrift` exists: locations created or deleted after
//   an aisle was laid stay invisible until someone resynchronises it, on purpose (re-flowing
//   moves the pick points of the columns already placed);
// - a block carries its `blocked` zones: rectangles nobody may walk through. They are obstacles
//   of the walking graph and contribute the corners a walk can turn at. Two limits, deliberate:
//   the only clearance in the model is BLOCKED_CORNER_MARGIN, so a gap narrower than a picker
//   but wider than that margin still reads as walkable; and the hops between a stop and an
//   access point are measured straight (see the access graph below), so a door on the far side
//   of a wall is priced as if the wall were not there. A leg with no legal way round a zone is
//   priced at BLOCKED_CROSSING_PENALTY and reported, never passed off as a route;
// - a building carries its `access` points (doors and vertical links). A floor access is
//   declared ONCE, on the floor it starts from; the counterpart on the floor it leads to is
//   derived by `accessPointsOnFloor`, never stored twice.

export type Pt = { x: number; y: number };

export type RectShape = {
    x: number;
    y: number;
    w: number;
    d: number;
    r?: number;
};

// An access point of a building: either a door to the outside (`building`) or a vertical link
// between two floors (`floor` — stairs, lift, ramp). It lives in the BUILDING frame, on one
// floor, and a floor access is DECLARED ONCE: the counterpart on the floor it leads to is
// derived, never stored twice (see `accessPointsOnFloor`).
export type AccessPointKind = 'building' | 'floor';

// building access: enter only / leave only / both ways
export type BuildingAccessDirection = 'in' | 'out' | 'both';
// floor access: leads to the floor above / below / both
export type FloorAccessDirection = 'up' | 'down' | 'both';
export type AccessDirection = BuildingAccessDirection | FloorAccessDirection;

export type AccessPoint = {
    id: string;
    kind: AccessPointKind;
    x: number;
    y: number;
    floor: number;
    direction: AccessDirection;
    name?: string;
};

export type BuildingLayout = {
    v: number;
    unit?: string;
    site: RectShape & { shape?: 'rect' | 'polygon'; points?: number[][] };
    floors?: { [level: string]: { z: number } };
    access?: AccessPoint[];
};

// which side(s) of the rack row picking is allowed from, relative to the from->to direction
// (screen coords, y down: 'right' is the right hand of someone walking from `from` to `to`).
// Feeds the future Z/U picking-path optimization and decides where the operator walks.
export type AisleSides = 'both' | 'left' | 'right';

export type AisleDef = {
    from: [number, number];
    to: [number, number];
    columns: string[];
    pitch?: number;
    reversed?: boolean;
    cellW?: number;
    cellD?: number;
    sides?: AisleSides;
};

export type CellDef = { x: number; y: number; w?: number; d?: number };

// A rectangle of the block nobody may walk through: a wall, a machine bay, a motorised-traffic
// lane closed to pickers. Same frame as `aisles` and `cells` — block-local, meters, y down.
export type BlockedZone = {
    id: string;
    x: number;
    y: number;
    w: number;
    d: number;
    name?: string;
};

export type BlockLayout = {
    v: number;
    b: RectShape;
    cellDefaults?: { w: number; d: number };
    entry?: [number, number];
    levels?: { [level: string]: number };
    // An aisle is laid as one or more SEGMENTS, each carrying a subset of its columns: a rack
    // row cut by a cross-aisle, or a row that physically runs in several separate stretches.
    // Every column belongs to at most one segment (the editor enforces it on write), which is
    // what lets `cells` stay one flat map per aisle. Serialized as a bare object when there is
    // a single segment, so a layout drawn before this stayed byte-for-byte what it was.
    aisles?: { [aisle: string]: AisleDef[] };
    cells?: { [aisle: string]: { [column: string]: CellDef } };
    blocked?: BlockedZone[];
};

export const LAYOUT_VERSION = 1;
export const DEFAULT_CELL = { w: 1.2, d: 1.0 };
export const DEFAULT_BUILDING_SIZE = { w: 60, d: 30 };
export const DEFAULT_BLOCK_SIZE = { w: 20, d: 12 };
export const DEFAULT_FLOOR_HEIGHT = 4;

// distance penalties (meter-equivalents) added when a leg crosses a boundary
export const BLOCK_CHANGE_PENALTY = 15;
export const FLOOR_CHANGE_PENALTY = 40;
export const BUILDING_CHANGE_PENALTY = 200;

const isFiniteNumber = (value: any): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const asObject = (raw: any): any | null => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'string') {
        // some JSON payloads reach the client as strings — tolerate both shapes
        try {
            return asObject(JSON.parse(raw));
        } catch (error) {
            return null;
        }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    return null;
};

const parseRect = (raw: any): RectShape | null => {
    const rect = asObject(raw);
    if (!rect) return null;
    if (
        !isFiniteNumber(rect.x) ||
        !isFiniteNumber(rect.y) ||
        !isFiniteNumber(rect.w) ||
        !isFiniteNumber(rect.d) ||
        rect.w <= 0 ||
        rect.d <= 0
    ) {
        return null;
    }
    const parsed: RectShape = { x: rect.x, y: rect.y, w: rect.w, d: rect.d };
    if (isFiniteNumber(rect.r) && rect.r !== 0) parsed.r = rect.r;
    return parsed;
};

const parsePoint = (raw: any): [number, number] | null => {
    if (!Array.isArray(raw) || raw.length < 2) return null;
    if (!isFiniteNumber(raw[0]) || !isFiniteNumber(raw[1])) return null;
    return [raw[0], raw[1]];
};

const BUILDING_DIRECTIONS: AccessDirection[] = ['in', 'out', 'both'];
const FLOOR_DIRECTIONS: AccessDirection[] = ['up', 'down', 'both'];

// Ids are what the mirrored counterparts point back to, so a payload with a missing or
// duplicated id is repaired here rather than rejected: an unusable id would make the point
// uneditable, and dropping the point would silently lose a door the user placed.
const parseAccessPoints = (raw: any): AccessPoint[] => {
    if (!Array.isArray(raw)) return [];
    const parsed: AccessPoint[] = [];
    const used = new Set<string>();
    raw.forEach((entry, index) => {
        const point = asObject(entry);
        if (!point) return;
        if (!isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return;
        const kind: AccessPointKind = point.kind === 'floor' ? 'floor' : 'building';
        const allowed = kind === 'floor' ? FLOOR_DIRECTIONS : BUILDING_DIRECTIONS;
        const direction: AccessDirection = allowed.includes(point.direction)
            ? point.direction
            : 'both';
        let id = typeof point.id === 'string' && point.id ? point.id : `ap${index + 1}`;
        while (used.has(id)) id = `${id}_`;
        used.add(id);
        // A point with no declared floor is DROPPED, never parked on floor 0: the building may
        // not have one (a basement + mezzanine site is exactly what `adjacentFloor` exists for),
        // and a phantom zone would invent links between floors that are not neighbours.
        if (!isFiniteNumber(point.floor)) return;
        const result: AccessPoint = {
            id,
            kind,
            x: point.x,
            y: point.y,
            floor: point.floor,
            direction
        };
        if (typeof point.name === 'string' && point.name) result.name = point.name;
        parsed.push(result);
    });
    return parsed;
};

// Defensive parse: a malformed or newer-versioned layout renders as "not placed" instead of
// crashing the screen. Unknown keys are ignored here — but no longer lost on the next save: the
// column merges one level, so a key we do not write survives (see the WRITE CONTRACT above).
// `raw` is the `layout` column as the API returns it (an object, or a JSON string on the odd
// payload — `asObject` tolerates both), null/undefined when the entity was never placed.
export const parseBuildingLayout = (raw: any): BuildingLayout | null => {
    const layout = asObject(raw);
    if (!layout || !isFiniteNumber(layout.v) || layout.v > LAYOUT_VERSION) return null;
    const site = parseRect(layout.site);
    if (!site) return null;
    const parsed: BuildingLayout = { v: layout.v, site };
    if (typeof layout.unit === 'string') parsed.unit = layout.unit;
    const floors = asObject(layout.floors);
    if (floors) {
        const parsedFloors: { [level: string]: { z: number } } = {};
        Object.keys(floors).forEach((level) => {
            const z = asObject(floors[level])?.z;
            if (isFiniteNumber(z)) parsedFloors[level] = { z };
        });
        if (Object.keys(parsedFloors).length > 0) parsed.floors = parsedFloors;
    }
    const access = parseAccessPoints(layout.access);
    if (access.length > 0) parsed.access = access;
    return parsed;
};

// Ids are what the editor selects on, so a missing or duplicated one is repaired rather than
// dropping the zone — a wall the user drew must never silently stop being a wall.
const parseBlockedZones = (raw: any): BlockedZone[] => {
    if (!Array.isArray(raw)) return [];
    const parsed: BlockedZone[] = [];
    const used = new Set<string>();
    raw.forEach((entry, index) => {
        const rect = parseRect(entry);
        if (!rect) return;
        const zone = asObject(entry)!;
        let id = typeof zone.id === 'string' && zone.id ? zone.id : `bz${index + 1}`;
        while (used.has(id)) id = `${id}_`;
        used.add(id);
        const result: BlockedZone = { id, x: rect.x, y: rect.y, w: rect.w, d: rect.d };
        if (typeof zone.name === 'string' && zone.name) result.name = zone.name;
        parsed.push(result);
    });
    return parsed;
};

const parseAisleSegment = (raw: any): AisleDef | null => {
    const def = asObject(raw);
    const from = parsePoint(def?.from);
    const to = parsePoint(def?.to);
    if (!def || !from || !to || !Array.isArray(def.columns)) return null;
    const parsed: AisleDef = {
        from,
        to,
        columns: def.columns.filter((column: any) => typeof column === 'string')
    };
    if (isFiniteNumber(def.pitch) && def.pitch > 0) parsed.pitch = def.pitch;
    if (def.reversed === true) parsed.reversed = true;
    if (isFiniteNumber(def.cellW) && def.cellW > 0) parsed.cellW = def.cellW;
    if (isFiniteNumber(def.cellD) && def.cellD > 0) parsed.cellD = def.cellD;
    if (def.sides === 'left' || def.sides === 'right') parsed.sides = def.sides;
    return parsed;
};

export const parseBlockLayout = (raw: any): BlockLayout | null => {
    const layout = asObject(raw);
    if (!layout || !isFiniteNumber(layout.v) || layout.v > LAYOUT_VERSION) return null;
    const b = parseRect(layout.b);
    if (!b) return null;
    const parsed: BlockLayout = { v: layout.v, b };
    const cellDefaults = asObject(layout.cellDefaults);
    if (cellDefaults && isFiniteNumber(cellDefaults.w) && isFiniteNumber(cellDefaults.d)) {
        parsed.cellDefaults = { w: cellDefaults.w, d: cellDefaults.d };
    }
    const entry = parsePoint(layout.entry);
    if (entry) parsed.entry = entry;
    const levels = asObject(layout.levels);
    if (levels) {
        const parsedLevels: { [level: string]: number } = {};
        Object.keys(levels).forEach((level) => {
            if (isFiniteNumber(levels[level])) parsedLevels[level] = levels[level];
        });
        if (Object.keys(parsedLevels).length > 0) parsed.levels = parsedLevels;
    }
    const aisles = asObject(layout.aisles);
    if (aisles) {
        const parsedAisles: { [aisle: string]: AisleDef[] } = {};
        Object.keys(aisles).forEach((aisle) => {
            // one object = the single-segment shape every layout used before segments existed
            const raw = aisles[aisle];
            const list = Array.isArray(raw) ? raw : [raw];
            const segments = list
                .map((entry: any) => parseAisleSegment(entry))
                .filter((entry): entry is AisleDef => !!entry);
            if (segments.length > 0) parsedAisles[aisle] = segments;
        });
        if (Object.keys(parsedAisles).length > 0) parsed.aisles = parsedAisles;
    }
    const cells = asObject(layout.cells);
    if (cells) {
        const parsedCells: { [aisle: string]: { [column: string]: CellDef } } = {};
        Object.keys(cells).forEach((aisle) => {
            const columns = asObject(cells[aisle]);
            if (!columns) return;
            const parsedColumns: { [column: string]: CellDef } = {};
            Object.keys(columns).forEach((column) => {
                const cell = asObject(columns[column]);
                if (!cell || !isFiniteNumber(cell.x) || !isFiniteNumber(cell.y)) return;
                const parsedCell: CellDef = { x: cell.x, y: cell.y };
                if (isFiniteNumber(cell.w) && cell.w > 0) parsedCell.w = cell.w;
                if (isFiniteNumber(cell.d) && cell.d > 0) parsedCell.d = cell.d;
                parsedColumns[column] = parsedCell;
            });
            if (Object.keys(parsedColumns).length > 0) parsedCells[aisle] = parsedColumns;
        });
        if (Object.keys(parsedCells).length > 0) parsed.cells = parsedCells;
    }
    const blocked = parseBlockedZones(layout.blocked);
    if (blocked.length > 0) parsed.blocked = blocked;
    return parsed;
};

export const roundCoord = (value: number): number => Math.round(value * 100) / 100;

export const snap = (value: number, step: number | null | undefined): number =>
    step && step > 0 ? roundCoord(Math.round(value / step) * step) : roundCoord(value);

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const rotatePoint = (point: Pt, degrees: number, center: Pt): Pt => {
    if (!degrees) return point;
    const angle = toRadians(degrees);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
};

export const rectCenter = (rect: RectShape): Pt => ({
    x: rect.x + rect.w / 2,
    y: rect.y + rect.d / 2
});

// child-local point -> parent frame (the child is placed at `rect` inside the parent)
export const localToParent = (point: Pt, rect: RectShape): Pt => {
    const translated = { x: rect.x + point.x, y: rect.y + point.y };
    return rotatePoint(translated, rect.r ?? 0, rectCenter(rect));
};

// Distributes an aisle's columns along its segment. With a pitch, cells start at `from` and
// step by pitch; without one, they spread evenly from end to end (a single column sits at the
// middle). `reversed` flips the column order without moving the segment.
export const computeAisleCells = (
    def: AisleDef,
    defaults?: { w: number; d: number }
): { [column: string]: CellDef } => {
    const cells: { [column: string]: CellDef } = {};
    const columns = def.reversed ? [...def.columns].reverse() : def.columns;
    const count = columns.length;
    if (count === 0) return cells;
    const [x1, y1] = def.from;
    const [x2, y2] = def.to;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const ux = length > 0 ? (x2 - x1) / length : 1;
    const uy = length > 0 ? (y2 - y1) / length : 0;
    const cellW = def.cellW ?? defaults?.w ?? DEFAULT_CELL.w;
    const cellD = def.cellD ?? defaults?.d ?? DEFAULT_CELL.d;
    columns.forEach((column, index) => {
        let distanceAlong: number;
        if (def.pitch) {
            distanceAlong = index * def.pitch;
        } else if (count === 1) {
            distanceAlong = length / 2;
        } else {
            distanceAlong = (index * length) / (count - 1);
        }
        cells[column] = {
            x: roundCoord(x1 + ux * distanceAlong),
            y: roundCoord(y1 + uy * distanceAlong),
            w: cellW,
            d: cellD
        };
    });
    return cells;
};

// gap kept clear between the walkway line and the rack faces drawn beside it
export const WALKWAY_CLEARANCE = 0.15;

// unit direction of the walkway and its right-hand normal (screen coords, y down)
export const aisleVectors = (
    def: Pick<AisleDef, 'from' | 'to'>
): { ux: number; uy: number; nx: number; ny: number } => {
    const dx = def.to[0] - def.from[0];
    const dy = def.to[1] - def.from[1];
    const length = Math.hypot(dx, dy);
    const ux = length > 0 ? dx / length : 1;
    const uy = length > 0 ? dy / length : 0;
    return { ux, uy, nx: -uy, ny: ux };
};

// A cell (aisle x column) is ONE location: a single rectangle centred on the aisle segment —
// the aisle line is the rack row itself, never a walkway. Picking happens from the corridor(s)
// running alongside it, on the allowed side(s), which is where the operator actually stands.
// `w` runs ALONG the rack row and `d` across it, like every other helper here, so the rectangle
// has to be turned to the row's direction: a vertical aisle swaps the two. The result is the
// axis-aligned box — exact for a horizontal or vertical row, a safe over-approximation for a
// diagonal one (an obstacle must never under-cover its rack).
export const cellRect = (
    center: Pt,
    def: Pick<AisleDef, 'from' | 'to'> | null | undefined,
    w: number,
    d: number
): RectShape => {
    const { ux, uy, nx, ny } = def ? aisleVectors(def) : { ux: 1, uy: 0, nx: 0, ny: 1 };
    const halfW = (Math.abs(ux) * w + Math.abs(nx) * d) / 2;
    const halfD = (Math.abs(uy) * w + Math.abs(ny) * d) / 2;
    return { x: center.x - halfW, y: center.y - halfD, w: halfW * 2, d: halfD * 2 };
};

// true when a row runs more horizontally than vertically — tells which side of a merged row
// rectangle is its length
export const isRowHorizontal = (def: Pick<AisleDef, 'from' | 'to'>): boolean => {
    const { ux, uy } = aisleVectors(def);
    return Math.abs(ux) >= Math.abs(uy);
};

// signs along the right-hand normal for the allowed pick side(s): +1 right, -1 left
export const sideSigns = (sides: AisleSides | undefined): number[] =>
    sides === 'left' ? [-1] : sides === 'right' ? [1] : [1, -1];

// the default side when both are allowed — used wherever no route is available to choose one
// (the route screen picks per leg, see `cellAccessPoints`); 'left' is the only case that flips it
export const primarySideSign = (sides: AisleSides | undefined): number =>
    sides === 'left' ? -1 : 1;

// distance from the rack row axis to the middle of the corridor beside it
export const corridorOffset = (d: number): number => d / 2 + WALKWAY_CLEARANCE;

// The accent lines to DRAW on the faces of one cell where picking is allowed — this is what
// tells "reachable from this side", without ever duplicating the location itself.
export const cellPickMarks = (
    center: Pt,
    def: Pick<AisleDef, 'from' | 'to' | 'sides'>,
    w: number,
    d: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> => {
    const { ux, uy, nx, ny } = aisleVectors(def);
    return sideSigns(def.sides).map((sign) => {
        const fx = center.x + nx * sign * (d / 2);
        const fy = center.y + ny * sign * (d / 2);
        return {
            x1: fx - ux * (w / 2),
            y1: fy - uy * (w / 2),
            x2: fx + ux * (w / 2),
            y2: fy + uy * (w / 2)
        };
    });
};

// walkable corridor(s) beside an aisle, one per allowed pick side
export const aisleCorridors = (
    path: { from: [number, number]; to: [number, number] },
    sides: AisleSides | undefined,
    cellD: number
): Array<{ from: [number, number]; to: [number, number] }> => {
    const def = { from: path.from, to: path.to };
    const { nx, ny } = aisleVectors(def);
    const offset = corridorOffset(cellD);
    return sideSigns(sides).map((sign) => ({
        from: [path.from[0] + nx * sign * offset, path.from[1] + ny * sign * offset] as [
            number,
            number
        ],
        to: [path.to[0] + nx * sign * offset, path.to[1] + ny * sign * offset] as [number, number]
    }));
};

// Every point the operator can stand at to pick a cell: one per allowed side, in the corridor
// running beside the rack row. An aisle picked from BOTH sides therefore offers two — which one
// a given route uses is a property of the ROUTE, not of the location, so the caller picks per
// leg (see `resolveSides` in the route-analysis screen). The primary side comes first, so a
// caller that wants one point keeps the historical behaviour.
export const cellAccessPoints = (
    center: Pt,
    def: Pick<AisleDef, 'from' | 'to' | 'sides'>,
    cellD: number
): Pt[] => {
    const { nx, ny } = aisleVectors(def);
    const offset = corridorOffset(cellD);
    const primary = primarySideSign(def.sides);
    const signs = sideSigns(def.sides);
    const ordered = [primary, ...signs.filter((sign) => sign !== primary)];
    return ordered.map((sign) => ({
        x: center.x + nx * sign * offset,
        y: center.y + ny * sign * offset
    }));
};

// where the operator stands to pick a cell: beside it, in the primary allowed corridor
export const cellAccessPoint = (
    center: Pt,
    def: Pick<AisleDef, 'from' | 'to' | 'sides'>,
    cellD: number
): Pt => cellAccessPoints(center, def, cellD)[0];

// quarter-turn of an aisle around its starting point (visual clockwise, y-down screen coords)
export const rotateAisle90 = (def: AisleDef): AisleDef => {
    const dx = def.to[0] - def.from[0];
    const dy = def.to[1] - def.from[1];
    return {
        ...def,
        to: [roundCoord(def.from[0] - dy), roundCoord(def.from[1] + dx)]
    };
};

export type AislePath = { from: [number, number]; to: [number, number] };

const pointDistance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

// Walking route between two pick points: never cut through racks. Same aisle -> straight along
// the walkway. Different aisles -> leave by one end of the source aisle, cross to an end of the
// target aisle, walk in — the endpoint pair minimizing the total distance wins. Missing aisle
// geometry degrades to the direct segment (the caller draws it dashed).
export const routeThroughAisles = (
    a: Pt,
    b: Pt,
    aisleA: AislePath | null,
    aisleB: AislePath | null,
    sameAisle: boolean
): { points: Pt[]; distance: number } => {
    if (sameAisle || !aisleA || !aisleB) {
        return { points: [a, b], distance: pointDistance(a, b) };
    }
    const endsA: Pt[] = [
        { x: aisleA.from[0], y: aisleA.from[1] },
        { x: aisleA.to[0], y: aisleA.to[1] }
    ];
    const endsB: Pt[] = [
        { x: aisleB.from[0], y: aisleB.from[1] },
        { x: aisleB.to[0], y: aisleB.to[1] }
    ];
    let best: { points: Pt[]; distance: number } | null = null;
    endsA.forEach((endA) => {
        endsB.forEach((endB) => {
            const distance =
                pointDistance(a, endA) + pointDistance(endA, endB) + pointDistance(endB, b);
            if (!best || distance < best.distance) {
                best = { points: [a, endA, endB, b], distance };
            }
        });
    });
    const route = best!;
    // drop zero-length steps (a stop sitting exactly on an aisle end)
    const points = route.points.filter(
        (point, index) => index === 0 || pointDistance(point, route.points[index - 1]) > 0.01
    );
    return { points: points.length >= 2 ? points : [a, b], distance: route.distance };
};

// ---------------------------------------------------------------------------
// Rack-free navigation graph
//
// routeThroughAisles bends a leg at the two aisle ends, but the hop BETWEEN those ends is a
// straight segment that can still cut across other racks. The nav graph fixes that: nodes are
// every aisle end plus a point extended past each end into the cross-corridor, edges exist only
// where the straight segment between two nodes crosses no rack rectangle, and a leg is the
// shortest node path between its two pick points (Dijkstra). Both the drawn polyline and the
// estimated distance follow that same rack-free path.
// ---------------------------------------------------------------------------

// Liang-Barsky: does segment a->b pass through the rectangle? The rect is shrunk by `eps` so a
// path that merely grazes a rack face (the walkway runs WALKWAY_CLEARANCE away) never hits.
export const segmentHitsRect = (a: Pt, b: Pt, rect: RectShape, eps = 0.05): boolean => {
    const xMin = rect.x + eps;
    const yMin = rect.y + eps;
    const xMax = rect.x + rect.w - eps;
    const yMax = rect.y + rect.d - eps;
    if (xMax <= xMin || yMax <= yMin) return false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t0 = 0;
    let t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [a.x - xMin, xMax - a.x, a.y - yMin, yMax - a.y];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return false;
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1) return false;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return false;
                if (t < t1) t1 = t;
            }
        }
    }
    return t0 <= t1;
};

// What a leg costs when the layout gives no legal way round a forbidden zone: the walk that is
// drawn crosses the zone, so it is not a route at all. It must never look cheap, or the
// optimizer would order the round through the wall on purpose; and it must stay finite, or the
// nearest-neighbour and 2-opt arithmetic would stop working. Same order of magnitude as the
// building-change tier: worse than any real detour inside a floor.
export const BLOCKED_CROSSING_PENALTY = 250;

// does the polyline cross any of these rectangles?
export const pathHitsRects = (points: Pt[], rects: RectShape[]): boolean => {
    if (rects.length === 0) return false;
    for (let i = 1; i < points.length; i++) {
        for (let j = 0; j < rects.length; j++) {
            if (segmentHitsRect(points[i - 1], points[i], rects[j])) return true;
        }
    }
    return false;
};

// how far past an aisle end the walkway is assumed to continue into the cross-corridor (the
// last rack sticks out ~cellW/2 past the end, so this must stay comfortably larger)
export const AISLE_EXIT_MARGIN = 1.5;

// Collapses the cells of one rack row into as few obstacles as possible: a run of touching
// cells is a single rectangle, which is exact (they are contiguous by construction) and is what
// keeps the visibility graph affordable — a 30 000-location block is ~2 000 cells but only a few
// dozen rows, and the graph costs O(nodes^2 x obstacles). Rows that are not axis-aligned keep
// their cells: a diagonal row's bounding box would swallow the corridors beside it. A gap wider
// than one cell also splits the run, so a real opening in a row stays walkable.
export const mergeRowRects = (rects: RectShape[]): RectShape[] => {
    if (rects.length < 2) return rects;
    const first = rects[0];
    const horizontal = rects.every((rect) => Math.abs(rect.y - first.y) < 0.01);
    const vertical = rects.every((rect) => Math.abs(rect.x - first.x) < 0.01);
    if (!horizontal && !vertical) return rects;
    const sorted = [...rects].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
    const merged: RectShape[] = [];
    let run = { ...sorted[0] };
    for (let index = 1; index < sorted.length; index++) {
        const rect = sorted[index];
        const runEnd = horizontal ? run.x + run.w : run.y + run.d;
        const start = horizontal ? rect.x : rect.y;
        const size = horizontal ? rect.w : rect.d;
        // touching (or overlapping) cells extend the run; a real gap starts a new one
        if (start <= runEnd + 0.01) {
            const end = Math.max(runEnd, start + size);
            if (horizontal) run.w = end - run.x;
            else run.d = end - run.y;
        } else {
            merged.push(run);
            run = { ...rect };
        }
    }
    merged.push(run);
    return merged;
};

// How far outside a forbidden zone its corner nodes sit. It must clear `segmentHitsRect`'s own
// eps (0.05) comfortably, or a node hugging the corner would be judged inside the rectangle it
// is meant to let the operator walk around; it must also stay small, so squeezing between a wall
// and a rack keeps working.
export const BLOCKED_CORNER_MARGIN = 0.35;

// The four points a walk can turn at to get round a forbidden zone. Without them the graph has
// no node beside a wall and Dijkstra simply finds no way past it — the leg would fall back to
// the aisle-ends heuristic and be drawn straight THROUGH the wall.
export const blockedZoneCorners = (rect: RectShape, margin = BLOCKED_CORNER_MARGIN): Pt[] => [
    { x: rect.x - margin, y: rect.y - margin },
    { x: rect.x + rect.w + margin, y: rect.y - margin },
    { x: rect.x - margin, y: rect.y + rect.d + margin },
    { x: rect.x + rect.w + margin, y: rect.y + rect.d + margin }
];

export type NavGraph = {
    nodes: Pt[];
    // adjacency: edges[i] = list of {to, d} — symmetric
    edges: { to: number; d: number }[][];
    obstacles: RectShape[];
    // the obstacles that may NEVER be relaxed, whatever stands inside them: the forbidden
    // zones. A rack row's box is an over-approximation for a diagonal row, so a stop legally
    // standing against it has to be let out (see routeOnNavGraph); a zone is exact and drawn by
    // hand, so a stop inside one is a configuration error, not a reason to open the wall.
    strict: Set<RectShape>;
};

const clearsAll = (a: Pt, b: Pt, obstacles: RectShape[]): boolean => {
    for (let i = 0; i < obstacles.length; i++) {
        if (segmentHitsRect(a, b, obstacles[i])) return false;
    }
    return true;
};

// Build the static walkway graph of one floor panel. Returns null when the layout is too big
// for the O(nodes^2 x rects) visibility pass — callers then fall back to routeThroughAisles.
export const buildNavGraph = (
    aisles: { from: Pt; to: Pt }[],
    obstacles: RectShape[],
    // turning points that are not aisle ends — the corners of the forbidden zones
    extraNodes: Pt[] = [],
    // obstacles that must hold even around an endpoint standing inside them
    strict: RectShape[] = []
): NavGraph | null => {
    const nodes: Pt[] = [...extraNodes];
    aisles.forEach((aisle) => {
        nodes.push(aisle.from, aisle.to);
        const length = pointDistance(aisle.from, aisle.to);
        if (length > 0.01) {
            const ux = (aisle.to.x - aisle.from.x) / length;
            const uy = (aisle.to.y - aisle.from.y) / length;
            nodes.push({
                x: aisle.from.x - ux * AISLE_EXIT_MARGIN,
                y: aisle.from.y - uy * AISLE_EXIT_MARGIN
            });
            nodes.push({
                x: aisle.to.x + ux * AISLE_EXIT_MARGIN,
                y: aisle.to.y + uy * AISLE_EXIT_MARGIN
            });
        }
    });
    if (nodes.length === 0) return null;
    if (nodes.length * nodes.length * Math.max(obstacles.length, 1) > 40_000_000) return null;
    const edges: { to: number; d: number }[][] = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (clearsAll(nodes[i], nodes[j], obstacles)) {
                const d = pointDistance(nodes[i], nodes[j]);
                edges[i].push({ to: j, d });
                edges[j].push({ to: i, d });
            }
        }
    }
    return { nodes, edges, obstacles, strict: new Set(strict) };
};

const simplifyPath = (points: Pt[]): Pt[] => {
    const kept: Pt[] = [];
    points.forEach((point) => {
        const last = kept[kept.length - 1];
        if (last && pointDistance(last, point) < 0.01) return;
        kept.push(point);
        while (kept.length >= 3) {
            const [p1, p2, p3] = kept.slice(-3);
            const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
            if (Math.abs(cross) > 0.001) break;
            kept.splice(kept.length - 2, 1);
        }
    });
    return kept;
};

// Shortest rack-free walk from a to b over the graph (both stop points join the graph through
// their own visibility edges, so a leg with direct line-of-sight stays a straight segment).
// Returns null when no rack-free path exists — the caller falls back to routeThroughAisles.
export const routeOnNavGraph = (
    graph: NavGraph,
    a: Pt,
    b: Pt
): { points: Pt[]; distance: number } | null => {
    // A stop stands right against its own rack, and a row that is not axis-aligned is covered by
    // an over-approximating box that can therefore swallow it. Such a box must not forbid the
    // stop from reaching the graph, so it is ignored while attaching the two ends — never while
    // walking the graph, where every obstacle still applies.
    const contains = (rect: RectShape, point: Pt): boolean =>
        point.x > rect.x &&
        point.x < rect.x + rect.w &&
        point.y > rect.y &&
        point.y < rect.y + rect.d;
    const endObstacles = graph.obstacles.filter(
        (rect) => graph.strict.has(rect) || (!contains(rect, a) && !contains(rect, b))
    );
    if (clearsAll(a, b, endObstacles)) {
        return { points: [a, b], distance: pointDistance(a, b) };
    }
    const total = graph.nodes.length + 2;
    const START = graph.nodes.length;
    const END = graph.nodes.length + 1;
    const startEdges: { to: number; d: number }[] = [];
    const endReach: (number | null)[] = graph.nodes.map(() => null);
    graph.nodes.forEach((node, index) => {
        if (clearsAll(a, node, endObstacles)) {
            startEdges.push({ to: index, d: pointDistance(a, node) });
        }
        if (clearsAll(node, b, endObstacles)) {
            endReach[index] = pointDistance(node, b);
        }
    });
    const dist = new Array<number>(total).fill(Infinity);
    const previous = new Array<number>(total).fill(-1);
    const done = new Array<boolean>(total).fill(false);
    dist[START] = 0;
    for (;;) {
        let current = -1;
        let best = Infinity;
        for (let i = 0; i < total; i++) {
            if (!done[i] && dist[i] < best) {
                best = dist[i];
                current = i;
            }
        }
        if (current === -1 || current === END) break;
        done[current] = true;
        const neighbours =
            current === START
                ? startEdges
                : graph.edges[current].concat(
                      endReach[current] !== null ? [{ to: END, d: endReach[current]! }] : []
                  );
        neighbours.forEach((edge) => {
            const candidate = dist[current] + edge.d;
            if (candidate < dist[edge.to]) {
                dist[edge.to] = candidate;
                previous[edge.to] = current;
            }
        });
    }
    if (!Number.isFinite(dist[END])) return null;
    const chain: Pt[] = [];
    for (let at = END; at !== -1; at = previous[at]) {
        chain.push(at === END ? b : at === START ? a : graph.nodes[at]);
    }
    chain.reverse();
    return { points: simplifyPath(chain), distance: dist[END] };
};

export type SitePos = {
    x: number;
    y: number;
    z: number;
    floor: number;
    buildingId: string;
    blockId: string;
    aisle: string;
};

export type BlockFrame = {
    blockId: string;
    buildingId: string;
    floor: number;
    layout: BlockLayout | null;
    buildingLayout: BuildingLayout | null;
};

// The segment of `aisle` that carries `column`. Falls back to the first segment when no segment
// claims it (a layout hand-edited into an inconsistent state must still draw something).
export const aisleSegmentFor = (
    layout: BlockLayout | null | undefined,
    aisle: string,
    column: string
): AisleDef | undefined => {
    const segments = layout?.aisles?.[aisle];
    if (!segments?.length) return undefined;
    return segments.find((segment) => segment.columns.includes(column)) ?? segments[0];
};

// every column an aisle has actually been laid with, across all of its segments
export const aisleLaidColumns = (segments: AisleDef[] | undefined): string[] => {
    const seen = new Set<string>();
    const columns: string[] = [];
    (segments ?? []).forEach((segment) =>
        segment.columns.forEach((column) => {
            if (seen.has(column)) return;
            seen.add(column);
            columns.push(column);
        })
    );
    return columns;
};

// The one canonical way to resolve a location to coordinates. Returns EVERY standing point the
// location offers — one per allowed pick side, primary first — so a caller free to choose (a
// route) can, while a caller that is not just takes the first. Empty when any link of the chain
// (cell, block frame) is missing: callers degrade per-entity, never crash.
// `local` is the point in the building frame (used to draw per-building panels); `site` adds
// the building's own placement (used for distances).
export const locateCellSides = (
    aisle: string,
    column: string,
    frame: BlockFrame
): Array<{ local: Pt; site: SitePos }> => {
    if (!frame.layout) return [];
    const cell = frame.layout.cells?.[aisle]?.[column];
    if (!cell) return [];
    // a stop is where the operator STANDS to pick: beside the location, in one of its corridors
    // — the corridor of the SEGMENT this column belongs to, which is what makes a split aisle
    // send the operator to the right stretch
    const def = aisleSegmentFor(frame.layout, aisle, column);
    const cellD = cell.d ?? frame.layout.cellDefaults?.d ?? DEFAULT_CELL.d;
    const stands = def
        ? cellAccessPoints({ x: cell.x, y: cell.y }, def, cellD)
        : [{ x: cell.x, y: cell.y }];
    const floorZ =
        frame.buildingLayout?.floors?.[String(frame.floor)]?.z ??
        frame.floor * DEFAULT_FLOOR_HEIGHT;
    const levelZ = 0; // per-level z (layout.levels) is display-only in v1
    return stands.map((stand) => {
        const local = localToParent(stand, frame.layout!.b);
        const site = frame.buildingLayout
            ? localToParent(local, frame.buildingLayout.site)
            : { ...local };
        return {
            local,
            site: {
                x: site.x,
                y: site.y,
                z: floorZ + levelZ,
                floor: frame.floor,
                buildingId: frame.buildingId,
                blockId: frame.blockId,
                aisle
            }
        };
    });
};

// the single canonical point of a location: its primary pick side
export const locateCell = (
    aisle: string,
    column: string,
    frame: BlockFrame
): { local: Pt; site: SitePos } | null => locateCellSides(aisle, column, frame)[0] ?? null;

// Tiered walking-distance estimate (meter-equivalents). Manhattan inside a block (axis-aligned
// racks make it more honest than euclidean); fixed penalties when a leg crosses a block, floor
// or building boundary. Deliberately simple: corridors are not modeled in v1 — the constants
// above are the accepted approximation, isolated here so a finer model can replace them later.
export const nodeDistance = (a: SitePos, b: SitePos): number => {
    const manhattan = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (a.buildingId !== b.buildingId) return manhattan + BUILDING_CHANGE_PENALTY;
    if (a.floor !== b.floor) {
        return manhattan + FLOOR_CHANGE_PENALTY * Math.abs(a.floor - b.floor);
    }
    if (a.blockId !== b.blockId) return manhattan + BLOCK_CHANGE_PENALTY;
    return manhattan;
};

// Cheapest choice of ONE option per step of an ordered chain, when the cost of a hop depends
// only on the two options it joins (here: which corridor each stop of a route is reached from,
// see `cellAccessPoints`). That is a shortest path through a layered graph, so a single forward
// Viterbi pass is EXACT — no enumeration of the 2^n combinations — and costs `steps` x
// `options^2` cost() calls. Returns the chosen index per step; ties keep the lower index, so a
// symmetric layout resolves to the primary side and re-running is idempotent.
export const chooseOptionChain = <T>(steps: T[][], cost: (a: T, b: T) => number): number[] => {
    if (steps.length === 0) return [];
    if (steps.some((options) => options.length === 0)) return steps.map(() => 0);
    let costs = steps[0].map(() => 0);
    const back: number[][] = [];
    for (let step = 1; step < steps.length; step++) {
        const previous = steps[step - 1];
        const nextCosts: number[] = [];
        const choice: number[] = [];
        steps[step].forEach((option) => {
            let best = Number.POSITIVE_INFINITY;
            let bestIndex = 0;
            previous.forEach((previousOption, previousIndex) => {
                const total = costs[previousIndex] + cost(previousOption, option);
                if (total < best - 1e-9) {
                    best = total;
                    bestIndex = previousIndex;
                }
            });
            nextCosts.push(best);
            choice.push(bestIndex);
        });
        costs = nextCosts;
        back.push(choice);
    }
    const picked = new Array<number>(steps.length).fill(0);
    let cursor = 0;
    costs.forEach((value, index) => {
        if (value < costs[cursor] - 1e-9) cursor = index;
    });
    picked[steps.length - 1] = cursor;
    for (let step = steps.length - 1; step > 0; step--) {
        cursor = back[step - 1][cursor];
        picked[step - 1] = cursor;
    }
    return picked;
};

// Greedy nearest-neighbor + bounded 2-opt over placeable nodes. Unplaced nodes (getPoint ->
// null) keep their relative order at the tail — the algorithm never interleaves guesses.
// Ties break on the incoming order, so re-running on an already-optimal list is a no-op.
// `distanceFn` lets the caller plug the aisle-routed walking distance; defaults to the tiered
// Manhattan estimate.
export const optimizeRoute = <T>(
    nodes: T[],
    getPoint: (node: T) => SitePos | null,
    start?: Pt | null,
    distanceFn: (a: SitePos, b: SitePos) => number = nodeDistance
): T[] => {
    const placed: { node: T; point: SitePos; index: number }[] = [];
    const unplaced: T[] = [];
    nodes.forEach((node, index) => {
        const point = getPoint(node);
        if (point) placed.push({ node, point, index });
        else unplaced.push(node);
    });
    if (placed.length <= 1) return [...placed.map((entry) => entry.node), ...unplaced];

    const remaining = [...placed];
    const tour: { node: T; point: SitePos; index: number }[] = [];
    let cursor: { x: number; y: number } | null = start ?? null;
    let current: SitePos | null = null;
    while (remaining.length > 0) {
        let bestIdx = 0;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let i = 0; i < remaining.length; i++) {
            const candidate = remaining[i];
            let score: number;
            if (current) {
                score = distanceFn(current, candidate.point);
            } else if (cursor) {
                score =
                    Math.abs(cursor.x - candidate.point.x) + Math.abs(cursor.y - candidate.point.y);
            } else {
                score = candidate.index;
            }
            // stable tie-break on the incoming order keeps the result idempotent
            if (
                score < bestScore ||
                (score === bestScore && candidate.index < remaining[bestIdx].index)
            ) {
                bestScore = score;
                bestIdx = i;
            }
        }
        const next = remaining.splice(bestIdx, 1)[0];
        tour.push(next);
        current = next.point;
        cursor = null;
    }

    // 2-opt polish. Reversing a span flips EVERY leg inside it, so judging the move on its four
    // endpoints alone is only valid while those inner legs cost the same in both directions.
    // Inside one (building, floor) the routed distance is symmetric; across zones it need not be
    // (a door can be entry-only, so the way back is longer), and a flat-penalty leg must never be
    // reversed anyway. The span is therefore required to stay inside a single RUN of consecutive
    // stops sharing one panel: run ids are non-decreasing along the tour, so `runId[i] ===
    // runId[j + 1]` means every stop between them is on that same panel. A reversal inside a run
    // cannot move a run boundary, so the ids stay valid across sweeps.
    // Bounded iterations keep it sub-millisecond at n <= ~500.
    const samePanel = (a: SitePos, b: SitePos): boolean =>
        a.buildingId === b.buildingId && a.floor === b.floor;
    const runId: number[] = [];
    tour.forEach((entry, index) => {
        if (index === 0) runId.push(0);
        else {
            const previous = runId[index - 1];
            runId.push(samePanel(tour[index - 1].point, entry.point) ? previous : previous + 1);
        }
    });
    const legLength = (i: number, j: number): number => distanceFn(tour[i].point, tour[j].point);
    let improved = true;
    let guard = 0;
    while (improved && guard < 500) {
        improved = false;
        guard++;
        for (let i = 0; i < tour.length - 2; i++) {
            for (let j = i + 2; j < tour.length - 1; j++) {
                if (runId[i] !== runId[j + 1]) continue;
                const before = legLength(i, i + 1) + legLength(j, j + 1);
                const after = legLength(i, j) + legLength(i + 1, j + 1);
                if (after < before - 1e-9) {
                    let left = i + 1;
                    let right = j;
                    while (left < right) {
                        const swap = tour[left];
                        tour[left] = tour[right];
                        tour[right] = swap;
                        left++;
                        right--;
                    }
                    improved = true;
                }
            }
        }
    }

    return [...tour.map((entry) => entry.node), ...unplaced];
};

// ---------------------------------------------------------------------------
// Access points
// ---------------------------------------------------------------------------

// The floor immediately above (step 1) or below (step -1) `floor`, among the floors the building
// actually has. Numbering can have holes (a removed mezzanine, a basement at -2), so the
// neighbour is the closest existing level in that direction — never floor +/- 1 assumed.
export const adjacentFloor = (floors: number[], floor: number, step: 1 | -1): number | null => {
    let best: number | null = null;
    floors.forEach((candidate) => {
        if (step === 1 ? candidate <= floor : candidate >= floor) return;
        if (best === null || (step === 1 ? candidate < best : candidate > best)) best = candidate;
    });
    return best;
};

export type PlacedAccessPoint = {
    point: AccessPoint;
    // direction AS SEEN FROM the floor this is drawn on: the counterpart of a point that leads
    // up is a landing you come back DOWN from, whatever the source point declares
    direction: AccessDirection;
    // set on the automatic counterpart of a point placed on another floor (never stored)
    mirrorOf?: { id: string; floor: number };
};

// Every access point visible on one floor of a building: those placed there, plus the automatic
// counterpart of each floor access on the adjacent floor it leads to. A point declared "both"
// therefore shows up on the floor above AND on the floor below, each time as the way back.
export const accessPointsOnFloor = (
    layout: BuildingLayout | null | undefined,
    floor: number,
    floors: number[]
): PlacedAccessPoint[] => {
    const placed: PlacedAccessPoint[] = [];
    (layout?.access ?? []).forEach((point) => {
        if (point.floor === floor) {
            placed.push({ point, direction: point.direction });
            return;
        }
        if (point.kind !== 'floor') return;
        const leadsUp = point.direction === 'up' || point.direction === 'both';
        const leadsDown = point.direction === 'down' || point.direction === 'both';
        if (leadsUp && adjacentFloor(floors, point.floor, 1) === floor) {
            placed.push({
                point,
                direction: 'down',
                mirrorOf: { id: point.id, floor: point.floor }
            });
        }
        if (leadsDown && adjacentFloor(floors, point.floor, -1) === floor) {
            placed.push({ point, direction: 'up', mirrorOf: { id: point.id, floor: point.floor } });
        }
    });
    return placed;
};

// default footprint of a freshly dropped forbidden zone: a short wall segment
export const DEFAULT_BLOCKED_SIZE = { w: 4, d: 1 };

// next free `bzN` id of a block — same clock-free, random-free minting as the access points
export const nextBlockedZoneId = (zones: BlockedZone[] | undefined): string => {
    let max = 0;
    (zones ?? []).forEach((zone) => {
        const match = /^bz(\d+)$/.exec(zone.id);
        if (match) max = Math.max(max, Number(match[1]));
    });
    let id = `bz${max + 1}`;
    const used = new Set((zones ?? []).map((zone) => zone.id));
    while (used.has(id)) id = `${id}_`;
    return id;
};

// next free `apN` id of a building — stable, human-readable, and free of any clock or random
// source (the same gesture replayed produces the same id)
export const nextAccessPointId = (points: AccessPoint[] | undefined): string => {
    let max = 0;
    (points ?? []).forEach((point) => {
        const match = /^ap(\d+)$/.exec(point.id);
        if (match) max = Math.max(max, Number(match[1]));
    });
    let id = `ap${max + 1}`;
    const used = new Set((points ?? []).map((point) => point.id));
    while (used.has(id)) id = `${id}_`;
    return id;
};

// ---------------------------------------------------------------------------
// Access graph — how the operator actually leaves a floor or a building
// ---------------------------------------------------------------------------
//
// Without configured access points a leg that changes floor or building costs a flat penalty and
// is drawn as a symbolic stub: the operator is assumed to teleport. With them, the walk is real —
// reach a staircase, climb it, walk to the door, cross the site, come in. That is a shortest path
// in a small directed graph whose nodes are the access points, so it is precomputed ONCE per
// screen (or per function run) and every leg is then a lookup.
//
// FAIL-OPEN is the rule, as everywhere else in this feature: a warehouse with no access points, a
// zone that has none, or two zones with no path between them all fall back to `nodeDistance`, so
// an unconfigured (or half-configured) warehouse behaves exactly as it did before.

// One access point AS SEEN ON ONE FLOOR. A floor access therefore yields several nodes: its own,
// plus one on each adjacent floor it links (what `accessPointsOnFloor` draws as the way back).
export type AccessNode = {
    key: string;
    buildingId: string;
    pointId: string;
    floor: number;
    kind: AccessPointKind;
    // building frame: what the per-building route panels draw in
    local: Pt;
    // false on the counterpart a floor access projects onto an adjacent floor. Two counterparts
    // of the SAME point are two different floors reached through it, never a shortcut between
    // each other: the climb always passes through the floor the point was declared on.
    own: boolean;
    // site frame: the whole graph measures in it, so a leg crossing buildings needs no rebasing.
    // Inside one building it is a pure translation of the building frame, and Manhattan distance
    // is translation-invariant, so in-building costs are unchanged by using it.
    site: Pt;
    // building accesses only, and only in the direction they were declared for
    canEnter: boolean;
    canLeave: boolean;
};

export type AccessGraph = {
    nodes: AccessNode[];
    // `${buildingId}|${floor}` -> node indices, the ways in and out of that zone
    zones: { [zone: string]: number[] };
    dist: number[][];
    next: number[][];
};

// above this, the all-pairs pass is not worth its cost on either side (see buildAccessGraph)
export const ACCESS_GRAPH_MAX_NODES = 400;

export type AccessBuilding = {
    id: string;
    layout: BuildingLayout | null | undefined;
    // the floors this building actually has: `adjacentFloor` picks the neighbour from them, so a
    // hole in the numbering is skipped instead of breaking the link
    floors: number[];
};

export const zoneKey = (buildingId: string, floor: number): string => `${buildingId}|${floor}`;

const manhattan = (a: Pt, b: Pt): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Build the site-wide access graph. Returns null when there is nothing to route through, which is
// the signal to keep the flat-penalty behaviour.
export const buildAccessGraph = (buildings: AccessBuilding[]): AccessGraph | null => {
    const nodes: AccessNode[] = [];
    buildings.forEach((building) => {
        const layout = building.layout;
        if (!layout?.access) return;
        // A floor somebody placed a point on exists, whatever the caller's list says: union it
        // in, or a staircase declared on a level with no block would be linked to the wrong
        // neighbour.
        const floors = Array.from(
            new Set([...building.floors, ...layout.access.map((point) => point.floor)])
        ).sort((a, b) => a - b);
        layout.access.forEach((point) => {
            const local: Pt = { x: point.x, y: point.y };
            const site = localToParent(local, layout.site);
            const push = (floor: number, own: boolean) => {
                nodes.push({
                    key: `${building.id}|${point.id}|${floor}`,
                    buildingId: building.id,
                    pointId: point.id,
                    floor,
                    kind: point.kind,
                    local,
                    site,
                    own,
                    canEnter:
                        own &&
                        point.kind === 'building' &&
                        (point.direction === 'in' || point.direction === 'both'),
                    canLeave:
                        own &&
                        point.kind === 'building' &&
                        (point.direction === 'out' || point.direction === 'both')
                });
            };
            push(point.floor, true);
            if (point.kind !== 'floor') return;
            // a floor access links its floor to the adjacent one(s) it was declared for; the link
            // itself is walkable both ways (the counterpart IS the way back)
            if (point.direction === 'up' || point.direction === 'both') {
                const above = adjacentFloor(floors, point.floor, 1);
                if (above !== null) push(above, false);
            }
            if (point.direction === 'down' || point.direction === 'both') {
                const below = adjacentFloor(floors, point.floor, -1);
                if (below !== null) push(below, false);
            }
        });
    });
    if (nodes.length === 0) return null;
    // Same posture as buildNavGraph's nodes^2 x obstacles guard: refuse rather than spend. The
    // all-pairs pass below is O(N^3), and it also runs in pure CPython inside the standard
    // function (no numpy on that Lambda layer) — measured ~1.1 s at N = 300 there. A site big
    // enough to blow past this keeps the flat estimate, which is what it had before.
    if (nodes.length > ACCESS_GRAPH_MAX_NODES) return null;
    // Canonical order, independent of any Map/dict iteration: the tie-breaks below (and in the
    // Python port of this function) then resolve identically, so the screen and the server agree.
    nodes.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const size = nodes.length;
    const dist: number[][] = [];
    const next: number[][] = [];
    for (let i = 0; i < size; i++) {
        dist.push(new Array<number>(size).fill(Number.POSITIVE_INFINITY));
        next.push(new Array<number>(size).fill(-1));
        dist[i][i] = 0;
        next[i][i] = i;
    }
    const link = (i: number, j: number, cost: number) => {
        if (cost < dist[i][j]) {
            dist[i][j] = cost;
            next[i][j] = j;
        }
    };
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (i === j) continue;
            const a = nodes[i];
            const b = nodes[j];
            if (a.buildingId === b.buildingId) {
                if (a.floor === b.floor) {
                    // walking across one floor of one building
                    link(i, j, manhattan(a.site, b.site));
                } else if (a.pointId === b.pointId && (a.own || b.own)) {
                    // the two ends of one flight of one staircase / lift. A point declared "both"
                    // projects a counterpart above AND below: those two are joined THROUGH the
                    // declaring floor (two flights, two penalties), never directly.
                    link(i, j, FLOOR_CHANGE_PENALTY);
                }
            } else if (a.canLeave && b.canEnter) {
                // out of one building, across the site, into another
                link(i, j, manhattan(a.site, b.site) + BUILDING_CHANGE_PENALTY);
            }
        }
    }
    for (let k = 0; k < size; k++) {
        for (let i = 0; i < size; i++) {
            if (!Number.isFinite(dist[i][k])) continue;
            for (let j = 0; j < size; j++) {
                const candidate = dist[i][k] + dist[k][j];
                if (candidate < dist[i][j]) {
                    dist[i][j] = candidate;
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    const zones: { [zone: string]: number[] } = {};
    nodes.forEach((node, index) => {
        const key = zoneKey(node.buildingId, node.floor);
        if (!zones[key]) zones[key] = [];
        zones[key].push(index);
    });
    return { nodes, zones, dist, next };
};

export type AccessRoute = { distance: number; via: AccessNode[] };

// The cheapest pair of (way out of a's zone, way into b's zone), or null when the graph is not
// this pair's business or cannot serve it. Split out of `accessRoute` on purpose: the optimizer
// asks for the COST O(n^2) times and never looks at the chain, so reconstructing one there
// would double the price of the hottest function on both the screen and the Lambda.
const accessBestPair = (
    a: SitePos,
    b: SitePos,
    graph: AccessGraph | null
): { distance: number; exit: number; entry: number } | null => {
    if (!graph) return null;
    if (a.buildingId === b.buildingId && a.floor === b.floor) return null;
    const exits = graph.zones[zoneKey(a.buildingId, a.floor)];
    const entries = graph.zones[zoneKey(b.buildingId, b.floor)];
    if (!exits?.length || !entries?.length) return null;
    let best = Number.POSITIVE_INFINITY;
    let bestExit = -1;
    let bestEntry = -1;
    for (let i = 0; i < exits.length; i++) {
        const exit = exits[i];
        const exitSite = graph.nodes[exit].site;
        const toExit = Math.abs(a.x - exitSite.x) + Math.abs(a.y - exitSite.y);
        const row = graph.dist[exit];
        for (let j = 0; j < entries.length; j++) {
            const entry = entries[j];
            const middle = row[entry];
            if (!Number.isFinite(middle)) continue;
            const entrySite = graph.nodes[entry].site;
            const total =
                toExit + middle + Math.abs(entrySite.x - b.x) + Math.abs(entrySite.y - b.y);
            // strict improvement over a canonical node order: ties keep the lower pair, so the
            // result is idempotent and identical in the Python port
            if (total < best) {
                best = total;
                bestExit = exit;
                bestEntry = entry;
            }
        }
    }
    if (bestExit < 0 || !Number.isFinite(best)) return null;
    return { distance: best, exit: bestExit, entry: bestEntry };
};

// cost only — what the metrics and the optimizer use
export const accessDistance = (a: SitePos, b: SitePos, graph: AccessGraph | null): number | null =>
    accessBestPair(a, b, graph)?.distance ?? null;

// Cheapest real walk from `a` to `b` through the access points, or null when the pair is not the
// graph's business (same zone) or the graph cannot serve it (no access point in one of the two
// zones, no path between them) — the caller then keeps the flat-penalty estimate.
export const accessRoute = (
    a: SitePos,
    b: SitePos,
    graph: AccessGraph | null
): AccessRoute | null => {
    const best = accessBestPair(a, b, graph);
    if (!best || !graph) return null;
    const via: AccessNode[] = [];
    let cursor = best.exit;
    // guard: `next` is consistent by construction, but never loop forever on a corrupted matrix
    for (let step = 0; step <= graph.nodes.length && cursor !== -1; step++) {
        via.push(graph.nodes[cursor]);
        if (cursor === best.entry) break;
        cursor = graph.next[cursor][best.entry];
    }
    return { distance: best.distance, via };
};

export const accessAwareDistance = (a: SitePos, b: SitePos, graph: AccessGraph | null): number => {
    const routed = accessDistance(a, b, graph);
    if (routed !== null) return routed;
    const flat = nodeDistance(a, b);
    // A pair the graph SERVES but cannot join is a configured impossibility — an entrance-only
    // door, a staircase that only goes up — not missing data. Falling back to the flat estimate
    // there would make the FORBIDDEN direction cheaper than the allowed one (the allowed one
    // pays the real detour through the door, the forbidden one pays a straight line), and the
    // optimizer would happily send the operator the wrong way through it. Charging the blocked
    // direction at least what the way back costs removes that inversion without inventing a
    // penalty constant.
    const back = accessDistance(b, a, graph);
    return back !== null ? Math.max(flat, back) : flat;
};

// All-or-nothing gate. A configured hop always costs at least the flat estimate of the same
// pair (triangle inequality: the detour through a door cannot be shorter than the straight
// line), so mixing the two models inside one round would make the floors somebody bothered to
// equip look artificially expensive and push the route towards the ones nobody configured.
// The graph is therefore used only when EVERY zone the round visits is served by it; otherwise
// the whole round keeps the historical estimate, exactly as before.
export const accessGraphCoversZones = (
    graph: AccessGraph | null,
    zones: Array<{ buildingId: string; floor: number }>
): boolean =>
    !!graph &&
    zones.every((zone) => (graph.zones[zoneKey(zone.buildingId, zone.floor)]?.length ?? 0) > 0);

// ---------------------------------------------------------------------------
// Column drift
// ---------------------------------------------------------------------------

export type AisleColumnDrift = { added: string[]; removed: string[] };

// What a laid aisle would gain/lose if its columns were re-read from the locations right now.
// `cells` is materialized when the aisle is laid and never re-derived on its own, so a column
// created (or deleted) afterwards is invisible to every reader until someone resynchronises.
// A set difference — not a length comparison — so a rename (one in, one out) is caught too.
// `live` null/undefined means "not fetched": no drift can be claimed, ever.
export const aisleColumnDrift = (
    stored: string[],
    live: string[] | null | undefined
): AisleColumnDrift | null => {
    if (!live) return null;
    const storedSet = new Set(stored);
    const liveSet = new Set(live);
    const added = live.filter((column) => !storedSet.has(column));
    const removed = stored.filter((column) => !liveSet.has(column));
    if (added.length === 0 && removed.length === 0) return null;
    return { added, removed };
};

// Auto-grid fallback used by the editor tray and the route screen when an entity has no
// layout yet: deterministic non-overlapping default positions derived from the sort order.
export const autoGridRect = (
    index: number,
    size: { w: number; d: number },
    perRow = 4,
    gap = 8
): RectShape => ({
    x: roundCoord((index % perRow) * (size.w + gap)),
    y: roundCoord(Math.floor(index / perRow) * (size.d + gap)),
    w: size.w,
    d: size.d
});

// The column is jsonb, and PostgreSQL refuses \u0000 in a jsonb string ("unsupported Unicode
// escape sequence") where the old json column accepted it — a NUL pasted into a zone or door
// name would fail the save of the WHOLE entity with a raw driver error. Strip the control
// characters from what the user types. Keys are left alone on purpose: an aisle or column key is
// a location value, and rewriting it would break the match with the locations it names.
// eslint-disable-next-line no-control-regex -- stripping control characters IS the point here
const sanitizeLabel = (value: string): string => value.replace(/[\u0000-\u001f\u007f]/g, '');

// Every optional top-level key is emitted even when empty — see the WRITE CONTRACT at the top
// of this file: an omitted key would keep whatever the column already holds, so deleting the
// last access point would silently restore the previous ones.
export const buildBuildingLayout = (site: RectShape, previous?: BuildingLayout | null): any => ({
    v: LAYOUT_VERSION,
    unit: previous?.unit ?? 'm',
    site: { ...site },
    floors: previous?.floors ?? null,
    access: (previous?.access ?? []).map((point) => {
        const serialized: any = {
            id: point.id,
            kind: point.kind,
            x: point.x,
            y: point.y,
            floor: point.floor,
            direction: point.direction
        };
        if (point.name) serialized.name = sanitizeLabel(point.name);
        return serialized;
    })
});

// Same rule as buildBuildingLayout: every optional top-level key is always present, so a write
// fully determines the stored document despite the one-level merge (WRITE CONTRACT, top of file).
export const buildBlockLayout = (layout: BlockLayout): any => {
    const serialized: any = {
        v: LAYOUT_VERSION,
        b: { ...layout.b },
        cellDefaults: layout.cellDefaults ? { ...layout.cellDefaults } : null,
        entry: layout.entry ? [...layout.entry] : null,
        levels:
            layout.levels && Object.keys(layout.levels).length > 0 ? { ...layout.levels } : null,
        aisles: {},
        cells: {},
        blocked: []
    };
    if (layout.aisles && Object.keys(layout.aisles).length > 0) {
        Object.keys(layout.aisles).forEach((aisle) => {
            const segments = layout.aisles![aisle].map((def) => {
                const serializedDef: any = {
                    from: [...def.from],
                    to: [...def.to],
                    columns: [...def.columns]
                };
                if (def.pitch) serializedDef.pitch = def.pitch;
                if (def.reversed) serializedDef.reversed = true;
                if (def.cellW) serializedDef.cellW = def.cellW;
                if (def.cellD) serializedDef.cellD = def.cellD;
                if (def.sides && def.sides !== 'both') serializedDef.sides = def.sides;
                return serializedDef;
            });
            if (segments.length === 0) return;
            // a single-segment aisle keeps the historical bare-object shape, so re-saving a
            // layout drawn before segments existed changes nothing in the stored document
            serialized.aisles[aisle] = segments.length === 1 ? segments[0] : segments;
        });
    }
    if (layout.blocked && layout.blocked.length > 0) {
        serialized.blocked = layout.blocked.map((zone) => {
            const entry: any = { id: zone.id, x: zone.x, y: zone.y, w: zone.w, d: zone.d };
            if (zone.name) entry.name = sanitizeLabel(zone.name);
            return entry;
        });
    }
    if (layout.cells && Object.keys(layout.cells).length > 0) {
        Object.keys(layout.cells).forEach((aisle) => {
            serialized.cells[aisle] = {};
            Object.keys(layout.cells![aisle]).forEach((column) => {
                serialized.cells[aisle][column] = { ...layout.cells![aisle][column] };
            });
        });
    }
    return serialized;
};
