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
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useCallback, useEffect, useRef, useState } from 'react';

// data semantics shared by the hooks below (same contract as LocationsOccupancy/hooks.ts):
// undefined = not fetched yet, null = fetch error. `t` changes identity on every render, so the
// async error paths read it through a ref instead of widening the dependency arrays.

export type BuildingRow = {
    id: string;
    name: string;
    // the `layout` jsonb column, raw as the API returns it
    layout: any;
    modified: string | null;
};

export type BlockRow = {
    id: string;
    name: string;
    level: number;
    buildingId: string;
    // the `layout` jsonb column, raw as the API returns it
    layout: any;
    modified: string | null;
};

// `layout` never goes through the generic list layer (it would drag the JSON blob into every
// screen); the cartography module fetches it with its own inline queries, by id/parent only —
// never filtered server-side.
// The block list is fetched WITHOUT its layouts: a production block holds a few thousand cells,
// so pulling `layout` for every block of the warehouse would drag megabytes into a screen that
// only ever draws one building at a time. Buildings keep theirs (a site rect is a few bytes) and
// block layouts are fetched per building, on demand, by `fetchBuildingLayouts` below.
const cartographyEntitiesQuery = gql`
    query cartographyEntities {
        buildings(itemsPerPage: 10000, orderBy: [{ field: "name", ascending: true }]) {
            count
            results {
                id
                name
                layout
                modified
            }
        }
        blocks(itemsPerPage: 10000, orderBy: [{ field: "name", ascending: true }]) {
            count
            results {
                id
                name
                level
                buildingId
                modified
            }
        }
    }
`;

const blockLayoutsQuery = gql`
    query cartographyBlockLayouts($filters: BlockSearchFilters) {
        blocks(filters: $filters, itemsPerPage: 10000) {
            results {
                id
                name
                level
                buildingId
                layout
                modified
            }
        }
    }
`;

