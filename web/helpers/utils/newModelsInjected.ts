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
// models/index.ts
import { injectedModel } from 'helpers/utils/InjectedModel';
import { ArticleExtrasModelV2 as _ArticleExtrasModelV2 } from '../../models/ArticleExtrasModelV2';
import { ArticleLuBarcodeModelV2 as _ArticleLuBarcodeModelV2 } from '../../models/ArticleLuBarcodeModelV2';
import { ArticleLuModelV2 as _ArticleLuModelV2 } from '../../models/ArticleLuModelV2';
import { ArticleModelV2 as _ArticleModelV2 } from '../../models/ArticleModelV2';
import { ArticlePriceHistoryModelV2 as _ArticlePriceHistoryModelV2 } from '../../models/ArticlePriceHistoryModelV2';
import { ArticlePriceModelV2 as _ArticlePriceModelV2 } from '../../models/ArticlePriceModelV2';
import { ArticleSetDetailModelV2 as _ArticleSetDetailModelV2 } from '../../models/ArticleSetDetailModelV2';
import { ArticleSetModelV2 as _ArticleSetModelV2 } from '../../models/ArticleSetModelV2';
import { ArticleTranslationsModelV2 as _ArticleTranslationsModelV2 } from '../../models/ArticleTranslationsModelV2';
import { BarcodeModelV2 as _BarcodeModelV2 } from '../../models/BarcodeModelV2';
import { BlockModelV2 as _BlockModelV2 } from '../../models/BlockModelV2';
import { BuildingModelV2 as _BuildingModelV2 } from '../../models/BuildingModelV2';
import { CarrierModelV2 as _CarrierModelV2 } from '../../models/CarrierModelV2';
import { CarrierShippingModeModelV2 as _CarrierShippingModeModelV2 } from '../../models/CarrierShippingModeModelV2';
import { ConfigExtrasModelV2 as _ConfigExtrasModelV2 } from '../../models/ConfigExtrasModelV2';
import { ConfigModelV2 as _ConfigModelV2 } from '../../models/ConfigModelV2';
import { ConversionModelV2 as _ConversionModelV2 } from '../../models/ConversionModelV2';
import { CreditAddressModelV2 as _CreditAddressModelV2 } from '../../models/CreditAddressModelV2';
import { CreditLineModelV2 as _CreditLineModelV2 } from '../../models/CreditLineModelV2';
import { CreditModelV2 as _CreditModelV2 } from '../../models/CreditModelV2';
import { CustomerOrderAddressModelV2 as _CustomerOrderAddressModelV2 } from '../../models/CustomerOrderAddressModelV2';
import { CustomerOrderLineModelV2 as _CustomerOrderLineModelV2 } from '../../models/CustomerOrderLineModelV2';
import { CustomerOrderModelV2 as _CustomerOrderModelV2 } from '../../models/CustomerOrderModelV2';
import { CycleCountErrorModelV2 as _CycleCountErrorModelV2 } from '../../models/CycleCountErrorModelV2';
import { CycleCountLineModelV2 as _CycleCountLineModelV2 } from '../../models/CycleCountLineModelV2';
import { CycleCountModelV2 as _CycleCountModelV2 } from '../../models/CycleCountModelV2';
import { CycleCountMovementModelV2 as _CycleCountMovementModelV2 } from '../../models/CycleCountMovementModelV2';
import { DeliveryAddressModelV2 as _DeliveryAddressModelV2 } from '../../models/DeliveryAddressModelV2';
import { DeliveryLineModelV2 as _DeliveryLineModelV2 } from '../../models/DeliveryLineModelV2';
import { DeliveryModelV2 as _DeliveryModelV2 } from '../../models/DeliveryModelV2';
import { DocumentHistoryModelV2 as _DocumentHistoryModelV2 } from '../../models/DocumentHistoryModelV2';
import { EquipmentDetailModelV2 as _EquipmentDetailModelV2 } from '../../models/EquipmentDetailModelV2';
import { EquipmentModelV2 as _EquipmentModelV2 } from '../../models/EquipmentModelV2';
import { FeatureCodeModelV2 as _FeatureCodeModelV2 } from '../../models/FeatureCodeModelV2';
import { FeatureTypeDetailModelV2 as _FeatureTypeDetailModelV2 } from '../../models/FeatureTypeDetailModelV2';
import { FeaturesListModelV2 as _FeaturesListModelV2 } from '../../models/FeaturesListModelV2';
import { GoodsInLineDetailModelV2 as _GoodsInLineDetailModelV2 } from '../../models/GoodsInLineDetailModelV2';
import { GoodsInModelV2 as _GoodsInModelV2 } from '../../models/GoodsInModelV2';
import { HandlingUnitContentFeatureModelV2 as _HandlingUnitContentFeatureModelV2 } from '../../models/HandlingUnitContentFeatureModelV2';
import { HandlingUnitContentInboundModelV2 as _HandlingUnitContentInboundModelV2 } from '../../models/HandlingUnitContentInboundModelV2';
import { HandlingUnitContentModelV2 as _HandlingUnitContentModelV2 } from '../../models/HandlingUnitContentModelV2';
import { HandlingUnitContentOutboundModelV2 as _HandlingUnitContentOutboundModelV2 } from '../../models/HandlingUnitContentOutboundModelV2';
import { HandlingUnitContentsCumulatedModelV2 as _HandlingUnitContentsCumulatedModelV2 } from '../../models/HandlingUnitContentsCumulatedModelV2';
import { HandlingUnitInboundModelV2 as _HandlingUnitInboundModelV2 } from '../../models/HandlingUnitInboundModelV2';
import { HandlingUnitModelModelV2 as _HandlingUnitModelModelV2 } from '../../models/HandlingUnitModelModelV2';
import { HandlingUnitOutboundBarcodeModelV2 as _HandlingUnitOutboundBarcodeModelV2 } from '../../models/HandlingUnitOutboundBarcodeModelV2';
import { HandlingUnitOutboundBarcode_BoxesModelV2 as _HandlingUnitOutboundBarcode_BoxesModelV2 } from '../../models/HandlingUnitOutboundBarcode_BoxesModelV2';
import { HandlingUnitOutboundModelV2 as _HandlingUnitOutboundModelV2 } from '../../models/HandlingUnitOutboundModelV2';
import { HookConfigDetailArgumentModelV2 as _HookConfigDetailArgumentModelV2 } from '../../models/HookConfigDetailArgumentModelV2';
import { HookConfigModelV2 as _HookConfigModelV2 } from '../../models/HookConfigModelV2';
import { LoadModelV2 as _LoadModelV2 } from '../../models/LoadModelV2';
import { LocationModelV2 as _LocationModelV2 } from '../../models/LocationModelV2';
import { LogisticUnitModelV2 as _LogisticUnitModelV2 } from '../../models/LogisticUnitModelV2';
import { ManualAllocationModelV2 as _ManualAllocationModelV2 } from '../../models/ManualAllocationModelV2';
import { MovementModelV2 as _MovementModelV2 } from '../../models/MovementModelV2';
import { NotificationModelV2 as _NotificationModelV2 } from '../../models/NotificationModelV2';
import { ParameterExtrasModelV2 as _ParameterExtrasModelV2 } from '../../models/ParameterExtrasModelV2';
import { ParameterModelV2 as _ParameterModelV2 } from '../../models/ParameterModelV2';
import { PatternModelV2 as _PatternModelV2 } from '../../models/PatternModelV2';
import { PatternPathLink_PatternModelV2 as _PatternPathLink_PatternModelV2 } from '../../models/PatternPathLink_PatternModelV2';
import { PatternPathLink_PatternPathModelV2 as _PatternPathLink_PatternPathModelV2 } from '../../models/PatternPathLink_PatternPathModelV2';
import { PatternPathLocationInputModelV2 as _PatternPathLocationInputModelV2 } from '../../models/PatternPathLocationInputModelV2';
import { PatternPathLocationModelV2 as _PatternPathLocationModelV2 } from '../../models/PatternPathLocationModelV2';
import { PatternPathLocationOutputModelV2 as _PatternPathLocationOutputModelV2 } from '../../models/PatternPathLocationOutputModelV2';
import { PatternPathModelV2 as _PatternPathModelV2 } from '../../models/PatternPathModelV2';
import { PaymentLineModelV2 as _PaymentLineModelV2 } from '../../models/PaymentLineModelV2';
import { PaymentModelV2 as _PaymentModelV2 } from '../../models/PaymentModelV2';
import { PurchaseOrderLineFeatureModelV2 as _PurchaseOrderLineFeatureModelV2 } from '../../models/PurchaseOrderLineFeatureModelV2';
import { PurchaseOrderLineModelV2 as _PurchaseOrderLineModelV2 } from '../../models/PurchaseOrderLineModelV2';
import { PurchaseOrderModelV2 as _PurchaseOrderModelV2 } from '../../models/PurchaseOrderModelV2';
import { RecordHistoryDetailAfterModelV2 as _RecordHistoryDetailAfterModelV2 } from '../../models/RecordHistoryDetailAfterModelV2';
import { RecordHistoryDetailBeforeModelV2 as _RecordHistoryDetailBeforeModelV2 } from '../../models/RecordHistoryDetailBeforeModelV2';
import { RecordHistoryModelV2 as _RecordHistoryModelV2 } from '../../models/RecordHistoryModelV2';
import { RoleModelV2 as _RoleModelV2 } from '../../models/RoleModelV2';
import { RoleUserRoleModelV2 as _RoleUserRoleModelV2 } from '../../models/RoleUserRoleModelV2';
import { RoundAdvisedAddressModelV2 as _RoundAdvisedAddressModelV2 } from '../../models/RoundAdvisedAddressModelV2';
import { RoundCalculationProfileEquipmentModelV2 as _RoundCalculationProfileEquipmentModelV2 } from '../../models/RoundCalculationProfileEquipmentModelV2';
import { RoundCalculationProfileModelV2 as _RoundCalculationProfileModelV2 } from '../../models/RoundCalculationProfileModelV2';
import { RoundLineDetailModelV2 as _RoundLineDetailModelV2 } from '../../models/RoundLineDetailModelV2';
import { RoundLineModelV2 as _RoundLineModelV2 } from '../../models/RoundLineModelV2';
import { RoundModelV2 as _RoundModelV2 } from '../../models/RoundModelV2';
import { RuleModelV2 as _RuleModelV2 } from '../../models/RuleModelV2';
import { RuleVersionConfigDetailModelV2 as _RuleVersionConfigDetailModelV2 } from '../../models/RuleVersionConfigDetailModelV2';
import { RuleVersionConfigModelV2 as _RuleVersionConfigModelV2 } from '../../models/RuleVersionConfigModelV2';
import { RuleVersionDetailInModelV2 as _RuleVersionDetailInModelV2 } from '../../models/RuleVersionDetailInModelV2';
import { RuleVersionDetailOutModelV2 as _RuleVersionDetailOutModelV2 } from '../../models/RuleVersionDetailOutModelV2';
import { RuleVersionModelV2 as _RuleVersionModelV2 } from '../../models/RuleVersionModelV2';
import { SchedulerConfigDetailModelV2 as _SchedulerConfigDetailModelV2 } from '../../models/SchedulerConfigDetailModelV2';
import { SchedulerConfigModelV2 as _SchedulerConfigModelV2 } from '../../models/SchedulerConfigModelV2';
import { SingleParameterModelV2 as _SingleParameterModelV2 } from '../../models/SingleParameterModelV2';
import { StatusHistoryDetailExtraModelV2 as _StatusHistoryDetailExtraModelV2 } from '../../models/StatusHistoryDetailExtraModelV2';
import { StatusHistoryModelV2 as _StatusHistoryModelV2 } from '../../models/StatusHistoryModelV2';
import { StockOwnerModelV2 as _StockOwnerModelV2 } from '../../models/StockOwnerModelV2';
import { ThirdPartyAddressContactModelV2 as _ThirdPartyAddressContactModelV2 } from '../../models/ThirdPartyAddressContactModelV2';
import { ThirdPartyAddressModelV2 as _ThirdPartyAddressModelV2 } from '../../models/ThirdPartyAddressModelV2';
import { ThirdPartyDocumentModelV2 as _ThirdPartyDocumentModelV2 } from '../../models/ThirdPartyDocumentModelV2';
import { ThirdPartyModelV2 as _ThirdPartyModelV2 } from '../../models/ThirdPartyModelV2';
import { TranslationModelV2 as _TranslationModelV2 } from '../../models/TranslationModelV2';
import { WarehouseWorkerModelV2 as _WarehouseWorkerModelV2 } from '../../models/WarehouseWorkerModelV2';
import { WarehouseWorkerStockOwnerModelV2 as _WarehouseWorkerStockOwnerModelV2 } from '../../models/WarehouseWorkerStockOwnerModelV2';
import { WarehouseWorkerUserRoleModelV2 as _WarehouseWorkerUserRoleModelV2 } from '../../models/WarehouseWorkerUserRoleModelV2';

