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
import { Table } from 'generated/graphql';

/**
 * Central registry mapping an entity table to its detail-page route.
 *
 * Used by CellaBot to turn the assistant's synthetic `cella://<entity>/<id>` links into in-app
 * navigation: `<entity>` (the backend's camelCase entity name, e.g. `articleLu`) is resolved
 * case/underscore-insensitively against `tableName`, and the detail page is `/<path>/<id>`.
 *
 * One CANONICAL path per table: when several screens share a table (boxes vs shipping-units,
 * customer-orders vs credits, rounds vs goods-ins...), the main screen is registered. Entries are
 * derived from `web/pages/<path>/[id].tsx` + the model each page imports, so the permission gate
 * (`getModesFromPermissions(permissions, tableName)`) matches the destination page's own check.
 *
 * When adding a CRUD entity with a detail page, register it here (see CLAUDE.md §5).
 * Customer repos can extend/override through `web/modelsSpe/entityRoutesSpe.ts` (same SPE layering
 * as models): export `entityRoutesSpe: EntityRoute[]` — its entries win over the template's.
 */
export interface EntityRoute {
    tableName: string; // Table.<Entity> enum value — same table the destination page checks
    path: string; // route prefix under web/pages: the detail page is /<path>/[id]
}

export const ENTITY_ROUTES: EntityRoute[] = [
    // Table.AiConversation once the backend schema reaches staging
    { tableName: 'AI_CONVERSATION', path: 'ai-conversations' },
    { tableName: Table.Appointment, path: 'appointments' },
    { tableName: Table.AppointmentLine, path: 'appointments/line' },
    { tableName: Table.ArticlePriceHistory, path: 'article-price-histories' },
    { tableName: Table.ArticlePrice, path: 'article-prices' },
    { tableName: Table.ArticleSet, path: 'article-sets' },
    { tableName: Table.ArticleSetDetail, path: 'article-sets/detail' },
    { tableName: Table.Article, path: 'articles' },
    { tableName: Table.ArticleLuBarcode, path: 'articles/barcode' },
    { tableName: Table.ArticleLu, path: 'articles/lu' },
    { tableName: Table.Barcode, path: 'barcodes' },
    { tableName: Table.Block, path: 'blocks' },
    { tableName: Table.HandlingUnitOutbound, path: 'boxes' },
    { tableName: Table.HandlingUnitContentOutbound, path: 'boxes/boxLine' },
    { tableName: Table.Building, path: 'buildings' },
    { tableName: Table.Carrier, path: 'carriers' },
    { tableName: Table.CarrierShippingMode, path: 'carriers/shipping-mode' },
    { tableName: Table.Config, path: 'configurations' },
    { tableName: Table.Conversion, path: 'conversions' },
    { tableName: Table.Order, path: 'customer-orders' },
    { tableName: Table.OrderAddress, path: 'customer-orders/address' },
    { tableName: Table.OrderLine, path: 'customer-orders/line' },
    { tableName: Table.CustomPermission, path: 'custom-permissions' },
    { tableName: Table.CustomPermissionLine, path: 'custom-permissions/line' },
    { tableName: Table.CycleCount, path: 'cycle-counts' },
    { tableName: Table.CycleCountError, path: 'cycle-counts/cycle-count-errors' },
    { tableName: Table.CycleCountLine, path: 'cycle-counts/cycle-count-lines' },
    { tableName: Table.CycleCountMovement, path: 'cycle-counts/cycle-count-movements' },
    { tableName: Table.Delivery, path: 'deliveries' },
    { tableName: Table.DeliveryAddress, path: 'deliveries/address' },
    { tableName: Table.DeliveryLine, path: 'deliveries/line' },
    { tableName: Table.DocumentHistory, path: 'document-histories' },
    { tableName: Table.Equipment, path: 'equipment' },
    { tableName: Table.EquipmentDetail, path: 'equipment/details' },
    { tableName: Table.FeatureCode, path: 'feature-codes' },
    { tableName: Table.FeatureTypeDetail, path: 'feature-types/details' },
    { tableName: Table.HandlingUnitContent, path: 'handling-unit-contents' },
    { tableName: Table.HandlingUnitContentFeature, path: 'handling-unit-contents/feature' },
    { tableName: Table.HandlingUnitModel, path: 'handling-unit-models' },
    { tableName: Table.HandlingUnitOutboundBarcode, path: 'handling-unit-outbound-barcodes' },
    { tableName: Table.HookConfig, path: 'hook-configs' },
    { tableName: Table.HandlingUnitInbound, path: 'inbound-boxes' },
    { tableName: Table.HandlingUnitContentInbound, path: 'inbound-boxes/line' },
    { tableName: Table.Load, path: 'loads' },
    { tableName: Table.Location, path: 'locations' },
    { tableName: Table.LogisticUnit, path: 'logistic-units' },
    { tableName: Table.CustomObject, path: 'mail-templates' },
    { tableName: Table.Movement, path: 'movements' },
    { tableName: Table.Notification, path: 'notifications' },
    { tableName: Table.Parameter, path: 'parameters' },
    { tableName: Table.PatternPath, path: 'pattern-paths' },
    { tableName: Table.Pattern, path: 'patterns' },
    { tableName: Table.Payment, path: 'payments' },
    { tableName: Table.PaymentLine, path: 'payments/line' },
    { tableName: Table.PurchaseOrder, path: 'purchase-orders' },
    { tableName: Table.PurchaseOrderLineFeature, path: 'purchase-orders/feature' },
    { tableName: Table.PurchaseOrderLine, path: 'purchase-orders/line' },
    { tableName: Table.RecordHistory, path: 'record-history' },
    { tableName: Table.Role, path: 'roles' },
    { tableName: Table.RoundCalculationProfile, path: 'round-calculation-profiles' },
    { tableName: Table.Round, path: 'rounds' },
    { tableName: Table.RoundLine, path: 'rounds/line' },
    { tableName: Table.RoundLineDetail, path: 'rounds/line/detail' },
    { tableName: Table.Rule, path: 'rules' },
    { tableName: Table.RuleVersion, path: 'rules/version' },
    { tableName: Table.RuleVersionConfig, path: 'rules/version/config' },
    { tableName: Table.SchedulerConfig, path: 'scheduler-configs' },
    { tableName: Table.StatusHistory, path: 'status-history' },
    { tableName: Table.StockOwner, path: 'stock-owners' },
    { tableName: Table.ThirdParty, path: 'third-parties' },
    { tableName: Table.ThirdPartyAddress, path: 'third-parties/address' },
    { tableName: Table.ThirdPartyAddressContact, path: 'third-parties/address/contact' },
    { tableName: Table.WarehouseWorker, path: 'warehouse-workers' },
    {
        tableName: Table.WarehouseWorkerCustomPermission,
        path: 'warehouse-workers/custom-permissions'
    },
    { tableName: Table.WarehouseWorkerStockOwner, path: 'warehouse-workers/stock-owners' }
];

