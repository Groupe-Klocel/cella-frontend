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
import { ContentSpin, HeaderContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { Alert, Layout } from 'antd';
import { useRouter } from 'next/router';
import { warehouseWorkersRoutes } from '../Static/warehouseWorkersRoutes';
import { AddWarehouseWorkerCustomPermissionForm } from '../Forms/AddWarehouseWorkerCustomPermissionForm';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';
import { WarehouseWorkerCustomPermissionModelV2 } from '@helpers';
import { ModeEnum } from 'generated/graphql';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    id: string | any;
    username: string | any;
}

const AddWarehouseWorkerCustomPermission = (props: ISingleItemProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();

    const warehouseWorkerDetailBreadCrumb = [
        ...warehouseWorkersRoutes,
        {
            breadcrumbName: `${props.username}`,
            path: '/warehouse-workers/' + props.id
        }
    ];
    const breadsCrumb = [
        ...warehouseWorkerDetailBreadCrumb,
        {
            breadcrumbName: t('add2', { name: t('common:custom-permission') })
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(
        permissions,
        WarehouseWorkerCustomPermissionModelV2.tableName
    );

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Create) ? (
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
                            title={t('add2', { name: t('common:custom-permission') })}
                            routes={breadsCrumb}
                            onBack={() => router.push('/warehouse-workers/' + props?.id)}
                        />
                        <StyledPageContent>
                            <AddWarehouseWorkerCustomPermissionForm
                                id={props.id}
                                username={props.username}
                            />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { AddWarehouseWorkerCustomPermission };
