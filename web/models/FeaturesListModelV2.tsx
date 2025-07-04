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
import { ModelType } from './ModelsV2';

export const FeaturesListModelV2: ModelType = {
    tableName: Table.HandlingUnitContentFeature,
    resolverName: 'HandlingUnitContentFeature',
    isEditable: true,
    isDeletable: true,
    isSoftDeletable: false,

    endpoints: {
        detail: 'handlingUnitContentFeature',
        list: 'handlingUnitContentFeatures',
        create: 'createHandlingUnitContentFeature',
        update: 'updateHandlingUnitContentFeature',
        delete: 'deleteHandlingUnitContentFeature',
        export: true
    },

    fieldsInfo: {
        id: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        featureCodeId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "FeatureCode", "fieldToDisplay": "name"}'
        },
        'featureCode{name}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'feature-codes/featureCodeId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        value: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'handling-unit-contents/feature/id',
            addEditFormat: 'String',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        handlingUnitContentId: {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnitId}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{name}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: 'handling-unit-contents/handlingUnitContentId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{location{block{buildingId}}}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'building',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "Building", "fieldToDisplay": "name"}'
        },
        'handlingUnitContent{handlingUnit{location{block{building{name}}}}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'buildings/buildingId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'building',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{location{blockId}}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'block',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "Block", "fieldToDisplay": "name"}'
        },
        'handlingUnitContent{handlingUnit{location{block{name}}}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'blocks/blockId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'block',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{locationId}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: 'location',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "Location", "fieldToDisplay": "name"}'
        },
        'handlingUnitContent{handlingUnit{location{name}}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'locations/locationId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'location',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{lastProcessingResultCode}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: false,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'lastProcessingResultCode',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: 'last_processing_result',
            param: null
        },
        'handlingUnitContent{handlingUnit{lastProcessingResultCodeText}}': {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'lastProcessingResultCode',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        'handlingUnitContent{handlingUnit{lastProcessingResult}}': {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'lastProcessingResult',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null
        },
        'handlingUnitContent{stockOwnerId}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: 'stockOwner',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "StockOwner", "fieldToDisplay": "name"}'
        },
        'handlingUnitContent{stockOwner{name}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'stock-owners/stockOwnerId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'stockOwner_name',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{articleId}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: '{"table": "Article", "fieldToDisplay": "name"}'
        },
        'handlingUnitContent{article{name}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: 'articles/articleId',
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{article{description}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'article_description',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{quantity}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'Number',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{category}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: 'handling_unit_category',
            optionTable: null
        },
        'handlingUnitContent{handlingUnit{categoryText}}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'category',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        'handlingUnitContent{stockStatus}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: true,
            isSortable: true,
            searchingFormat: 'Dropdown',
            isDetailRequested: true,
            isExcludedFromDetail: true,
            detailGroup: null,
            link: null,
            addEditFormat: 'Dropdown',
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: true,
            minRule: null,
            maxRule: null,
            config: null,
            param: 'stock_statuses',
            optionTable: null
        },
        'handlingUnitContent{stockStatusText}': {
            isListRequested: true,
            isDefaultHiddenList: false,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: null,
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: 'stockStatus',
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        created: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'CalendarRange',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        createdBy: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        modified: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'CalendarRange',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        },
        modifiedBy: {
            isListRequested: true,
            isDefaultHiddenList: true,
            isExcludedFromList: false,
            isSortable: true,
            searchingFormat: 'String',
            isDetailRequested: true,
            isExcludedFromDetail: false,
            detailGroup: null,
            link: null,
            addEditFormat: null,
            addEditStep: null,
            maxLength: null,
            displayName: null,
            isMandatory: false,
            minRule: null,
            maxRule: null,
            config: null,
            param: null,
            optionTable: null
        }
    }
};
