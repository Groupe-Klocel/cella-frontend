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
import { Page } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';
import { Row, Col } from 'antd';
import { HeaderContent, MenuCard } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { TagOutlined } from '@ant-design/icons';

type PageComponent = FC & { layout: typeof MainLayout };

const menuDatas = [
    {
        title: 'menu:reception',
        icon: <img src="/images/reception.svg" alt="reception" />,
        path: '/reception-management'
    },
    {
        title: 'menu:stock-management',
        icon: <img src="/images/stock_management.svg" alt="stock_management" />,
        path: '/stock-management'
    },
    {
        title: 'menu:preparation-management',
        icon: <img src="/images/preparation.svg" alt="preparation" width={55} />,
        path: '/preparation-management'
    },
    {
        title: 'menu:misc',
        icon: <img src="/images/misc.svg" alt="info" width={55} />,
        path: '/misc'
    }
];

const HomePage: PageComponent = () => {
    const { t } = useTranslation();
    return (
        <>
            <HeaderContent title={t('common:menu')} />
            {/* Menu items */}
            <Page>
                <Row style={{ alignItems: 'center' }}>
                    {menuDatas.map(function (mdata, index) {
                        return (
                            <Col key={index} xs={12} sm={8} md={6} lg={6}>
                                <MenuCard
                                    title={t(mdata.title)}
                                    icon={mdata.icon}
                                    path={mdata.path}
                                />
                            </Col>
                        );
                    })}
                </Row>
            </Page>
        </>
    );
};

HomePage.layout = MainLayout;

export default HomePage;
