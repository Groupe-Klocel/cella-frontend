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
import { LocationLite, OccupancyGroupRow } from './occupancyModel';

export type BlockOption = {
    id: string;
    name: string;
    autocountLocation?: number | null;
    building?: { name?: string | null } | null;
};

const blocksQuery = gql`
    query occupancyBlocks {
        blocks(itemsPerPage: 999999999, orderBy: [{ field: "name", ascending: true }]) {
            count
            results {
                id
                name
                autocountLocation
                building {
                    name
                }
            }
        }
    }
`;

// data semantics shared by the hooks below: undefined = not fetched yet, null = fetch error.
// `t` changes identity on every render (it reads the DB translations from context), so the async
// error paths read it through a ref instead of widening the effect/callback dependency arrays.
export const useBlocksList = () => {
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [blocks, setBlocks] = useState<BlockOption[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        graphqlRequestClient
            .request(blocksQuery)
            .then((response: any) => {
                if (!cancelled) setBlocks(response?.blocks?.results ?? []);
            })
            .catch((error: any) => {
                console.log(error);
                if (!cancelled) {
                    setBlocks(null);
                    showError(tRef.current('messages:error-getting-data'));
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [graphqlRequestClient]);

    return { blocks, isLoading };
};

// Grouped aggregate: the API GROUP BYs the selected scalar fields (aisle, column, status) as soon
// as `functions` is passed, so a 64k-location block comes back as at most a few thousand rows.
const blockOccupancyQuery = gql`
    query blockOccupancy($filters: LocationSearchFilters, $functions: [JSON!]) {
        locations(filters: $filters, functions: $functions, itemsPerPage: 50000) {
            count
            results {
                aisle
                column
                status
                functionCount
            }
        }
    }
`;

export const useBlockOccupancy = () => {
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [rows, setRows] = useState<OccupancyGroupRow[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef(0);

    const fetchBlock = useCallback(
        async (blockId: string) => {
            const seq = ++seqRef.current;
            setIsLoading(true);
            try {
                const response: any = await graphqlRequestClient.request(blockOccupancyQuery, {
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

const aisleLocationsQuery = gql`
    query aisleLocations($filters: LocationSearchFilters) {
        locations(
            filters: $filters
            itemsPerPage: 3000
            orderBy: [{ field: "name", ascending: true }]
        ) {
            count
            results {
                id
                name
                column
                level
                position
                status
            }
        }
    }
`;

const AISLE_CACHE_MAX = 20;

export const useAisleDetail = () => {
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const { graphqlRequestClient } = useAuth();
    const [locations, setLocations] = useState<LocationLite[] | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef(0);
    const cacheRef = useRef(new Map<string, LocationLite[]>());

    const fetchAisle = useCallback(
        async (blockId: string, aisle: string, force?: boolean) => {
            const key = `${blockId}\u0000${aisle}`;
            const cached = force ? undefined : cacheRef.current.get(key);
            if (cached) {
                seqRef.current++;
                setLocations(cached);
                setIsLoading(false);
                return;
            }
            const seq = ++seqRef.current;
            setIsLoading(true);
            try {
                const response: any = await graphqlRequestClient.request(aisleLocationsQuery, {
                    filters: { blockId, aisle }
                });
                const results = response?.locations?.results ?? [];
                cacheRef.current.set(key, results);
                if (cacheRef.current.size > AISLE_CACHE_MAX) {
                    const oldest = cacheRef.current.keys().next().value;
                    if (oldest !== undefined) cacheRef.current.delete(oldest);
                }
                if (seq === seqRef.current) setLocations(results);
            } catch (error) {
                console.log(error);
                if (seq === seqRef.current) {
                    setLocations(null);
                    showError(tRef.current('messages:error-getting-data'));
                }
            } finally {
                if (seq === seqRef.current) setIsLoading(false);
            }
        },
        [graphqlRequestClient]
    );

    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    const reset = useCallback(() => {
        seqRef.current++;
        setLocations(undefined);
        setIsLoading(false);
    }, []);

    return { locations, isLoading, fetchAisle, clearCache, reset };
};
