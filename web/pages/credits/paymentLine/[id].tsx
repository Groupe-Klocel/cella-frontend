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
import { PaymentLineModelV2 as model } from 'models/PaymentLineModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { creditsRoutes as itemRoutes } from 'modules/Credits/Static/creditsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const CreditPaymentLineLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const creditDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.order_name}`,
            path: '/credits/' + data?.orderId
        }
    ];

    const breadCrumb = [
        ...creditDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:payment-line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.order_name} - ${t('common:payment-line')} ${data?.payment_name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        actionsComponent: undefined
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
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

CreditPaymentLineLinePage.layout = MainLayout;

export default CreditPaymentLineLinePage;
