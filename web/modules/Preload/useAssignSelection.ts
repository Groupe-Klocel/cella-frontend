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

// Shared row-selection state for the bulk "assign to load / appointment" actions.
// It accumulates selection ACROSS list pages: the antd Table is server-side paginated
// (its dataSource only ever holds the current page), so we rely on antd's idiomatic
// `preserveSelectedRowKeys: true` and drive our state from `onChange(keys, rows)`,
// merging each row's snapshot (status, carrier) by id and keeping only ids still in
// `keys`. This keeps eligibility / carrier-uniformity / counts correct for rows
// selected on other pages.

import { useState } from 'react';

export interface SelectedRowInfo {
    id: string;
    status?: number;
    carrier?: string | null;
    direction?: 'inbound' | 'outbound' | null;
    eligible: boolean;
}

export interface UseAssignSelectionArgs {
    tableData: any[];
    // status guard: whether a row can receive a load / appointment assignment
    isEligible?: (row: any) => boolean;
    // the row's carrier id (delivery/order -> carrierShippingMode_carrierId, load -> carrierId,
    // purchase order -> null). Null when the entity carries no carrier.
    carrierOf?: (row: any) => string | null;
    // the row's flow direction (loads only: classifyLoadType(row.type)). Used to keep a bulk
    // appointment assignment within a single direction. Null/undefined when not applicable.
    directionOf?: (row: any) => 'inbound' | 'outbound' | null | undefined;
    // when true, ineligible rows can't be checked at all (getCheckboxProps disabled), so the
    // action-bar count always matches the assignable count. Opt-in: only for lists where assign
    // is the ONLY bulk action (loads / purchase-orders). Leave off where other bulk actions
    // (cubing, bulk status change, duplication) need every row selectable.
    disableIneligibleCheckbox?: boolean;
}

export const useAssignSelection = ({
    tableData,
    isEligible,
    carrierOf,
    directionOf,
    disableIneligibleCheckbox
}: UseAssignSelectionArgs) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [rowsInfo, setRowsInfo] = useState<SelectedRowInfo[]>([]);

    // antd hands us (keys, rows) where `rows` holds the rows antd knows about — the
    // current page plus, thanks to preserveSelectedRowKeys, previously selected rows.
    // We rebuild the snapshot list by merging: start from the previous snapshots, layer
    // any freshly-provided rows on top (they may refresh status/carrier), then keep only
    // ids still present in `keys`.
    const snapshot = (row: any): SelectedRowInfo => ({
        id: String(row.id),
        status: row.status,
        carrier: carrierOf ? carrierOf(row) : null,
        direction: directionOf ? directionOf(row) ?? null : null,
        eligible: isEligible ? isEligible(row) : true
    });

    const onSelectChange = (newSelectedRowKeys: string[], selectedRows?: any[]) => {
        const keys = newSelectedRowKeys.map((k) => String(k));
        setSelectedRowKeys(keys);
        setRowsInfo((prev) => {
            const byId = new Map<string, SelectedRowInfo>();
            prev.forEach((r) => byId.set(r.id, r));
            (selectedRows ?? [])
                .filter((row) => row && row.id != null)
                .forEach((row) => byId.set(String(row.id), snapshot(row)));
            // fall back to the current page for any key we still have no snapshot for
            keys.forEach((id) => {
                if (byId.has(id)) return;
                const row = tableData.find((d) => String(d.id) === id);
                if (row) byId.set(id, snapshot(row));
            });
            return keys.map((id) => byId.get(id)).filter((r): r is SelectedRowInfo => !!r);
        });
    };

    const reset = () => {
        setSelectedRowKeys([]);
        setRowsInfo([]);
    };

    const eligibleInfos = rowsInfo.filter((r) => r.eligible);
    const eligibleIds = eligibleInfos.map((r) => r.id);
    const distinctCarriers = Array.from(
        new Set(eligibleInfos.map((r) => r.carrier).filter((c) => c != null))
    );
    const hasMixedCarrier = distinctCarriers.length > 1;
    const commonCarrierId = distinctCarriers.length === 1 ? (distinctCarriers[0] as string) : null;
    const distinctDirections = Array.from(
        new Set(eligibleInfos.map((r) => r.direction).filter((d) => d != null))
    );
    const hasMixedDirection = distinctDirections.length > 1;
    const commonDirection =
        distinctDirections.length === 1
            ? (distinctDirections[0] as 'inbound' | 'outbound')
            : undefined;

    return {
        selectedRowKeys,
        rowsInfo,
        onSelectChange,
        rowSelection: {
            selectedRowKeys,
            onChange: onSelectChange,
            preserveSelectedRowKeys: true,
            ...(disableIneligibleCheckbox && isEligible
                ? {
                      getCheckboxProps: (row: any) => ({ disabled: !isEligible(row) })
                  }
                : {})
        },
        eligibleIds,
        commonCarrierId,
        hasMixedCarrier,
        commonDirection,
        hasMixedDirection,
        reset
    };
};
