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
import { EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { ArticlePriceHistoryModelV2 as model } from 'models/ArticlePriceHistoryModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { articlePriceHistoriesRoutes as itemRoutes } from 'modules/ArticlePriceHistories/Static/articlePriceHistoriesRoutes';
type PageComponent = FC & { layout: typeof MainLayout };

const ArticlePriceHistoriesPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:article-price-histories'),
        routes: itemRoutes,
        actionsComponent: null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; system: boolean }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
        </>
    );
};

ArticlePriceHistoriesPage.layout = MainLayout;

export default ArticlePriceHistoriesPage;
