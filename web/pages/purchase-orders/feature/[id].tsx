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
import { PurchaseOrderLineFeatureModelV2 as model } from 'models/PurchaseOrderLineFeatureModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { purchaseOrdersRoutes as itemRoutes } from 'modules/PurchaseOrders/Static/purchaseOrdersRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const PurchaseOrderLineFeaturePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    // #region to customize information
    const polDetailBreadcrumb = [
        ...itemRoutes,
        {
            path: `/purchase-orders/line/${data?.purchaseOrderLineId}`,
            breadcrumbName: `${data?.purchaseOrderLine_purchaseOrder_name} - ${data?.purchaseOrderLine_article_name} x ${data?.purchaseOrderLine_quantity}`
        }
    ];
    const breadCrumb = [
        ...polDetailBreadcrumb,
        {
            breadcrumbName: `${data?.featureCode_name} - ${data?.value}`
        }
    ];

    const pageTitle = `${t('common:purchase-order-line-feature')} ${data?.featureCode_name} - ${
        data?.value
    }`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: `/purchase-orders/line/${data?.purchaseOrderLineId}?poId=${data?.purchaseOrderLine_purchaseOrderId}`,
        actionsComponent: null
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
            />
        </>
    );
};

PurchaseOrderLineFeaturePage.layout = MainLayout;

export default PurchaseOrderLineFeaturePage;
