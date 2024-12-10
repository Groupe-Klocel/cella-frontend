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
import { ContentSpin } from '@components';
import { Alert, Layout } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import {
    GetPurchaseOrderByIdQuery,
    ModeEnum,
    Table,
    useGetPurchaseOrderByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { useAppState } from 'context/AppContext';
import { purchaseOrdersRoutes } from '../Static/purchaseOrdersRoutes';
import { EditPurchaseOrderForm } from '../Forms/EditPurchaseOrderForm';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditPurchaseOrderProps {
    id: string | any;
    router: NextRouter;
}

const EditPurchaseOrder: FC<EditPurchaseOrderProps> = ({ id, router }: EditPurchaseOrderProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { isLoading, data, error } = useGetPurchaseOrderByIdQuery<
        GetPurchaseOrderByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    const breadCrumb = [
        ...purchaseOrdersRoutes,
        {
            breadcrumbName: `${data?.purchaseOrder?.name}`
        }
    ];

    const pageTitle = `${t('common:purchase-order')} ${data?.purchaseOrder?.name}`;

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Order);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Update) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={`${pageTitle}`}
                            routes={breadCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {data ? (
                                <EditPurchaseOrderForm
                                    purchaseOrderId={id}
                                    details={data?.purchaseOrder}
                                />
                            ) : (
                                <ContentSpin />
                            )}
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

EditPurchaseOrder.displayName = 'EditPurchaseOrder';

export { EditPurchaseOrder };
