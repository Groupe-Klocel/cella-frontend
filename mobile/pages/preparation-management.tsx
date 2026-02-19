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

const PreparationManagementPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();

    const menuItemDatas = [
        getModesFromPermissions(permissions, 'mobile_round-picking').includes(ModeEnum.Read) && {
            title: 'menu:round-picking',
            path: '/pick'
        },
        getModesFromPermissions(permissions, 'mobile_round-packing').includes(ModeEnum.Read) && {
            title: 'menu:round-packing',
            path: '/pack'
        },
        getModesFromPermissions(permissions, 'mobile_pick-and-pack').includes(ModeEnum.Read) && {
            title: 'menu:pick-and-pack',
            path: '/pick-and-pack'
        },
        getModesFromPermissions(permissions, 'mobile_box-cheking').includes(ModeEnum.Read) && {
            title: 'common:box-checking',
            path: '/box-checking'
        },
        getModesFromPermissions(permissions, 'mobile_box-preparation').includes(ModeEnum.Read) && {
            title: 'menu:box-preparation',
            path: '/box-preparation'
        },
        getModesFromPermissions(permissions, 'mobile_palletization').includes(ModeEnum.Read) && {
            title: 'menu:palletization',
            path: '/palletization'
        },
        getModesFromPermissions(permissions, 'mobile_load').includes(ModeEnum.Read) && {
            title: 'menu:load',
            path: '/loads'
        }
    ].filter(Boolean) as { title: string; path: string }[];

    return (
        <>
            <HeaderContent
                title={t('menu:preparation')}
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

PreparationManagementPage.layout = MainLayout;

export default PreparationManagementPage;
