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
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';
import { HeaderContent, MenuItem, NavButton } from '@components';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';

type PageComponent = FC & { layout: typeof MainLayout };

const StockManagementPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();

    type MenuItemData = { title: string; path: string | { pathname: string; query: any } };

    const menuItemDatas: MenuItemData[] = [
        getModesFromPermissions(permissions, 'mobile_reception-movement').includes(
            ModeEnum.Read
        ) && {
            title: 'menu:reception-movement',
            path: '/reception-movement'
        },
        getModesFromPermissions(permissions, 'mobile_reception-content-movement').includes(
            ModeEnum.Read
        ) && {
            title: 'menu:reception-content-movement',
            path: pathParamsFromDictionary('/content-movement', {
                originLocation: 'defaultReception'
            })
        },
        getModesFromPermissions(permissions, 'mobile_content-movement').includes(ModeEnum.Read) && {
            title: 'menu:content-movement',
            path: '/content-movement'
        },
        getModesFromPermissions(permissions, 'mobile_hu-movement').includes(ModeEnum.Read) && {
            title: 'menu:hu-movement',
            path: '/hu-movement'
        },
        // {
        //     title: 'menu:replenishment-movement',
        //     path: '/'
        // },
        getModesFromPermissions(permissions, 'mobile_cycle-counts').includes(ModeEnum.Read) && {
            title: 'menu:cycle-counts',
            path: '/cycle-counts'
        }
    ].filter(Boolean) as MenuItemData[];

    return (
        <>
            <HeaderContent
                title={t('menu:stock-management')}
                actionsRight={
                    <NavButton
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push('/')}
                    ></NavButton>
                }
            />
            {menuItemDatas.map(function (data, index) {
                return <MenuItem key={index} title={t(data.title)} path={data.path} />;
            })}
        </>
    );
};

StockManagementPage.layout = MainLayout;

export default StockManagementPage;
