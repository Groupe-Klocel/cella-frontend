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

// Direction classification for truck flows (in/out appointments, NOT visits).
//   - OUTBOUND (goods leaving): Loading appointments, Pre-/Post-loading loads,
//     deliveries and sales orders (order_type Customer 10 / Selling 20).
//   - INBOUND (goods arriving): Unloading appointments, Inbound loads,
//     purchase orders and buying orders (order_type Buying 30).
// order_type Invoice (40) is excluded from load assignment.
//
// load_type, appointment_type and order_type directions are all resolved at runtime from the
// DB configs held in AppContext (mirrors visitorManagement.ts) — no code number hard-coded and
// no dependency on common/configs.json here.

import type { ConfigOrParamItem } from './visitorManagement';

export type LoadDirection = 'inbound' | 'outbound';
export type AppointmentDirection = LoadDirection | 'visit';

// "unloading" contains "loading": always test the inbound matcher before assuming outbound.
const INBOUND_LOAD_MATCHER = /inbound|unload|décharg|entlad|réception|reception/i;
const INBOUND_APPOINTMENT_MATCHER = /unload|décharg|entlad|réception|reception/i;
// order_type value matchers: Buying -> inbound; Invoice -> excluded (no load/appt assignment).
const INBOUND_ORDER_MATCHER = /buying|achat|kauf/i;
const EXCLUDED_ORDER_MATCHER = /invoice|facture|rechnung/i;

const toCode = (code: string | number): number => parseInt(String(code), 10);

const codesForScope = (
    configs: ConfigOrParamItem[] | undefined,
    scope: string,
    predicate: (value: string) => boolean
): number[] =>
    (configs ?? [])
        .filter((c) => c.scope === scope && predicate(c.value))
        .map((c) => toCode(c.code))
        .filter((c) => !isNaN(c));

// ---- load_type ----------------------------------------------------------

export const getInboundLoadTypeCodes = (configs: ConfigOrParamItem[] | undefined): number[] =>
    codesForScope(configs, 'load_type', (v) => INBOUND_LOAD_MATCHER.test(v));

export const getOutboundLoadTypeCodes = (configs: ConfigOrParamItem[] | undefined): number[] =>
    codesForScope(configs, 'load_type', (v) => !INBOUND_LOAD_MATCHER.test(v));

export const getLoadTypeCodesForDirection = (
    direction: LoadDirection,
    configs: ConfigOrParamItem[] | undefined
): number[] =>
    direction === 'inbound' ? getInboundLoadTypeCodes(configs) : getOutboundLoadTypeCodes(configs);

export const classifyLoadType = (
    type: number | string | null | undefined,
    configs: ConfigOrParamItem[] | undefined
): LoadDirection | undefined => {
    if (type === null || type === undefined) return undefined;
    const item = (configs ?? []).find(
        (c) => c.scope === 'load_type' && String(c.code) === String(type)
    );
    if (!item) return undefined;
    return INBOUND_LOAD_MATCHER.test(item.value) ? 'inbound' : 'outbound';
};

// ---- appointment_type ---------------------------------------------------

export const getAppointmentDirection = (
    appointmentType: number | string | null | undefined,
    configs: ConfigOrParamItem[] | undefined
): AppointmentDirection | undefined => {
    if (appointmentType === null || appointmentType === undefined) return undefined;
    const item = (configs ?? []).find(
        (c) => c.scope === 'appointment_type' && String(c.code) === String(appointmentType)
    );
    if (!item) return undefined;
    if (/visit/i.test(item.value)) return 'visit';
    if (INBOUND_APPOINTMENT_MATCHER.test(item.value)) return 'inbound';
    return 'outbound';
};

export const getInboundAppointmentTypeCodes = (
    configs: ConfigOrParamItem[] | undefined
): number[] =>
    codesForScope(configs, 'appointment_type', (v) => INBOUND_APPOINTMENT_MATCHER.test(v));

export const getOutboundAppointmentTypeCodes = (
    configs: ConfigOrParamItem[] | undefined
): number[] =>
    codesForScope(
        configs,
        'appointment_type',
        (v) => !/visit/i.test(v) && !INBOUND_APPOINTMENT_MATCHER.test(v)
    );

export const getAppointmentTypeCodesForDirection = (
    direction: LoadDirection,
    configs: ConfigOrParamItem[] | undefined
): number[] =>
    direction === 'inbound'
        ? getInboundAppointmentTypeCodes(configs)
        : getOutboundAppointmentTypeCodes(configs);

// ---- order_type ---------------------------------------------------------
// Resolved from DB configs (scope "order_type"), same pattern as load_type/appointment_type:
// Sales (Customer / Selling) -> outbound; Buying -> inbound;
// Invoice (and anything unresolved) -> null (excluded from load/appointment assignment).

export const getOrderDirection = (
    orderType: number | string | null | undefined,
    configs: ConfigOrParamItem[] | undefined
): LoadDirection | null => {
    if (orderType === null || orderType === undefined) return null;
    const item = (configs ?? []).find(
        (c) => c.scope === 'order_type' && String(c.code) === String(orderType)
    );
    if (!item || EXCLUDED_ORDER_MATCHER.test(item.value)) return null;
    return INBOUND_ORDER_MATCHER.test(item.value) ? 'inbound' : 'outbound';
};

export const getInboundOrderTypeCodes = (configs: ConfigOrParamItem[] | undefined): number[] =>
    codesForScope(
        configs,
        'order_type',
        (v) => !EXCLUDED_ORDER_MATCHER.test(v) && INBOUND_ORDER_MATCHER.test(v)
    );

export const getOutboundOrderTypeCodes = (configs: ConfigOrParamItem[] | undefined): number[] =>
    codesForScope(
        configs,
        'order_type',
        (v) => !EXCLUDED_ORDER_MATCHER.test(v) && !INBOUND_ORDER_MATCHER.test(v)
    );

export const getOrderTypeCodesForDirection = (
    direction: LoadDirection,
    configs: ConfigOrParamItem[] | undefined
): number[] =>
    direction === 'inbound'
        ? getInboundOrderTypeCodes(configs)
        : getOutboundOrderTypeCodes(configs);

// ---- appointment link configs -------------------------------------------
// DB configs (scope "appointment") gate which entity types an appointment can be linked
// to. A link is enabled only when the matching config exists with value "1".

export type AppointmentLinkType = 'deliveries' | 'loads' | 'unloads' | 'orders' | 'purchase_orders';

export const isAppointmentLinkEnabled = (
    configs: ConfigOrParamItem[] | undefined,
    linkType: AppointmentLinkType
): boolean =>
    (configs ?? []).some(
        (c) =>
            c.scope === 'appointment' &&
            c.code === `appointment_with_${linkType}` &&
            String(c.value) === '1'
    );

// ---- pre-assigned load ("assign to load") link configs ------------------
// DB configs (scope "load") gate which entity types can be pre-assigned to a load
// ("assign to load"). A link is enabled only when the matching config exists with value "1".

export type PreloadLinkType = 'deliveries' | 'orders' | 'purchase_orders';

export const isPreloadLinkEnabled = (
    configs: ConfigOrParamItem[] | undefined,
    linkType: PreloadLinkType
): boolean =>
    (configs ?? []).some(
        (c) =>
            c.scope === 'load' &&
            c.code === `preload_with_${linkType}` &&
            String(c.value) === '1'
    );
