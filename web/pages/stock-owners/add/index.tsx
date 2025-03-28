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
import { AppHead, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { StockOwnerModelV2 } from 'models/StockOwnerModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import configs from '../../../../common/configs.json';

import { META_DEFAULTS } from '@helpers';
import { addStockOwnerRoutes } from 'modules/StockOwners/Static/stockOwnersRoutes';
import { AddStockOwner } from 'modules/StockOwners/PageContainer/AddStockOwner';

type PageComponent = FC & { layout: typeof MainLayout };

const AddStockOwnerPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = { status: configs.STOCK_OWNER_STATUS_IN_PROGRESS };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddStockOwner
                dataModel={StockOwnerModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-stock-owner')}
                        routes={addStockOwnerRoutes}
                        onBack={() => router.push(`/stock-owners`)}
                    />
                }
                routeAfterSuccess={`/stock-owners/:id`}
                routeOnCancel={`/stock-owners`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddStockOwnerPage.layout = MainLayout;

export default AddStockOwnerPage;
