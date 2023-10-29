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
import useTranslation from 'next-translate/useTranslation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

type PageComponent = FC & { layout: typeof MainLayout };

const menuItemDatas = [
    {
        title: 'menu:reception-movement',
        path: '/reception-movement'
    },
    {
        title: 'menu:content-movement',
        path: '/content-movement'
    },
    {
        title: 'menu:hu-movement',
        path: '/hu-movement'
    }
    // {
    //     title: 'menu:pallet-movement',
    //     path: '/pallet-movement'
    // }
    // {
    //     title: 'menu:replenishment-movement',
    //     path: '/'
    // },
    // {
    //     title: 'menu:stock-init',
    //     path: '/'
    // },
    // {
    //     title: 'menu:cycle-counts',
    //     path: '/'
    // },
    // {
    //     title: 'menu:set-unbuilding',
    //     path: '/'
    // },
    // {
    //     title: 'menu:set-building',
    //     path: '/'
    // }
];

const StockManagementPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
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
