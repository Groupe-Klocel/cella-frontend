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
import useTranslation from 'next-translate/useTranslation';
import styled from 'styled-components';
import { Alert, Layout } from 'antd';
import { useRouter } from 'next/router';
import { rolesRoutes } from '../Static/rolesRoutes';
import { AddRoleUserRoleForm } from '../Forms/AddRoleUserRoleForm';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    roleId: string | any;
    roleName: string | any;
}

const AddRoleUserRole = (props: ISingleItemProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();

    const roleDetailBreadCrumb = [
        ...rolesRoutes,
        {
            breadcrumbName: `${props.roleName}`,
            path: '/roles/' + props.roleId
        }
    ];
    const breadsCrumb = [
        ...roleDetailBreadCrumb,
        {
            breadcrumbName: t('add2', { name: t('common:warehouse-worker') })
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.UserRole);

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
                            title={t('add2', { name: t('common:warehouse-worker') })}
                            routes={breadsCrumb}
                            onBack={() => router.push('/roles/' + props?.roleId)}
                        />
                        <StyledPageContent>
                            <AddRoleUserRoleForm roleId={props.roleId} roleName={props.roleName} />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { AddRoleUserRole };