export const ArticleExtrasModelV2 = injectedModel(_ArticleExtrasModelV2, 'ArticleExtrasSpeModel');
export const ArticleLuBarcodeModelV2 = injectedModel(
    _ArticleLuBarcodeModelV2,
    'ArticleLuBarcodeSpeModel'
);
export const ArticleLuModelV2 = injectedModel(_ArticleLuModelV2, 'ArticleLuSpeModel');
export const ArticleModelV2 = injectedModel(_ArticleModelV2, 'ArticleSpeModel');
export const ArticlePriceHistoryModelV2 = injectedModel(
    _ArticlePriceHistoryModelV2,
    'ArticlePriceHistorySpeModel'
);
export const ArticlePriceModelV2 = injectedModel(_ArticlePriceModelV2, 'ArticlePriceSpeModel');
export const ArticleSetDetailModelV2 = injectedModel(
    _ArticleSetDetailModelV2,
    'ArticleSetDetailSpeModel'
);
export const ArticleSetModelV2 = injectedModel(_ArticleSetModelV2, 'ArticleSetSpeModel');
export const ArticleTranslationsModelV2 = injectedModel(
    _ArticleTranslationsModelV2,
    'ArticleTranslationsSpeModel'
);
export const BarcodeModelV2 = injectedModel(_BarcodeModelV2, 'BarcodeSpeModel');
export const BlockModelV2 = injectedModel(_BlockModelV2, 'BlockSpeModel');
export const BuildingModelV2 = injectedModel(_BuildingModelV2, 'BuildingSpeModel');
export const CarrierModelV2 = injectedModel(_CarrierModelV2, 'CarrierSpeModel');
export const CarrierShippingModeModelV2 = injectedModel(
    _CarrierShippingModeModelV2,
    'CarrierShippingModeSpeModel'
);
export const ConfigExtrasModelV2 = injectedModel(_ConfigExtrasModelV2, 'ConfigExtrasSpeModel');
export const ConfigModelV2 = injectedModel(_ConfigModelV2, 'ConfigSpeModel');
export const ConversionModelV2 = injectedModel(_ConversionModelV2, 'ConversionSpeModel');
export const CreditAddressModelV2 = injectedModel(_CreditAddressModelV2, 'CreditAddressSpeModel');
export const CreditLineModelV2 = injectedModel(_CreditLineModelV2, 'CreditLineSpeModel');
export const CreditModelV2 = injectedModel(_CreditModelV2, 'CreditSpeModel');
export const CustomerOrderAddressModelV2 = injectedModel(
    _CustomerOrderAddressModelV2,
    'CustomerOrderAddressSpeModel'
);
export const CustomerOrderLineModelV2 = injectedModel(
    _CustomerOrderLineModelV2,
    'CustomerOrderLineSpeModel'
);
export const CustomerOrderModelV2 = injectedModel(_CustomerOrderModelV2, 'CustomerOrderSpeModel');
export const CycleCountErrorModelV2 = injectedModel(
    _CycleCountErrorModelV2,
    'CycleCountErrorSpeModel'
);
export const CycleCountLineModelV2 = injectedModel(
    _CycleCountLineModelV2,
    'CycleCountLineSpeModel'
);
export const CycleCountModelV2 = injectedModel(_CycleCountModelV2, 'CycleCountSpeModel');
export const CycleCountMovementModelV2 = injectedModel(
    _CycleCountMovementModelV2,
    'CycleCountMovementSpeModel'
);
export const RecommendedCycleCountModelV2 = injectedModel(
    _CycleCountModelV2,
    'RecommendedCycleCountSpeModel'
);
export const DeliveryAddressModelV2 = injectedModel(
    _DeliveryAddressModelV2,
    'DeliveryAddressSpeModel'
);
export const DeliveryLineModelV2 = injectedModel(_DeliveryLineModelV2, 'DeliveryLineSpeModel');
export const DeliveryModelV2 = injectedModel(_DeliveryModelV2, 'DeliverySpeModel');
export const DocumentHistoryModelV2 = injectedModel(
    _DocumentHistoryModelV2,
    'DocumentHistorySpeModel'
);
export const EquipmentDetailModelV2 = injectedModel(
    _EquipmentDetailModelV2,
    'EquipmentDetailSpeModel'
);
export const EquipmentModelV2 = injectedModel(_EquipmentModelV2, 'EquipmentSpeModel');
export const FeatureCodeModelV2 = injectedModel(_FeatureCodeModelV2, 'FeatureCodeSpeModel');
export const FeatureTypeDetailModelV2 = injectedModel(
    _FeatureTypeDetailModelV2,
    'FeatureTypeDetailSpeModel'
);
export const FeaturesListModelV2 = injectedModel(_FeaturesListModelV2, 'FeaturesListSpeModel');
export const GoodsInLineDetailModelV2 = injectedModel(
    _GoodsInLineDetailModelV2,
    'GoodsInLineDetailSpeModel'
);
export const GoodsInModelV2 = injectedModel(_GoodsInModelV2, 'GoodsInSpeModel');
export const HandlingUnitContentFeatureModelV2 = injectedModel(
    _HandlingUnitContentFeatureModelV2,
    'HandlingUnitContentFeatureSpeModel'
);
export const HandlingUnitContentInboundModelV2 = injectedModel(
    _HandlingUnitContentInboundModelV2,
    'HandlingUnitContentInboundSpeModel'
);
export const HandlingUnitContentModelV2 = injectedModel(
    _HandlingUnitContentModelV2,
    'HandlingUnitContentSpeModel'
);
export const HandlingUnitContentOutboundModelV2 = injectedModel(
    _HandlingUnitContentOutboundModelV2,
    'HandlingUnitContentOutboundSpeModel'
);
export const HandlingUnitContentsCumulatedModelV2 = injectedModel(
    _HandlingUnitContentsCumulatedModelV2,
    'HandlingUnitContentsCumulatedSpeModel'
);
export const HandlingUnitInboundModelV2 = injectedModel(
    _HandlingUnitInboundModelV2,
    'HandlingUnitInboundSpeModel'
);
export const HandlingUnitModelModelV2 = injectedModel(
    _HandlingUnitModelModelV2,
    'HandlingUnitModelSpeModel'
);
export const HandlingUnitOutboundBarcodeModelV2 = injectedModel(
    _HandlingUnitOutboundBarcodeModelV2,
    'HandlingUnitOutboundBarcodeSpeModel'
);
export const HandlingUnitOutboundBarcode_BoxesModelV2 = injectedModel(
    _HandlingUnitOutboundBarcode_BoxesModelV2,
    'HandlingUnitOutboundBarcode_BoxesSpeModel'
);
export const HandlingUnitOutboundModelV2 = injectedModel(
    _HandlingUnitOutboundModelV2,
    'HandlingUnitOutboundSpeModel'
);
export const HookConfigDetailArgumentModelV2 = injectedModel(
    _HookConfigDetailArgumentModelV2,
    'HookConfigDetailArgumentSpeModel'
);
export const HookConfigModelV2 = injectedModel(_HookConfigModelV2, 'HookConfigSpeModel');
export const LoadModelV2 = injectedModel(_LoadModelV2, 'LoadSpeModel');
export const LocationModelV2 = injectedModel(_LocationModelV2, 'LocationSpeModel');
export const LogisticUnitModelV2 = injectedModel(_LogisticUnitModelV2, 'LogisticUnitSpeModel');
export const ManualAllocationModelV2 = injectedModel(
    _ManualAllocationModelV2,
    'ManualAllocationSpeModel'
);
export const MovementModelV2 = injectedModel(_MovementModelV2, 'MovementSpeModel');
export const NotificationModelV2 = injectedModel(_NotificationModelV2, 'NotificationSpeModel');
export const ParameterExtrasModelV2 = injectedModel(
    _ParameterExtrasModelV2,
    'ParameterExtrasSpeModel'
);
export const ParameterModelV2 = injectedModel(_ParameterModelV2, 'ParameterSpeModel');
export const PatternModelV2 = injectedModel(_PatternModelV2, 'PatternSpeModel');
export const PatternPathLink_PatternModelV2 = injectedModel(
    _PatternPathLink_PatternModelV2,
    'PatternPathLink_PatternSpeModel'
);
export const PatternPathLink_PatternPathModelV2 = injectedModel(
    _PatternPathLink_PatternPathModelV2,
    'PatternPathLink_PatternPathSpeModel'
);
export const PatternPathLocationInputModelV2 = injectedModel(
    _PatternPathLocationInputModelV2,
    'PatternPathLocationInputSpeModel'
);
export const PatternPathLocationModelV2 = injectedModel(
    _PatternPathLocationModelV2,
    'PatternPathLocationSpeModel'
);
export const PatternPathLocationOutputModelV2 = injectedModel(
    _PatternPathLocationOutputModelV2,
    'PatternPathLocationOutputSpeModel'
);
export const PatternPathModelV2 = injectedModel(_PatternPathModelV2, 'PatternPathSpeModel');
export const PaymentLineModelV2 = injectedModel(_PaymentLineModelV2, 'PaymentLineSpeModel');
export const PaymentModelV2 = injectedModel(_PaymentModelV2, 'PaymentSpeModel');
export const PurchaseOrderLineFeatureModelV2 = injectedModel(
    _PurchaseOrderLineFeatureModelV2,
    'PurchaseOrderLineFeatureSpeModel'
);
export const PurchaseOrderLineModelV2 = injectedModel(
    _PurchaseOrderLineModelV2,
    'PurchaseOrderLineSpeModel'
);
export const PurchaseOrderModelV2 = injectedModel(_PurchaseOrderModelV2, 'PurchaseOrderSpeModel');
export const RecordHistoryDetailAfterModelV2 = injectedModel(
    _RecordHistoryDetailAfterModelV2,
    'RecordHistoryDetailAfterSpeModel'
);
export const RecordHistoryDetailBeforeModelV2 = injectedModel(
    _RecordHistoryDetailBeforeModelV2,
    'RecordHistoryDetailBeforeSpeModel'
);
export const RecordHistoryModelV2 = injectedModel(_RecordHistoryModelV2, 'RecordHistorySpeModel');
export const RoleModelV2 = injectedModel(_RoleModelV2, 'RoleSpeModel');
export const RoleUserRoleModelV2 = injectedModel(_RoleUserRoleModelV2, 'RoleUserRoleSpeModel');
export const RoundAdvisedAddressModelV2 = injectedModel(
    _RoundAdvisedAddressModelV2,
    'RoundAdvisedAddressSpeModel'
);
export const RoundCalculationProfileEquipmentModelV2 = injectedModel(
    _RoundCalculationProfileEquipmentModelV2,
    'RoundCalculationProfileEquipmentSpeModel'
);
export const RoundCalculationProfileModelV2 = injectedModel(
    _RoundCalculationProfileModelV2,
    'RoundCalculationProfileSpeModel'
);
export const RoundLineDetailModelV2 = injectedModel(
    _RoundLineDetailModelV2,
    'RoundLineDetailSpeModel'
);
export const RoundLineModelV2 = injectedModel(_RoundLineModelV2, 'RoundLineSpeModel');
export const RoundModelV2 = injectedModel(_RoundModelV2, 'RoundSpeModel');
export const RuleModelV2 = injectedModel(_RuleModelV2, 'RuleSpeModel');
export const RuleVersionConfigDetailModelV2 = injectedModel(
    _RuleVersionConfigDetailModelV2,
    'RuleVersionConfigDetailSpeModel'
);
export const RuleVersionConfigModelV2 = injectedModel(
    _RuleVersionConfigModelV2,
    'RuleVersionConfigSpeModel'
);
export const RuleVersionDetailInModelV2 = injectedModel(
    _RuleVersionDetailInModelV2,
    'RuleVersionDetailInSpeModel'
);
export const RuleVersionDetailOutModelV2 = injectedModel(
    _RuleVersionDetailOutModelV2,
    'RuleVersionDetailOutSpeModel'
);
export const RuleVersionModelV2 = injectedModel(_RuleVersionModelV2, 'RuleVersionSpeModel');
export const SchedulerConfigDetailModelV2 = injectedModel(
    _SchedulerConfigDetailModelV2,
    'SchedulerConfigDetailSpeModel'
);
export const SchedulerConfigModelV2 = injectedModel(
    _SchedulerConfigModelV2,
    'SchedulerConfigSpeModel'
);
export const SingleParameterModelV2 = injectedModel(
    _SingleParameterModelV2,
    'SingleParameterSpeModel'
);
export const StatusHistoryDetailExtraModelV2 = injectedModel(
    _StatusHistoryDetailExtraModelV2,
    'StatusHistoryDetailExtraSpeModel'
);
export const StatusHistoryModelV2 = injectedModel(_StatusHistoryModelV2, 'StatusHistorySpeModel');
export const StockOwnerModelV2 = injectedModel(_StockOwnerModelV2, 'StockOwnerSpeModel');
export const ThirdPartyAddressContactModelV2 = injectedModel(
    _ThirdPartyAddressContactModelV2,
    'ThirdPartyAddressContactSpeModel'
);
export const ThirdPartyAddressModelV2 = injectedModel(
    _ThirdPartyAddressModelV2,
    'ThirdPartyAddressSpeModel'
);
export const ThirdPartyDocumentModelV2 = injectedModel(
    _ThirdPartyDocumentModelV2,
    'ThirdPartyDocumentSpeModel'
);
export const ThirdPartyModelV2 = injectedModel(_ThirdPartyModelV2, 'ThirdPartySpeModel');
export const TranslationModelV2 = injectedModel(_TranslationModelV2, 'TranslationSpeModel');
export const WarehouseWorkerModelV2 = injectedModel(
    _WarehouseWorkerModelV2,
    'WarehouseWorkerSpeModel'
);
export const WarehouseWorkerStockOwnerModelV2 = injectedModel(
    _WarehouseWorkerStockOwnerModelV2,
    'WarehouseWorkerStockOwnerSpeModel'
);
export const WarehouseWorkerUserRoleModelV2 = injectedModel(
    _WarehouseWorkerUserRoleModelV2,
    'WarehouseWorkerUserRoleSpeModel'
);
