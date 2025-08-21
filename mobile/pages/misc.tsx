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
import { getModesFromPermissions, useTranslationWithFallback as useTranslation } from '@helpers';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';

type PageComponent = FC & { layout: typeof MainLayout };

const MiscPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();

    const menuItemDatas = [
        getModesFromPermissions(permissions, 'mobile_article-info').includes(ModeEnum.Read) && {
            title: 'menu:article-info',
            path: '/article-info'
        },
        getModesFromPermissions(permissions, 'mobile_shipping-unit-box-info').includes(
            ModeEnum.Read
        ) && {
            title: 'menu:shipping-unit-box-info',
            path: '/box-info'
        },
        getModesFromPermissions(permissions, 'mobile_location-info').includes(ModeEnum.Read) && {
            title: 'menu:location-info',
            path: '/location-info'
        },
        getModesFromPermissions(permissions, 'mobile_hu-info').includes(ModeEnum.Read) && {
            title: 'menu:hu-info',
            path: '/hu-info'
        }
    ].filter((item): item is { title: string; path: string } => Boolean(item));

    return (
        <>
            <HeaderContent
                title={t('menu:misc')}
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

MiscPage.layout = MainLayout;

export default MiscPage;
