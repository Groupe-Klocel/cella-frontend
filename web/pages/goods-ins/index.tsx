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
import { AppHead, LinkButton } from '@components';
import moment from 'moment';
import 'moment/min/locales';
import { getModesFromPermissions, META_DEFAULTS, pathParams, showError } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';
import { FormDataType } from 'models/Models';
import { GoodsInModel } from 'models/GoodsInModel';
import { goodsInsRoutes } from 'modules/GoodsIns/Static/goodsInsRoutes';
import { Button, Space } from 'antd';
import { EyeTwoTone, PrinterOutlined } from '@ant-design/icons';

type PageComponent = FC & { layout: typeof MainLayout };

const GoodsInsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, GoodsInModel.tableName);

    const headerData: HeaderData = {
        title: t('common:goods-ins'),
        routes: goodsInsRoutes,
        actionsComponent: undefined
    };

    const printGoodsIns = async (goodsInId: string) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        const res = await fetch(`/api/goods-ins/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goodsInId,
                dateLocal
            })
        });

        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={GoodsInModel}
                filterFields={[
                    {
                        name: 'name',
                        type: FormDataType.String
                    },
                    {
                        name: 'purchaseOrder_Name',
                        type: FormDataType.String
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={pathParams('/goods-ins/[id]', record.id)}
                                />
                                <Button
                                    onClick={() => {
                                        printGoodsIns(record.id);
                                    }}
                                    icon={<PrinterOutlined />}
                                />
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={'/goods-ins/:id'}
                sortDefault={[{ field: 'created', ascending: false }]}
            />
        </>
    );
};

GoodsInsPage.layout = MainLayout;

export default GoodsInsPage;
