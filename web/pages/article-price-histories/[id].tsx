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
import { AppHead } from '@components';
import { ArticlePriceHistoryModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS } from '@helpers';
//import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { articlePriceHistoriesRoutes as itemRoutes } from 'modules/ArticlePriceHistories/Static/articlePriceHistoriesRoutes';
import { Modal } from 'antd';
//import { ModeEnum } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const ArticlePriceHistoryPage: PageComponent = () => {
    const router = useRouter();
    //const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    //const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.price}`
        }
    ];

    const pageTitle = `${t('common:article-price-history')} ${data?.price}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        actionsComponent: null
    };
    // #endregion

    return (
        <>
            <AppHead title={pageTitle} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

ArticlePriceHistoryPage.layout = MainLayout;

export default ArticlePriceHistoryPage;
