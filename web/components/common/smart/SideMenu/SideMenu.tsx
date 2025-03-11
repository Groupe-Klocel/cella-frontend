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
        {
            key: 'administration',
            icon: <AuditOutlined />,
            label: t('administration'),
            children: [
                getModesFromPermissions(permissions, Table.Config).includes(ModeEnum.Read) && {
                    key: 'administration-configurations',
                    label: <Link href="/configurations">{t('configurations')}</Link>
                },
                {
                    key: 'administration-access-management',
                    label: t('access-management'),
                    children: [
                        getModesFromPermissions(permissions, Table.Role).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'administration-access-management-roles',
                            label: <Link href="/roles">{t('roles')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.WarehouseWorker).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'administration-access-management-warehouse-workers',
                            label: <Link href="/warehouse-workers">{t('warehouse-workers')}</Link>
                        }
                    ].filter(Boolean)
                },
                getModesFromPermissions(permissions, Table.HookConfig).includes(ModeEnum.Read) && {
                    key: 'administration-hook-configs',
                    label: <Link href="/hook-configs">{t('hook-configs')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'administration-parameters',
                    label: <Link href="/parameters">{t('parameters')}</Link>
                },
                {
                    key: 'administration-excel-import',
                    label: <Link href="/excel-imports">{t('excel-imports')}</Link>
                },
                getModesFromPermissions(permissions, Table.SchedulerConfig).includes(
                    ModeEnum.Read
                ) && {
                    key: 'administration-scheduler-configs',
                    label: <Link href="/scheduler-configs">{t('scheduler-configs')}</Link>
                }
            ].filter(Boolean)
        },
        {
            key: 'configuration',
            icon: <SettingOutlined />,
            label: t('configuration'),
            children: [
                {
                    key: 'configuration-cartography',
                    label: t('cartography'),
                    children: [
                        getModesFromPermissions(permissions, Table.Building).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'configuration-buildings',
                            label: <Link href="/buildings">{t('buildings')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.Block).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'configuration-cartography-blocks',
                            label: <Link href="/blocks">{t('blocks')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.Location).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'configuration-cartography-locations',
                            label: <Link href="/locations">{t('locations')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.Pattern).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'configuration-cartography-patterns',
                            label: <Link href="/patterns">{t('patterns')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.PatternPath).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'configuration-cartography-pattern-paths',
                            label: <Link href="/pattern-paths">{t('pattern-paths')}</Link>
                        }
                    ].filter(Boolean)
                },
                getModesFromPermissions(permissions, Table.Conversion).includes(ModeEnum.Read) && {
                    key: 'configuration-conversions',
                    label: <Link href="/conversions">{t('conversions')}</Link>
                },
                getModesFromPermissions(permissions, Table.HandlingUnitModel).includes(
                    ModeEnum.Read
                ) && {
                    key: 'configuration-handling-unit-models',
                    label: <Link href="/handling-unit-models">{t('handling-unit-models')}</Link>
                },
                getModesFromPermissions(permissions, Table.Equipment).includes(ModeEnum.Read) && {
                    key: 'configuration-equipment',
                    label: <Link href="/equipment">{t('equipment')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'configuration-stock-statuses',
                    label: <Link href="/stock-statuses">{t('stock-statuses')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'configuration-business-management',
                    label: t('business-management'),
                    children: [
                        {
                            key: 'configuration-bank-accounts',
                            label: <Link href="/bank-accounts">{t('bank-accounts')}</Link>
                        },
                        {
                            key: 'configuration-currencies',
                            label: <Link href="/currencies">{t('currencies')}</Link>
                        },
                        {
                            key: 'configuration-payment-terms',
                            label: <Link href="/payment-terms">{t('payment-terms')}</Link>
                        },
                        {
                            key: 'configuration-payment-methods',
                            label: <Link href="/payment-methods">{t('payment-methods')}</Link>
                        },
                        {
                            key: 'configuration-vat-rates',
                            label: <Link href="/vat-rates">{t('vat-rates')}</Link>
                        },
                        {
                            key: 'configuration-price-types',
                            label: <Link href="/price-types">{t('price-types')}</Link>
                        }
                    ]
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'configuration-shipping-modes',
                    label: <Link href="/shipping-modes">{t('shipping-modes')}</Link>
                },
                getModesFromPermissions(permissions, Table.StockOwner).includes(ModeEnum.Read) && {
                    key: 'configuration-stock-owners',
                    label: <Link href="/stock-owners">{t('stock-owners')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'configuration-return',
                    label: t('returns'),
                    children: [
                        {
                            key: 'configuration-action-codes',
                            label: <Link href="/action-codes">{t('action-codes')}</Link>
                        },
                        {
                            key: 'configuration-return-codes',
                            label: <Link href="/return-codes">{t('return-codes')}</Link>
                        }
                    ]
                },
                getModesFromPermissions(permissions, Table.Rule).includes(ModeEnum.Read) && {
                    key: 'configuration-rules',
                    label: <Link href="/rules">{t('rules')}</Link>
                },
                getModesFromPermissions(permissions, Table.ThirdParty).includes(ModeEnum.Read) && {
                    key: 'configuration-third-parties',
                    label: <Link href="/third-parties">{t('third-parties')}</Link>
                },
                getModesFromPermissions(permissions, Table.Carrier).includes(ModeEnum.Read) && {
                    key: 'configuration-carriers',
                    label: <Link href="/carriers">{t('carriers')}</Link>
                }
            ].filter(Boolean)
        },
        {
            key: 'articles',
            icon: <AppstoreAddOutlined />,
            label: t('articles'),
            children: [
                getModesFromPermissions(permissions, Table.Article).includes(ModeEnum.Read) && {
                    key: 'articles-articles',
                    label: <Link href="/articles">{t('articles')}</Link>
                },
                getModesFromPermissions(permissions, Table.ArticleSet).includes(ModeEnum.Read) && {
                    key: 'articles-sets',
                    label: <Link href="/article-sets">{t('sets')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'articles-families',
                    label: <Link href="/articles-families">{t('articles-families')}</Link>
                },
                getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) && {
                    key: 'articles-subfamilies',
                    label: <Link href="/articles-subfamilies">{t('articles-subfamilies')}</Link>
                },
                getModesFromPermissions(permissions, Table.Barcode).includes(ModeEnum.Read) && {
                    key: 'articles-barcodes',
                    label: <Link href="/barcodes">{t('barcodes')}</Link>
                },
                getModesFromPermissions(permissions, Table.LogisticUnit).includes(
                    ModeEnum.Read
                ) && {
                    key: 'articles-logistic-unit-models',
                    label: <Link href="/logistic-units">{t('logistic-unit-models')}</Link>
                },
                getModesFromPermissions(permissions, Table.ArticlePrice).includes(
                    ModeEnum.Read
                ) && {
                    key: 'articles-article-prices',
                    label: <Link href="/article-prices">{t('article-prices')}</Link>
                },
                getModesFromPermissions(permissions, Table.ArticlePriceHistory).includes(
                    ModeEnum.Read
                ) && {
                    key: 'articles-article-price-histories',
                    label: (
                        <Link href="/article-price-histories">{t('article-price-histories')}</Link>
                    )
                },
                {
                    key: 'articles-features',
                    label: t('features'),
                    children: [
                        getModesFromPermissions(permissions, Table.FeatureCode).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'articles-feature-codes',
                            label: <Link href="/feature-codes">{t('feature-codes')}</Link>
                        },
                        getModesFromPermissions(permissions, Table.FeatureTypeDetail).includes(
                            ModeEnum.Read
                        ) && {
                            key: 'articles-feature-types',
                            label: <Link href="/feature-types">{t('features-types')}</Link>
                        }
                    ].filter(Boolean)
                }
            ].filter(Boolean)
        },
        {
            key: 'stock-management',
            icon: <ApartmentOutlined />,
            label: t('stock-management'),
            children: [
                getModesFromPermissions(permissions, Table.HandlingUnitInbound).includes(
                    ModeEnum.Read
                ) && {
                    key: 'stock-management-goods-ins',
                    label: <Link href="/goods-ins">{t('goods-ins')}</Link>
                },
                getModesFromPermissions(permissions, Table.HandlingUnitContent).includes(
                    ModeEnum.Read
                ) && {
                    key: 'stock-management-contents',
                    label: <Link href="/handling-unit-contents">{t('contents')}</Link>
                },
                getModesFromPermissions(permissions, Table.HandlingUnit).includes(
                    ModeEnum.Read
                ) && {
                    key: 'dummy-hu-generator',
                    label: <Link href="/dummy-hu-generator">{t('dummy-hu-generator')}</Link>
                },
                getModesFromPermissions(permissions, Table.CycleCount).includes(ModeEnum.Read) && {
                    key: 'stock-management-cycle-counts',
                    label: t('cycle-counts'),
                    children: [
                        {
                            key: 'stock-management-cycle-counts-cyle-counts',
                            label: <Link href="/cycle-counts">{t('cycle-counts')}</Link>
                        },
                        {
                            key: 'stock-management-cycle-counts-recommended',
                            label: <Link href="/recommended-cycle-counts">{t('recommended')}</Link>
                        }
                    ]
                },
                getModesFromPermissions(permissions, Table.Movement).includes(ModeEnum.Read) && {
                    key: 'stock-management-movements',
                    label: <Link href="/movements">{t('movements')}</Link>
                },
                getModesFromPermissions(permissions, Table.PurchaseOrder).includes(
                    ModeEnum.Read
                ) && {
                    key: 'stock-management-purchase-orders',
                    label: <Link href="/purchase-orders">{t('purchase-orders')}</Link>
                },
                getModesFromPermissions(permissions, Table.HandlingUnitContentFeature).includes(
                    ModeEnum.Read
                ) && {
                    key: 'stock-management-features',
                    label: (
                        <Link href="/handling-unit-content-features">{t('features-in-stock')}</Link>
                    )
                }
            ].filter(Boolean)
        },
        {
            key: 'business-management',
            icon: <DeploymentUnitOutlined />,
            label: t('business-management'),
            children: [
                getModesFromPermissions(permissions, Table.Order).includes(ModeEnum.Read) && {
                    key: 'business-management-credits',
                    label: <Link href="/credits">{t('credits')}</Link>
                },
                getModesFromPermissions(permissions, Table.Order).includes(ModeEnum.Read) && {
                    key: 'business-management-orders',
                    label: <Link href="/customer-orders">{t('customer-orders')}</Link>
                },
                getModesFromPermissions(permissions, Table.Payment).includes(ModeEnum.Read) && {
                    key: 'business-management-payments',
                    label: <Link href="/payments">{t('payments')}</Link>
                }
            ].filter(Boolean)
        },
        {
            key: 'preparation-management',
            icon: <HourglassOutlined />,
            label: t('preparation-management'),
            children: [
                getModesFromPermissions(permissions, Table.Load).includes(ModeEnum.Read) && {
                    key: 'preparation-management-loads',
                    label: <Link href="/loads">{t('loads')}</Link>
                },
                getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) && {
                    key: 'preparation-management-boxes',
                    label: <Link href="/boxes">{t('boxes')}</Link>
                },
                getModesFromPermissions(permissions, Table.Delivery).includes(ModeEnum.Read) && {
                    key: 'preparation-management-deliveries',
                    label: <Link href="/deliveries">{t('deliveries')}</Link>
                },
                getModesFromPermissions(permissions, Table.Delivery).includes(ModeEnum.Read) && {
                    key: 'preparation-deliveries-manual-allocation',
                    label: (
                        <Link href="/deliveries/manual-allocation">{t('manual-allocation')}</Link>
                    )
                },
                getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) && {
                    key: 'preparation-management-shipping-units',
                    label: <Link href="/shipping-units">{t('shipping-units')}</Link>
                },
                getModesFromPermissions(permissions, Table.Round).includes(ModeEnum.Read) && {
                    key: 'preparation-management-rounds',
                    label: <Link href="/rounds">{t('rounds')}</Link>
                }
            ].filter(Boolean)
        },
        {
            key: 'monitoring',
            icon: <SlidersOutlined />,
            label: t('monitoring'),
            children: [
                getModesFromPermissions(permissions, Table.RecordHistory).includes(
                    ModeEnum.Read
                ) && {
                    key: 'monitoring-record-history',
                    label: <Link href="/record-history">{t('record-history')}</Link>
                },
                getModesFromPermissions(permissions, Table.DocumentHistory).includes(
                    ModeEnum.Read
                ) && {
                    key: 'monitoring-document-history',
                    label: <Link href="/document-histories">{t('document-histories')}</Link>
                },
                getModesFromPermissions(permissions, Table.StatusHistory).includes(
                    ModeEnum.Read
                ) && {
                    key: 'monitoring-status-history',
                    label: <Link href="/status-history">{t('status-history')}</Link>
                },
                {
                    key: 'monitoring-metabase',
                    label: <Link href={bi_link}>{t('bi-solution')}</Link>
                },
                getModesFromPermissions(permissions, Table.Notification).includes(
                    ModeEnum.Read
                ) && {
                    key: 'monitoring-notifications',
                    label: <Link href="/notifications">{t('notifications')}</Link>
                },
                {
                    key: 'monitoring-dashboard',
                    label: <Link href="/dashboard">{t('dashboard')}</Link>
                }
            ].filter(Boolean)
        },
        {
            key: 'about',
            icon: <QuestionCircleOutlined />,
            label: <Link href="/about">{t('about')}</Link>
        },
        {
            key: 'logout',
            icon: <ExportOutlined />,
            label: t('logout'),
            onClick: () => logout()
        },
        {
            key: 'end'
        } // Need an empty item for scroll behavior
    ];

    return <StyledMenu mode="inline" className="menu" items={menuItems} />;
};

SideMenu.displayName = 'SideMenu';

export { SideMenu };
