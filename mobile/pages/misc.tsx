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
import { HeaderContent, MenuItem } from '@components';
import useTranslation from 'next-translate/useTranslation';

type PageComponent = FC & { layout: typeof MainLayout };

const menuItemDatas = [
    // {
    //     title: 'menu:location-check',
    //     path: '/'
    // },
    {
        title: 'menu:article-info',
        path: '/article-info'
    },
    {
        title: 'menu:box-info',
        path: '/box-info'
    },
    {
        title: 'menu:location-info',
        path: '/location-info'
    },
    // {
    //     title: 'menu:box-check',
    //     path: '/'
    // },
    // {
    //     title: 'menu:equipment-check',
    //     path: '/'
    // },
    // {
    //     title: 'menu:set-unbuilding',
    //     path: '/'
    // },
    // {
    //     title: 'menu:set-building',
    //     path: '/'
    // },
    { title: 'menu:generate-sscc', path: '/sscc-generator' }
];

const MiscPage: PageComponent = () => {
    const { t } = useTranslation();
    return (
        <>
            <HeaderContent title={t('menu:misc')} />
            {menuItemDatas.map(function (data, index) {
                return <MenuItem key={index} title={t(data.title)} path={data.path} />;
            })}
        </>
    );
};

MiscPage.layout = MainLayout;

export default MiscPage;
