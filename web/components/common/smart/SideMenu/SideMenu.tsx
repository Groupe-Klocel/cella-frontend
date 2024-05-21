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
    ExportOutlined,
    HourglassOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    SlidersOutlined
} from '@ant-design/icons';
import { useAuth } from 'context/AuthContext';
import { Menu } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import Link from 'next/link';
import React, { FC } from 'react';
import { useAppState } from 'context/AppContext';
import { Table, ModeEnum } from 'generated/graphql';
import { cookie, getModesFromPermissions } from '@helpers';

const { SubMenu } = Menu;

const SideMenu: FC = () => {
    const { t } = useTranslation('menu');
    const { logout } = useAuth();
    const { permissions } = useAppState();

    const checkPermissionExistance = (tableName: string) => {
        if (!permissions) {
            return false;
        }
        const permission = permissions.find((p: any) => {
            return p.table.toUpperCase() == tableName;
        });

        if (permission) {
            return true;
        } else {
            return false;
        }
    };

    const token = cookie.get('token') || '';
    const bi_link = process.env.NEXT_PUBLIC_BI_URL || 'https://bi.cella.cloud';

    return (
        <Menu mode="inline" className="menu">
            <SubMenu icon={<AuditOutlined />} key="administration" title={t('administration')}>
                <SubMenu key="administration-access-management" title={t('access-management')}>
                    {getModesFromPermissions(permissions, Table.WarehouseWorker).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="administration-access-management-warehouse-workers">
                            <Link href="/warehouse-workers">{t('warehouse-workers')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.Role).includes(ModeEnum.Read) ? (
                        <Menu.Item key="administration-access-management-roles">
                            <Link href="/roles">{t('roles')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                </SubMenu>
                {getModesFromPermissions(permissions, Table.Config).includes(ModeEnum.Read) ? (
                    <Menu.Item key="administration-configurations">
                        <Link href="/configurations">{t('configurations')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <Menu.Item key="administration-parameters">
                        <Link href="/parameters">{t('parameters')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HookConfig).includes(ModeEnum.Read) ? (
                    <Menu.Item key="administration-hook-configs">
                        <Link href="/hook-configs">{t('hook-configs')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
            </SubMenu>
            <SubMenu key="configuration" icon={<SettingOutlined />} title={t('configuration')}>
                {getModesFromPermissions(permissions, Table.StockOwner).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-stock-owners">
                        <Link href="/stock-owners">{t('stock-owners')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                <SubMenu key="configuration-cartography" title={t('cartography')}>
                    {getModesFromPermissions(permissions, Table.Building).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="configuration-buildings">
                            <Link href="/buildings">{t('buildings')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.Block).includes(ModeEnum.Read) ? (
                        <Menu.Item key="configuration-cartography-blocks">
                            <Link href="/blocks">{t('blocks')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.Location).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="configuration-cartography-locations">
                            <Link href="/locations">{t('locations')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.Pattern).includes(ModeEnum.Read) ? (
                        <Menu.Item key="configuration-cartography-patterns">
                            <Link href="/patterns">{t('patterns')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.PatternPath).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="configuration-cartography-pattern-paths">
                            <Link href="/pattern-paths">{t('pattern-paths')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                </SubMenu>
                {getModesFromPermissions(permissions, Table.ThirdParty).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-third-parties">
                        <Link href="/third-parties">{t('third-parties')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Carrier).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-carriers">
                        <Link href="/carriers">{t('carriers')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-shipping-modes">
                        <Link href="/shipping-modes">{t('shipping-modes')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-stock-statuses">
                        <Link href="/stock-statuses">{t('stock-statuses')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitModel).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="configuration-handling-unit-models">
                        <Link href="/handling-unit-models">{t('handling-unit-models')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Equipment).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-equipment">
                        <Link href="/equipment">{t('equipment')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <SubMenu key="configuration-return" title={t('returns')}>
                        <Menu.Item key="configuration-return-codes">
                            <Link href="/return-codes">{t('return-codes')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-action-codes">
                            <Link href="/action-codes">{t('action-codes')}</Link>
                        </Menu.Item>
                    </SubMenu>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Conversion).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-conversions">
                        <Link href="/conversions">{t('conversions')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Rule).includes(ModeEnum.Read) ? (
                    <Menu.Item key="configuration-rules">
                        <Link href="/rules">{t('rules')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <SubMenu
                        key="configuration-business-management"
                        title={t('business-management')}
                    >
                        <Menu.Item key="configuration-price-types">
                            <Link href="/price-types">{t('price-types')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-currencies">
                            <Link href="/currencies">{t('currencies')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-payment-terms">
                            <Link href="/payment-terms">{t('payment-terms')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-payment-methods">
                            <Link href="/payment-methods">{t('payment-methods')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-bank-accounts">
                            <Link href="/bank-accounts">{t('bank-accounts')}</Link>
                        </Menu.Item>
                        <Menu.Item key="configuration-vat-rates">
                            <Link href="/vat-rates">{t('vat-rates')}</Link>
                        </Menu.Item>
                    </SubMenu>
                ) : (
                    <></>
                )}
            </SubMenu>
            <SubMenu icon={<AppstoreAddOutlined />} key="articles" title={t('articles')}>
                {getModesFromPermissions(permissions, Table.Article).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-articles">
                        {' '}
                        <Link href="/articles">{t('articles')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                <SubMenu key="articles-features" title={t('features')}>
                    {getModesFromPermissions(permissions, Table.FeatureCode).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="articles-feature-codes">
                            <Link href="/feature-codes">{t('feature-codes')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                    {getModesFromPermissions(permissions, Table.FeatureTypeDetail).includes(
                        ModeEnum.Read
                    ) ? (
                        <Menu.Item key="articles-feature-types">
                            <Link href="/feature-types">{t('features-types')}</Link>
                        </Menu.Item>
                    ) : (
                        <></>
                    )}
                </SubMenu>
                {getModesFromPermissions(permissions, Table.Barcode).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-barcodes">
                        <Link href="/barcodes">{t('barcodes')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {/* {getModesFromPermissions(permissions, Table.Barcode).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-blacklisted-barcodes">
                        <Link href="/blacklisted-barcodes">{t('blacklisted-barcodes')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )} */}
                {getModesFromPermissions(permissions, Table.ArticleSet).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-sets">
                        <Link href="/article-sets">{t('sets')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.LogisticUnit).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="articles-logistic-unit-models">
                        <Link href="/logistic-units">{t('logistic-unit-models')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-articles-families">
                        <Link href="/articles-families">{t('articles-families')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Parameter).includes(ModeEnum.Read) ? (
                    <Menu.Item key="articles-articles-subfamilies">
                        <Link href="/articles-subfamilies">{t('articles-subfamilies')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
            </SubMenu>
            <SubMenu
                icon={<ApartmentOutlined />}
                key="stock-management"
                title={t('stock-management')}
            >
                {getModesFromPermissions(permissions, Table.HandlingUnitContent).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="stock-management-contents">
                        <Link href="/handling-unit-contents">{t('contents')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitContentFeature).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="stock-management-features">
                        <Link href="/handling-unit-content-features">{t('features-in-stock')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.PurchaseOrder).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="stock-management-purchase-orders">
                        <Link href="/purchase-orders">{t('purchase-orders')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitInbound).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="stock-management-goods-ins">
                        <Link href="/goods-ins">{t('goods-ins')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Movement).includes(ModeEnum.Read) ? (
                    <Menu.Item key="stock-management-movements">
                        <Link href="/movements">{t('movements')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.CycleCount).includes(ModeEnum.Read) ? (
                    <SubMenu key="stock-management-cycle-counts" title={t('cycle-counts')}>
                        <Menu.Item key="stock-management-cycle-counts-cyle-counts">
                            <Link href="/cycle-counts">{t('cycle-counts')}</Link>
                        </Menu.Item>
                        <Menu.Item key="stock-management-cycle-counts-recommended">
                            <Link href="/recommended-cycle-counts">{t('recommended')}</Link>
                        </Menu.Item>
                    </SubMenu>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnit).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="dummy-hu-generator">
                        <Link href="/dummy-hu-generator">{t('dummy-hu-generator')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
            </SubMenu>
            <SubMenu
                icon={<HourglassOutlined />}
                key="preparation-management"
                title={t('preparation-management')}
            >
                {getModesFromPermissions(permissions, Table.Delivery).includes(ModeEnum.Read) ? (
                    <Menu.Item key="preparation-management-deliveries">
                        <Link href="/deliveries">{t('deliveries')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="preparation-management-shipping-units">
                        <Link href="/shipping-units">{t('shipping-units')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="preparation-management-boxes">
                        <Link href="/boxes">{t('boxes')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.Round).includes(ModeEnum.Read) ? (
                    <Menu.Item key="preparation-management-rounds">
                        <Link href="/rounds">{t('rounds')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {/* {getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="preparation-management-box-checking">
                        <Link href="/box-checking">{t('box-checking')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.HandlingUnitOutbound).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="preparation-management-manual-recubing">
                        <Link href="/manual-recubing">{t('manual-recubing')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )} */}
                {getModesFromPermissions(permissions, Table.Load).includes(ModeEnum.Read) ? (
                    <Menu.Item key="preparation-management-loads">
                        <Link href="/loads">{t('loads')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
            </SubMenu>
            <SubMenu icon={<SlidersOutlined />} key="monitoring" title={t('monitoring')}>
                {getModesFromPermissions(permissions, Table.RecordHistory).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="monitoring-record-history">
                        <Link href="/record-history">{t('record-history')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.StatusHistory).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="monitoring-status-history">
                        <Link href="/status-history">{t('status-history')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                {getModesFromPermissions(permissions, Table.DocumentHistory).includes(
                    ModeEnum.Read
                ) ? (
                    <Menu.Item key="monitoring-document-history">
                        <Link href="/document-histories">{t('document-histories')}</Link>
                    </Menu.Item>
                ) : (
                    <></>
                )}
                <Menu.Item key="monitoring-dashboard">
                    <Link href="/dashboard">{t('dashboard')}</Link>
                </Menu.Item>
                <Menu.Item key="monitoring-metabase">
                    <Link href={bi_link}>{t('bi-solution')}</Link>
                </Menu.Item>
                <Menu.Item key="monitoring-notifications">
                    <Link href="/notifications">{t('notifications')}</Link>
                </Menu.Item>
            </SubMenu>
            <Menu.Item icon={<QuestionCircleOutlined />} key="about">
                <Link href="/about">{t('about')}</Link>
            </Menu.Item>
            <Menu.Item icon={<ExportOutlined />} key="logout" onClick={() => logout()}>
                {t('logout')}
            </Menu.Item>
            <Menu.Item key="end" /> {/* Need an empty item for scroll behavior */}
        </Menu>
    );
};

SideMenu.displayName = 'SideMenu';

export { SideMenu };