// Table values are SCREAMING_SNAKE ('ARTICLE_LU') while the backend's entity names are camelCase
// ('articleLu'): compare underscore- and case-insensitively.
const normalizeEntityKey = (key: string) => key.replace(/_/g, '').toLowerCase();

let speRoutes: EntityRoute[] | null | undefined;
const speEntityRoutes = (): EntityRoute[] => {
    if (speRoutes === undefined) {
        // Dynamic expression on purpose (same SPE layering as InjectedModel.ts): webpack resolves
        // it at runtime, so a customer repo without the file falls through to the catch instead of
        // failing the template build with a static "module not found".
        try {
            const speFileName = 'entityRoutesSpe';
            speRoutes = require(`../../modelsSpe/${speFileName}`).entityRoutesSpe ?? null;
        } catch (e) {
            speRoutes = null;
        }
    }
    return speRoutes ?? [];
};

/**
 * Resolve an entity key (backend camelCase name or Table enum value) to its detail route, or
 * undefined when the entity has no registered screen. Customer (SPE) entries win.
 */
export const resolveEntityRoute = (entityKey: string): EntityRoute | undefined => {
    if (!entityKey) return undefined;
    const key = normalizeEntityKey(entityKey);
    const match = (route: EntityRoute) => normalizeEntityKey(route.tableName) === key;
    return speEntityRoutes().find(match) ?? ENTITY_ROUTES.find(match);
};