export const useCartographyData = (enabled: boolean) => {
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [buildings, setBuildings] = useState<BuildingRow[] | null | undefined>(undefined);
    const [blocks, setBlocks] = useState<BlockRow[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef(0);

    const fetchAll = useCallback(async () => {
        // fail closed: menu gating alone doesn't stop a direct URL hit — never fetch without READ
        if (!enabled) return;
        const seq = ++seqRef.current;
        setIsLoading(true);
        try {
            const response: any = await graphqlRequestClient.request(cartographyEntitiesQuery);
            if (seq === seqRef.current) {
                setBuildings(response?.buildings?.results ?? []);
                setBlocks(response?.blocks?.results ?? []);
            }
        } catch (error) {
            console.log(error);
            if (seq === seqRef.current) {
                setBuildings(null);
                setBlocks(null);
                showError(tRef.current('messages:error-getting-data'));
            }
        } finally {
            if (seq === seqRef.current) setIsLoading(false);
        }
    }, [graphqlRequestClient, enabled]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // layouts of one building's blocks, loaded when the editor actually opens that building
    const fetchBuildingLayouts = useCallback(
        async (buildingId: string): Promise<BlockRow[] | null> => {
            if (!enabled) return null;
            try {
                const response: any = await graphqlRequestClient.request(blockLayoutsQuery, {
                    filters: { buildingId }
                });
                return response?.blocks?.results ?? [];
            } catch (error) {
                console.log(error);
                showError(tRef.current('messages:error-getting-data'));
                return null;
            }
        },
        [graphqlRequestClient, enabled]
    );

    return { buildings, blocks, isLoading, reload: fetchAll, fetchBuildingLayouts };
};

export type BlockCellRow = { aisle: string | null; column: string | null };

// Grouped aggregate (same trick as the occupancy screen): passing `functions` makes the API
// GROUP BY the selected scalars, so a block with thousands of locations returns at most a few
// hundred (aisle, column) rows.
const blockCellsQuery = gql`
    query cartographyBlockCells($filters: LocationSearchFilters, $functions: [JSON!]) {
        locations(filters: $filters, functions: $functions, itemsPerPage: 50000) {
            count
            results {
                aisle
                column
                functionCount
            }
        }
    }
`;

export const useBlockCells = () => {
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [rows, setRows] = useState<BlockCellRow[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef(0);

    const fetchBlock = useCallback(
        async (blockId: string) => {
            const seq = ++seqRef.current;
            setIsLoading(true);
            try {
                const response: any = await graphqlRequestClient.request(blockCellsQuery, {
                    filters: { blockId },
                    functions: [{ function: 'count', fields: ['id'] }]
                });
                if (seq === seqRef.current) setRows(response?.locations?.results ?? []);
            } catch (error) {
                console.log(error);
                if (seq === seqRef.current) {
                    setRows(null);
                    showError(tRef.current('messages:error-getting-data'));
                }
            } finally {
                if (seq === seqRef.current) setIsLoading(false);
            }
        },
        [graphqlRequestClient]
    );

    const reset = useCallback(() => {
        seqRef.current++;
        setRows(undefined);
        setIsLoading(false);
    }, []);

    return { rows, isLoading, fetchBlock, reset };
};

const buildingsFreshnessQuery = gql`
    query cartographyBuildingsFreshness($filters: BuildingSearchFilters) {
        buildings(filters: $filters, itemsPerPage: 1000) {
            results {
                id
                modified
                modifiedBy
            }
        }
    }
`;

const blocksFreshnessQuery = gql`
    query cartographyBlocksFreshness($filters: BlockSearchFilters) {
        blocks(filters: $filters, itemsPerPage: 1000) {
            results {
                id
                modified
                modifiedBy
            }
        }
    }
`;

// The layout goes to the dedicated `layout` jsonb column. The generic update shallow-merges a
// JSON field one level deep, which here means the TOP-LEVEL KEYS OF THE LAYOUT ITSELF: only a
// document carrying every one of them fully determines what ends up stored — which is exactly
// what `buildBlockLayout` / `buildBuildingLayout` produce (see the WRITE CONTRACT in
// layoutModel.ts). `layout: null` clears the column, and is how "remove from map" is written.
const updateBuildingLayoutMutation = gql`
    mutation cartographyUpdateBuilding($id: String!, $input: UpdateBuildingInput!) {
        updateBuilding(id: $id, input: $input) {
            id
            modified
        }
    }
`;

const updateBlocksLayoutMutation = gql`
    mutation cartographyUpdateBlocks(
        $ids: [String!]!
        $input: UpdateBlockInput!
        $bulkUpdates: [BulkUpdateBlockInput!]
    ) {
        updateBlocks(ids: $ids, input: $input, bulkUpdates: $bulkUpdates)
    }
`;

export type LayoutWrite = { id: string; layout: any | null; modified: string | null };

export type SaveConflict = {
    kind: 'building' | 'block';
    id: string;
    modified: string | null;
    modifiedBy: string | null;
};

export type SaveResult =
    | { status: 'conflict'; conflicts: SaveConflict[] }
    | {
          status: 'ok';
          buildingModified: { [id: string]: string | null };
          blockModified: { [id: string]: string | null };
      };

export const useSaveLayout = () => {
    const { graphqlRequestClient } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // Compare-and-warn on `modified`: there is no server-side CAS, so last-writer-wins is the
    // floor — this closes the realistic gap (two cartographers on the same block). `force`
    // skips the check after the user explicitly chose to overwrite.
    const save = useCallback(
        async (
            buildings: LayoutWrite[],
            blocks: LayoutWrite[],
            force?: boolean
        ): Promise<SaveResult> => {
            setIsSaving(true);
            try {
                if (!force) {
                    const conflicts: SaveConflict[] = [];
                    if (buildings.length > 0) {
                        const response: any = await graphqlRequestClient.request(
                            buildingsFreshnessQuery,
                            { filters: { id: buildings.map((entry) => entry.id) } }
                        );
                        const serverById = new Map<string, any>(
                            (response?.buildings?.results ?? []).map((row: any) => [row.id, row])
                        );
                        buildings.forEach((entry) => {
                            const server = serverById.get(entry.id);
                            if (server && server.modified !== entry.modified) {
                                conflicts.push({
                                    kind: 'building',
                                    id: entry.id,
                                    modified: server.modified ?? null,
                                    modifiedBy: server.modifiedBy ?? null
                                });
                            }
                        });
                    }
                    if (blocks.length > 0) {
                        const response: any = await graphqlRequestClient.request(
                            blocksFreshnessQuery,
                            { filters: { id: blocks.map((entry) => entry.id) } }
                        );
                        const serverById = new Map<string, any>(
                            (response?.blocks?.results ?? []).map((row: any) => [row.id, row])
                        );
                        blocks.forEach((entry) => {
                            const server = serverById.get(entry.id);
                            if (server && server.modified !== entry.modified) {
                                conflicts.push({
                                    kind: 'block',
                                    id: entry.id,
                                    modified: server.modified ?? null,
                                    modifiedBy: server.modifiedBy ?? null
                                });
                            }
                        });
                    }
                    if (conflicts.length > 0) return { status: 'conflict', conflicts };
                }

                const buildingModified: { [id: string]: string | null } = {};
                for (const entry of buildings) {
                    const response: any = await graphqlRequestClient.request(
                        updateBuildingLayoutMutation,
                        { id: entry.id, input: { layout: entry.layout } }
                    );
                    buildingModified[entry.id] = response?.updateBuilding?.modified ?? null;
                }

                const blockModified: { [id: string]: string | null } = {};
                if (blocks.length > 0) {
                    // one HTTP round-trip for N different per-block payloads
                    const bulkResponse: any = await graphqlRequestClient.request(
                        updateBlocksLayoutMutation,
                        {
                            ids: ['BULK'],
                            input: {},
                            bulkUpdates: blocks.map((entry) => ({
                                ids: [entry.id],
                                input: { layout: entry.layout }
                            }))
                        }
                    );
                    if (bulkResponse?.updateBlocks !== true) {
                        throw new Error('updateBlocks returned false');
                    }
                    const response: any = await graphqlRequestClient.request(blocksFreshnessQuery, {
                        filters: { id: blocks.map((entry) => entry.id) }
                    });
                    (response?.blocks?.results ?? []).forEach((row: any) => {
                        blockModified[row.id] = row.modified ?? null;
                    });
                }

                return { status: 'ok', buildingModified, blockModified };
            } finally {
                setIsSaving(false);
            }
        },
        [graphqlRequestClient]
    );

    return { save, isSaving };
};

export type RouteRaa = {
    id: string;
    roundOrderId: number | null;
    quantity: number | null;
    status: number | null;
    statusText: string | null;
    locationId: string | null;
    location: {
        id: string;
        name: string;
        aisle: string | null;
        column: string | null;
        level: string | null;
        position: string | null;
        blockId: string;
    } | null;
    handlingUnitContentId: string | null;
    roundLineDetail: {
        roundLine: { article: { id: string; name: string } | null } | null;
    } | null;
};

export type RouteRound = {
    id: string;
    name: string | null;
    status: number;
    statusText: string | null;
    monoBloc: boolean | null;
    equipment: { id: string; name: string | null; patternId: string | null } | null;
};

export type RouteBlock = {
    id: string;
    name: string;
    level: number;
    buildingId: string;
    layout: any;
    building: { id: string; name: string; layout: any } | null;
};

const routeRoundQuery = gql`
    query routeAnalysisRound($id: String!, $language: String) {
        round(id: $id, language: $language) {
            id
            name
            status
            statusText
            monoBloc
            equipment {
                id
                name
                patternId
            }
        }
    }
`;

// Top-level paginated resolver (not the nested round.roundAdvisedAddresses field) so hundreds
// of rows can never be silently truncated; the selection stays deliberately shallow — block and
// building layouts would otherwise be repeated once per RAA.
const routeRaasQuery = gql`
    query routeAnalysisRaas(
        $filters: RoundAdvisedAddressSearchFilters
        $page: Int
        $itemsPerPage: Int
        $language: String
    ) {
        roundAdvisedAddresses(
            filters: $filters
            orderBy: [{ field: "roundOrderId", ascending: true }]
            page: $page
            itemsPerPage: $itemsPerPage
            language: $language
        ) {
            count
            totalPages
            page
            results {
                id
                roundOrderId
                quantity
                status
                statusText
                locationId
                location {
                    id
                    name
                    aisle
                    column
                    level
                    position
                    blockId
                }
                handlingUnitContentId
                roundLineDetail {
                    roundLine {
                        article {
                            id
                            name
                        }
                    }
                }
            }
        }
    }
`;

const routeBlocksQuery = gql`
    query routeAnalysisBlocks($filters: BlockSearchFilters) {
        blocks(filters: $filters, itemsPerPage: 1000) {
            results {
                id
                name
                level
                buildingId
                layout
                building {
                    id
                    name
                    layout
                }
            }
        }
    }
`;

// The access graph must see the WHOLE site, not just what the round visits: a building the
// round does not pick in can still be the one its covered walkway goes through, and the floors
// a building HAS decide which levels a staircase links (`adjacentFloor`). Both are cheap — a
// building layout is a rect plus a few doors, and only (buildingId, level) is read off blocks.
export type RouteSite = {
    buildings: Array<{ id: string; layout: any }>;
    levels: Array<{ buildingId: string; level: number }>;
};

const routeSiteQuery = gql`
    query routeAnalysisSite {
        buildings(itemsPerPage: 10000) {
            results {
                id
                layout
            }
        }
        blocks(itemsPerPage: 10000) {
            results {
                buildingId
                level
            }
        }
    }
`;

const RAA_PAGE_SIZE = 500;
const RAA_MAX_PAGES = 20;

export const useRouteAnalysis = (roundId: string | undefined, enabled: boolean) => {
    const { t, lang } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [round, setRound] = useState<RouteRound | null | undefined>(undefined);
    const [raas, setRaas] = useState<RouteRaa[] | null | undefined>(undefined);
    const [blocks, setBlocks] = useState<RouteBlock[] | null | undefined>(undefined);
    const [site, setSite] = useState<RouteSite | null | undefined>(undefined);
    const [truncatedCount, setTruncatedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef(0);
    // the API's language arg takes BASE codes only (fr/en/de/es) — the UI locale is fr-FR etc.
    const baseLang = (lang || 'en').split('-')[0];

    const fetchAll = useCallback(async () => {
        // fail closed: never fetch without READ permission (direct URL hits included)
        if (!roundId || !enabled) return;
        const seq = ++seqRef.current;
        setIsLoading(true);
        try {
            const roundResponse: any = await graphqlRequestClient.request(routeRoundQuery, {
                id: roundId,
                language: baseLang
            });
            const roundData = roundResponse?.round ?? null;

            const allRaas: RouteRaa[] = [];
            let page = 1;
            let totalPages = 1;
            let totalCount = 0;
            while (page <= totalPages && page <= RAA_MAX_PAGES) {
                const response: any = await graphqlRequestClient.request(routeRaasQuery, {
                    filters: { roundId },
                    page,
                    itemsPerPage: RAA_PAGE_SIZE,
                    language: baseLang
                });
                const payload = response?.roundAdvisedAddresses;
                allRaas.push(...(payload?.results ?? []));
                totalPages = payload?.totalPages ?? 1;
                totalCount = payload?.count ?? allRaas.length;
                page++;
            }

            const blockIds = Array.from(
                new Set(
                    allRaas
                        .map((raa) => raa.location?.blockId)
                        .filter((blockId): blockId is string => !!blockId)
                )
            );
            let blocksData: RouteBlock[] = [];
            if (blockIds.length > 0) {
                const response: any = await graphqlRequestClient.request(routeBlocksQuery, {
                    filters: { id: blockIds }
                });
                blocksData = response?.blocks?.results ?? [];
            }

            // the site-wide view is only needed to route through access points: a failure here
            // must degrade to the flat estimate, never break the screen
            let siteData: RouteSite | null = null;
            try {
                const response: any = await graphqlRequestClient.request(routeSiteQuery);
                siteData = {
                    buildings: response?.buildings?.results ?? [],
                    levels: response?.blocks?.results ?? []
                };
            } catch (error) {
                console.log(error);
            }

            if (seq === seqRef.current) {
                setRound(roundData);
                setRaas(allRaas);
                setBlocks(blocksData);
                setSite(siteData);
                // never silently truncate: the screen surfaces missing rows to the user
                setTruncatedCount(Math.max(totalCount - allRaas.length, 0));
            }
        } catch (error) {
            console.log(error);
            if (seq === seqRef.current) {
                setRound(null);
                setRaas(null);
                setBlocks(null);
                setSite(null);
                setTruncatedCount(0);
                showError(tRef.current('messages:error-getting-data'));
            }
        } finally {
            if (seq === seqRef.current) setIsLoading(false);
        }
    }, [graphqlRequestClient, roundId, baseLang, enabled]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return { round, raas, blocks, site, truncatedCount, isLoading, reload: fetchAll };
};
