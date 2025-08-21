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
import {
    ApartmentOutlined,
    AppstoreAddOutlined,
    AuditOutlined,
    DeploymentUnitOutlined,
    ExportOutlined,
    HourglassOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    SlidersOutlined
} from '@ant-design/icons';
import { useAuth } from 'context/AuthContext';
import { Menu } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import Link from 'next/link';
import React, { FC } from 'react';
import { useAppState } from 'context/AppContext';
import { Table, ModeEnum } from 'generated/graphql';
import { cookie, getModesFromPermissions } from '@helpers';
import styled from 'styled-components';
import { ItemType, MenuItemType } from 'antd/lib/menu/interface';

const StyledMenu = styled(Menu)`
    &&& {
        .ant-menu-item,
        .ant-menu-submenu-title {
            color: white;
        }
    }
    .ant-menu-submenu-expand-icon,
    .ant-menu-submenu-arrow {
      color: #fff !important;
    }
  }
`;

const SideMenu: FC = () => {
    const { t } = useTranslation('menu');
    const { logout } = useAuth();
    const { permissions } = useAppState();

    const bi_link = process.env.NEXT_PUBLIC_BI_URL || 'https://bi.cella.cloud';

    const menuItems = [
        // ADMINISTRATION
        [
            'wm_configurations',
            'wm_roles',
            'wm_warehouse-workers',
            'wm_hook-configs',
            'wm_parameters',
            'wm_excel-imports',
            'wm_scheduler-configs'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'administration',
            icon: <AuditOutlined />,
            label: t('administration'),
            children: [
                // CONFIGS
                getModesFromPermissions(permissions, 'wm_configurations').includes(ModeEnum.Read)
                    ? {
                          key: 'administration-configurations',
                          label: <Link href="/configurations">{t('configurations')}</Link>
                      }
                    : null,

                // ACCESS-MANAGEMENT
                ['wm_roles', 'wm_warehouse-workers'].some((perm) =>
                    getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
                ) && {
                    key: 'administration-access-management',
                    label: t('access-management'),
                    children: [
                        // ROLES
                        getModesFromPermissions(permissions, 'wm_roles').includes(ModeEnum.Read)
                            ? {
                                  key: 'administration-access-management-roles',
                                  label: <Link href="/roles">{t('roles')}</Link>
                              }
                            : null,
                        // USERS
                        getModesFromPermissions(permissions, 'wm_warehouse-workers').includes(
                            ModeEnum.Read
                        )
                            ? {
                                  key: 'administration-access-management-warehouse-workers',
                                  label: (
                                      <Link href="/warehouse-workers">
                                          {t('warehouse-workers')}
                                      </Link>
                                  )
                              }
                            : null
                    ].filter(Boolean)
                },
                // HOOK-CONFIGS
                getModesFromPermissions(permissions, 'wm_hook-configs').includes(ModeEnum.Read)
                    ? {
                          key: 'administration-hook-configs',
                          label: <Link href="/hook-configs">{t('hook-configs')}</Link>
                      }
                    : null,
                // PARAMETERS
                getModesFromPermissions(permissions, 'wm_parameters').includes(ModeEnum.Read)
                    ? {
                          key: 'administration-parameters',
                          label: <Link href="/parameters">{t('parameters')}</Link>
                      }
                    : null,
                // EXCEL IMPORTS
                getModesFromPermissions(permissions, 'wm_excel-imports').includes(ModeEnum.Read)
                    ? {
                          key: 'administration-excel-import',
                          label: <Link href="/excel-imports">{t('excel-imports')}</Link>
                      }
                    : null,
                // SCHEDULER CONFIG
                getModesFromPermissions(permissions, 'wm_scheduler-configs').includes(ModeEnum.Read)
                    ? {
                          key: 'administration-scheduler-configs',
                          label: <Link href="/scheduler-configs">{t('scheduler-configs')}</Link>
                      }
                    : null
            ].filter(Boolean)
        },
        // CONFIGURATION
        [
            'wm_buildings',
            'wm_blocks',
            'wm_locations',
            'wm_patterns',
            'wm_pattern-paths',
            'wm_conversions',
            'wm_handling-unit-models',
            'wm_equipment',
            'wm_stock-statuses',
            'wm_bank-accounts',
            'wm_currencies',
            'wm_payment-terms',
            'wm_payment-methods',
            'wm_vat-rates',
            'wm_price-types',
            'wm_shipping-modes',
            'wm_round-calculation-profiles',
            'wm_stock-owners',
            'wm_action-codes',
            'wm_return-codes',
            'wm_rules',
            'wm_third-parties',
            'wm_carriers'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'configuration',
            icon: <SettingOutlined />,
            label: t('configuration'),
            children: [
                // CARTOGRAPHY
                [
                    'wm_buildings',
                    'wm_blocks',
                    'wm_locations',
                    'wm_patterns',
                    'wm_pattern-paths'
                ].some((perm) =>
                    getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
                ) && {
                    key: 'configuration-cartography',
                    label: t('cartography'),
                    children: [
                        // BUILDINGS
                        getModesFromPermissions(permissions, 'wm_buildings').includes(ModeEnum.Read)
                            ? {
                                  key: 'configuration-buildings',
                                  label: <Link href="/buildings">{t('buildings')}</Link>
                              }
                            : null,
                        // BLOCKS
                        getModesFromPermissions(permissions, 'wm_blocks').includes(ModeEnum.Read)
                            ? {
                                  key: 'configuration-cartography-blocks',
                                  label: <Link href="/blocks">{t('blocks')}</Link>
                              }
                            : null,
                        // LOCATIONS
                        getModesFromPermissions(permissions, 'wm_locations').includes(ModeEnum.Read)
                            ? {
                                  key: 'configuration-cartography-locations',
                                  label: <Link href="/locations">{t('locations')}</Link>
                              }
                            : null,
                        // PATTERNS
                        getModesFromPermissions(permissions, 'wm_patterns').includes(ModeEnum.Read)
                            ? {
                                  key: 'configuration-cartography-patterns',
                                  label: <Link href="/patterns">{t('patterns')}</Link>
                              }
                            : null,
                        // PATTERN PATHS
                        getModesFromPermissions(permissions, 'wm_pattern-paths').includes(
                            ModeEnum.Read
                        )
                            ? {
                                  key: 'configuration-cartography-pattern-paths',
                                  label: <Link href="/pattern-paths">{t('pattern-paths')}</Link>
                              }
                            : null
                    ].filter(Boolean)
                },
                //CONVERSIONS
                getModesFromPermissions(permissions, 'wm_conversions').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-conversions',
                          label: <Link href="/conversions">{t('conversions')}</Link>
                      }
                    : null,
                // PACKAGINGS
                getModesFromPermissions(permissions, 'wm_handling-unit-models').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'configuration-handling-unit-models',
                          label: (
                              <Link href="/handling-unit-models">{t('handling-unit-models')}</Link>
                          )
                      }
                    : null,
                // EQUIPMENT
                getModesFromPermissions(permissions, 'wm_equipment').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-equipment',
                          label: <Link href="/equipment">{t('equipment')}</Link>
                      }
                    : null,
                // STOCK STATUSES
                getModesFromPermissions(permissions, 'wm_stock-statuses').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-stock-statuses',
                          label: <Link href="/stock-statuses">{t('stock-statuses')}</Link>
                      }
                    : null,
                // BUSINESS MANAGEMENT
                [
                    'wm_bank-accounts',
                    'wm_currencies',
                    'wm_payment-terms',
                    'wm_payment-methods',
                    'wm_vat-rates',
                    'wm_price-types'
                ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read))
                    ? {
                          key: 'configuration-business-management',
                          label: t('business-management'),
                          children: [
                              // BANK ACCOUNTS
                              getModesFromPermissions(permissions, 'wm_bank-accounts').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-bank-accounts',
                                  label: <Link href="/bank-accounts">{t('bank-accounts')}</Link>
                              },
                              // CURRENCIES
                              getModesFromPermissions(permissions, 'wm_currencies').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-currencies',
                                  label: <Link href="/currencies">{t('currencies')}</Link>
                              },
                              // PAYMENT TERMS
                              getModesFromPermissions(permissions, 'wm_payment-terms').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-payment-terms',
                                  label: <Link href="/payment-terms">{t('payment-terms')}</Link>
                              },
                              // PAYMENT METHODS
                              getModesFromPermissions(permissions, 'wm_payment-methods').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-payment-methods',
                                  label: <Link href="/payment-methods">{t('payment-methods')}</Link>
                              },
                              // VAT RATES
                              getModesFromPermissions(permissions, 'wm_vat-rates').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-vat-rates',
                                  label: <Link href="/vat-rates">{t('vat-rates')}</Link>
                              },
                              // PRICE TYPES
                              getModesFromPermissions(permissions, 'wm_price-types').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-price-types',
                                  label: <Link href="/price-types">{t('price-types')}</Link>
                              }
                          ]
                      }
                    : null,
                // SHIPPING MODES
                getModesFromPermissions(permissions, 'wm_shipping-modes').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-shipping-modes',
                          label: <Link href="/shipping-modes">{t('shipping-modes')}</Link>
                      }
                    : null,
                // ROUND CALCULATION PROFILES
                getModesFromPermissions(permissions, 'wm_round-calculation-profiles').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'configuration-round-calculation-profiles',
                          label: (
                              <Link href="/round-calculation-profiles">
                                  {t('round-calculation-profiles')}
                              </Link>
                          )
                      }
                    : null,
                // STOCK OWNER
                getModesFromPermissions(permissions, 'wm_stock-owners').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-stock-owners',
                          label: <Link href="/stock-owners">{t('stock-owners')}</Link>
                      }
                    : null,
                // RETURNS
                ['wm_action-codes', 'wm_return-codes'].some((perm) =>
                    getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
                )
                    ? {
                          key: 'configuration-return',
                          label: t('returns'),
                          children: [
                              // ACTION CODES
                              getModesFromPermissions(permissions, 'wm_action-codes').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-action-codes',
                                  label: <Link href="/action-codes">{t('action-codes')}</Link>
                              },
                              // RETURN CODES
                              getModesFromPermissions(permissions, 'wm_return-codes').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'configuration-return-codes',
                                  label: <Link href="/return-codes">{t('return-codes')}</Link>
                              }
                          ]
                      }
                    : null,
                // RULES
                getModesFromPermissions(permissions, 'wm_rules').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-rules',
                          label: <Link href="/rules">{t('rules')}</Link>
                      }
                    : null,
                // THIRD PARTIES
                getModesFromPermissions(permissions, 'wm_third-parties').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-third-parties',
                          label: <Link href="/third-parties">{t('third-parties')}</Link>
                      }
                    : null,
                // CARRIERS
                getModesFromPermissions(permissions, 'wm_carriers').includes(ModeEnum.Read)
                    ? {
                          key: 'configuration-carriers',
                          label: <Link href="/carriers">{t('carriers')}</Link>
                      }
                    : null
            ].filter(Boolean)
        },
        // MENU ARTICLES
        [
            'wm_articles',
            'wm_article-sets',
            'wm_articles-families',
            'wm_articles-subfamilies',
            'wm_barcodes',
            'wm_logistic-units',
            'wm_article-prices',
            'wm_article-price-histories',
            'wm_feature-codes',
            'wm_feature-types'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'articles',
            icon: <AppstoreAddOutlined />,
            label: t('articles'),
            children: [
                // ARTICLES
                getModesFromPermissions(permissions, 'wm_articles').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-articles',
                          label: <Link href="/articles">{t('articles')}</Link>
                      }
                    : null,
                // ARTICLE SETS
                getModesFromPermissions(permissions, 'wm_article-sets').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-sets',
                          label: <Link href="/article-sets">{t('sets')}</Link>
                      }
                    : null,
                // ARTICLE FAMILIES
                getModesFromPermissions(permissions, 'wm_articles-families').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-families',
                          label: <Link href="/articles-families">{t('articles-families')}</Link>
                      }
                    : null,
                // ARTICLE SUB-FAMILIES
                getModesFromPermissions(permissions, 'wm_articles-subfamilies').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'articles-subfamilies',
                          label: (
                              <Link href="/articles-subfamilies">{t('articles-subfamilies')}</Link>
                          )
                      }
                    : null,
                // BARCODES
                getModesFromPermissions(permissions, 'wm_barcodes').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-barcodes',
                          label: <Link href="/barcodes">{t('barcodes')}</Link>
                      }
                    : null,
                // LOGISTIC UNIT MODELS
                getModesFromPermissions(permissions, 'wm_logistic-units').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-logistic-unit-models',
                          label: <Link href="/logistic-units">{t('logistic-unit-models')}</Link>
                      }
                    : null,
                // ARTICLE PRICES
                getModesFromPermissions(permissions, 'wm_article-prices').includes(ModeEnum.Read)
                    ? {
                          key: 'articles-article-prices',
                          label: <Link href="/article-prices">{t('article-prices')}</Link>
                      }
                    : null,
                // ARTICLE PRICE HISTORIES
                getModesFromPermissions(permissions, 'wm_article-price-histories').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'articles-article-price-histories',
                          label: (
                              <Link href="/article-price-histories">
                                  {t('article-price-histories')}
                              </Link>
                          )
                      }
                    : null,
                // FEATURES
                ['wm_feature-codes', 'wm_feature-types'].some((perm) =>
                    getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
                ) && {
                    key: 'articles-features',
                    label: t('features'),
                    children: [
                        // FEATURE CODES
                        getModesFromPermissions(permissions, 'wm_feature-codes').includes(
                            ModeEnum.Read
                        )
                            ? {
                                  key: 'articles-feature-codes',
                                  label: <Link href="/feature-codes">{t('feature-codes')}</Link>
                              }
                            : null,
                        // FEATURE TYPES
                        getModesFromPermissions(permissions, 'wm_feature-types').includes(
                            ModeEnum.Read
                        )
                            ? {
                                  key: 'articles-feature-types',
                                  label: <Link href="/feature-types">{t('features-types')}</Link>
                              }
                            : null
                    ].filter(Boolean)
                }
            ].filter(Boolean)
        },
        // STOCK MANAGEMENT
        [
            'wm_goods-ins',
            'wm_handling-unit-contents',
            'wm_dummy-hu-generator',
            'wm_cycle-counts',
            'wm_recommended-cycle-counts',
            'wm_movements',
            'wm_purchase-orders',
            'wm_handling-unit-content-features',
            'wm_cumulated-stock'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'stock-management',
            icon: <ApartmentOutlined />,
            label: t('stock-management'),
            children: [
                // GOODS-INS
                getModesFromPermissions(permissions, 'wm_goods-ins').includes(ModeEnum.Read)
                    ? {
                          key: 'stock-management-goods-ins',
                          label: <Link href="/goods-ins">{t('goods-ins')}</Link>
                      }
                    : null,
                // CONTENTS
                getModesFromPermissions(permissions, 'wm_handling-unit-contents').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'stock-management-contents',
                          label: <Link href="/handling-unit-contents">{t('contents')}</Link>
                      }
                    : null,
                // HANDLING UNIT GENERATOR
                getModesFromPermissions(permissions, 'wm_dummy-hu-generator').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'dummy-hu-generator',
                          label: <Link href="/dummy-hu-generator">{t('dummy-hu-generator')}</Link>
                      }
                    : null,
                // MENU CYCLE COUNTS
                ['wm_cycle-counts', 'wm_recommended-cycle-counts'].some((perm) =>
                    getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
                )
                    ? {
                          key: 'stock-management-cycle-counts',
                          label: t('cycle-counts'),
                          children: [
                              // CYCLE COUNTS
                              getModesFromPermissions(permissions, 'wm_cycle-counts').includes(
                                  ModeEnum.Read
                              ) && {
                                  key: 'stock-management-cycle-counts-cyle-counts',
                                  label: <Link href="/cycle-counts">{t('cycle-counts')}</Link>
                              },
                              // RECOMMENDED CYCLE COUNTS
                              getModesFromPermissions(
                                  permissions,
                                  'wm_recommended-cycle-counts'
                              ).includes(ModeEnum.Read) && {
                                  key: 'stock-management-cycle-counts-recommended',
                                  label: (
                                      <Link href="/recommended-cycle-counts">
                                          {t('recommended')}
                                      </Link>
                                  )
                              }
                          ]
                      }
                    : null,
                // MOVEMENTS
                getModesFromPermissions(permissions, 'wm_movements').includes(ModeEnum.Read)
                    ? {
                          key: 'stock-management-movements',
                          label: <Link href="/movements">{t('movements')}</Link>
                      }
                    : null,
                // RECEPTIONS
                getModesFromPermissions(permissions, 'wm_purchase-orders').includes(ModeEnum.Read)
                    ? {
                          key: 'stock-management-purchase-orders',
                          label: <Link href="/purchase-orders">{t('purchase-orders')}</Link>
                      }
                    : null,
                // FEATURES IN STOCK
                getModesFromPermissions(permissions, 'wm_handling-unit-content-features').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'stock-management-features',
                          label: (
                              <Link href="/handling-unit-content-features">
                                  {t('features-in-stock')}
                              </Link>
                          )
                      }
                    : null,
                // CUMULATED STOCK
                getModesFromPermissions(permissions, 'wm_cumulated-stock').includes(ModeEnum.Read)
                    ? {
                          key: 'stock-management-cumulated-stock',
                          label: <Link href="/cumulated-stock">{t('cumulated-stock')}</Link>
                      }
                    : null
            ].filter(Boolean)
        },
        // BUSINESS MANAGEMENT
        ['wm_credits', 'wm_customer-orders', 'wm_payments'].some((perm) =>
            getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)
        ) && {
            key: 'business-management',
            icon: <DeploymentUnitOutlined />,
            label: t('business-management'),
            children: [
                // CREDITS
                getModesFromPermissions(permissions, 'wm_credits').includes(ModeEnum.Read)
                    ? {
                          key: 'business-management-credits',
                          label: <Link href="/credits">{t('credits')}</Link>
                      }
                    : null,
                // CUSTOMER ORDERS
                getModesFromPermissions(permissions, 'wm_customer-orders').includes(ModeEnum.Read)
                    ? {
                          key: 'business-management-orders',
                          label: <Link href="/customer-orders">{t('customer-orders')}</Link>
                      }
                    : null,
                // PAYMENTS
                getModesFromPermissions(permissions, 'wm_payments').includes(ModeEnum.Read)
                    ? {
                          key: 'business-management-payments',
                          label: <Link href="/payments">{t('payments')}</Link>
                      }
                    : null
            ].filter(Boolean)
        },
        // PREPARATION
        [
            'wm_loads',
            'wm_handling-unit-outbound-barcodes',
            'wm_boxes',
            'wm_deliveries',
            'wm_manual-allocation',
            'wm_shipping-units',
            'wm_rounds'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'preparation-management',
            icon: <HourglassOutlined />,
            label: t('preparation-management'),
            children: [
                // LOADS
                getModesFromPermissions(permissions, 'wm_loads').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-management-loads',
                          label: <Link href="/loads">{t('loads')}</Link>
                      }
                    : null,
                // BOX BARCODES
                getModesFromPermissions(permissions, 'wm_handling-unit-outbound-barcodes').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'preparation-management-handling-unit-outbound-barcodes',
                          label: (
                              <Link href="/handling-unit-outbound-barcodes">
                                  {t('handling-unit-outbound-barcodes')}
                              </Link>
                          )
                      }
                    : null,
                // BOXES
                getModesFromPermissions(permissions, 'wm_boxes').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-management-boxes',
                          label: <Link href="/boxes">{t('boxes')}</Link>
                      }
                    : null,
                // DELIVERIES
                getModesFromPermissions(permissions, 'wm_deliveries').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-management-deliveries',
                          label: <Link href="/deliveries">{t('deliveries')}</Link>
                      }
                    : null,
                // MANUAl ALLOCATION
                getModesFromPermissions(permissions, 'wm_manual-allocation').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-deliveries-manual-allocation',
                          label: (
                              <Link href="/deliveries/manual-allocation">
                                  {t('manual-allocation')}
                              </Link>
                          )
                      }
                    : null,
                // SHIPPING PALLETS
                getModesFromPermissions(permissions, 'wm_shipping-units').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-management-shipping-units',
                          label: <Link href="/shipping-units">{t('shipping-units')}</Link>
                      }
                    : null,
                // ROUNDS
                getModesFromPermissions(permissions, 'wm_rounds').includes(ModeEnum.Read)
                    ? {
                          key: 'preparation-management-rounds',
                          label: <Link href="/rounds">{t('rounds')}</Link>
                      }
                    : null
            ].filter(Boolean)
        },
        // MONITORING
        [
            'wm_record-history',
            'wm_document-histories',
            'wm_status-history',
            'wm_metabase',
            'wm_notifications',
            'wm_dashboard'
        ].some((perm) => getModesFromPermissions(permissions, perm).includes(ModeEnum.Read)) && {
            key: 'monitoring',
            icon: <SlidersOutlined />,
            label: t('monitoring'),
            children: [
                // HISTORY
                getModesFromPermissions(permissions, 'wm_record-history').includes(ModeEnum.Read)
                    ? {
                          key: 'monitoring-record-history',
                          label: <Link href="/record-history">{t('record-history')}</Link>
                      }
                    : null,
                // DOCUMENT HISTORIES
                getModesFromPermissions(permissions, 'wm_document-histories').includes(
                    ModeEnum.Read
                )
                    ? {
                          key: 'monitoring-document-history',
                          label: <Link href="/document-histories">{t('document-histories')}</Link>
                      }
                    : null,
                // STATUS HISTORY
                getModesFromPermissions(permissions, 'wm_status-history').includes(ModeEnum.Read)
                    ? {
                          key: 'monitoring-status-history',
                          label: <Link href="/status-history">{t('status-history')}</Link>
                      }
                    : null,
                // METABASE
                getModesFromPermissions(permissions, 'wm_metabase').includes(ModeEnum.Read) && {
                    key: 'monitoring-metabase',
                    label: <Link href={bi_link}>{t('bi-solution')}</Link>
                },
                // NOTIFICATIONS
                getModesFromPermissions(permissions, 'wm_notifications').includes(ModeEnum.Read)
                    ? {
                          key: 'monitoring-notifications',
                          label: <Link href="/notifications">{t('notifications')}</Link>
                      }
                    : null,
                // DASHBOARD
                getModesFromPermissions(permissions, 'wm_dashboard').includes(ModeEnum.Read) && {
                    key: 'monitoring-dashboard',
                    label: <Link href="/dashboard">{t('dashboard')}</Link>
                }
            ].filter(Boolean)
        },
        // ABOUT
        {
            key: 'about',
            icon: <QuestionCircleOutlined />,
            label: <Link href="/about">{t('about')}</Link>
        },
        // LOGOUT
        {
            key: 'logout',
            icon: <ExportOutlined />,
            label: t('logout'),
            onClick: () => logout()
        },
        {
            key: 'end'
        } // Need an empty item for scroll behavior
    ].filter(Boolean) as ItemType<MenuItemType>[];

    return <StyledMenu mode="inline" className="menu" items={menuItems} />;
};

SideMenu.displayName = 'SideMenu';

export { SideMenu };
