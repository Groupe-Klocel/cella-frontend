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
import { CustomerOrderAddressModelV2 as model } from 'models/CustomerOrderAddressModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { customerOrdersRoutes as itemRoutes } from 'modules/CustomerOrders/Static/customerOrdersRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const CustomerOrderAddressPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    // #region to customize information

    const customerOrderDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.order_name}`,
            path: '/customer-orders/' + data?.orderId
        }
    ];

    const breadCrumb = [
        ...customerOrderDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:customer-order-address')} ${data?.categoryText}`
        }
    ];

    const pageTitle = `${t('common:customer-order-address')} ${data?.categoryText}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
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
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                (data?.category == configs.THIRD_PARTY_ADDRESS_CATEGORY_DELIVERY ||
                    (data?.category == configs.THIRD_PARTY_ADDRESS_CATEGORY_INVOICE &&
                        data?.order_status <= configs.ORDER_STATUS_TO_INVOICE)) ? (
                    <Space>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/customer-orders/address/edit/${data?.id}`}
                            type="primary"
                        />
                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isDeletable ? (
                            <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </Space>
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
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

CustomerOrderAddressPage.layout = MainLayout;

export default CustomerOrderAddressPage;
