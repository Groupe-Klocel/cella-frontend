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
    GetPurchaseOrderLineByIdQuery,
    ModeEnum,
    Table,
    useGetPurchaseOrderLineByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { EditPurchaseOrderLineForm } from '../Forms/EditPurchaseOrderLineForm';
import { purchaseOrdersRoutes } from '../Static/purchaseOrdersRoutes';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditPurchaseOrderLineProps {
    id: string | any;
}

const EditPurchaseOrderLine: FC<IEditPurchaseOrderLineProps> = ({
    id
}: IEditPurchaseOrderLineProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetPurchaseOrderLineByIdQuery<
        GetPurchaseOrderLineByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    const purchaseOrderDetailBreadCrumb = [
        ...purchaseOrdersRoutes,
        {
            breadcrumbName: `${data?.purchaseOrderLine?.purchaseOrder?.name}`,
            path: '/purchase-orders/' + data?.purchaseOrderLine?.purchaseOrder?.id
        }
    ];
    const breadCrumb = [
        ...purchaseOrderDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.purchaseOrderLine?.lineNumber}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PurchaseOrderLine);

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
                            title={`${t('actions:edit')} ${t('common:purchase-order')} ${
                                data?.purchaseOrderLine?.purchaseOrder?.name
                            } - ${t('common:line')} ${data?.purchaseOrderLine?.lineNumber}`}
                            routes={breadCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditPurchaseOrderLineForm
                                    id={id}
                                    details={data?.purchaseOrderLine}
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

EditPurchaseOrderLine.displayName = 'EditPurchaseOrderLine';

export { EditPurchaseOrderLine };
