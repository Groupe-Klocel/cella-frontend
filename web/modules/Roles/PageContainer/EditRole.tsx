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
import { ModeEnum, Table } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter, useRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, useDetail } from '@helpers';
import { useAppState } from 'context/AppContext';
import { rolesRoutes } from '../Static/rolesRoutes';
import { EditRoleForm } from '../Forms/EditRoleForm';
import { ModelType } from 'models/ModelsV2';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditRoleProps {
    id: string | any;
    dataModel: ModelType;
}

const EditRole: FC<IEditRoleProps> = ({ id, dataModel }: IEditRoleProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const breadsCrumb = [
        ...rolesRoutes,
        {
            breadcrumbName: `${name}`
        }
    ];

    const detailFields = Object.keys(dataModel.fieldsInfo).filter(
        (key) => dataModel.fieldsInfo[key].isDetailRequested
    );

    const { detail, reload: reloadData } = useDetail(id, dataModel.endpoints.detail, detailFields);

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Role);

    return (
        <>
            {permissions && !detail.isLoading ? (
                modes.includes(ModeEnum.Update) &&
                detail.data &&
                detail.data[dataModel.endpoints.detail].warehouseId ? (
                    <>
                        <HeaderContent
                            title={`${t('actions:edit')} ${
                                detail.data[dataModel.endpoints.detail].name
                            }`}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/roles/${id}`)}
                        />
                        <StyledPageContent>
                            {detail.data &&
                            !detail.isLoading &&
                            detail.data[dataModel.endpoints.detail] ? (
                                <EditRoleForm
                                    id={id}
                                    name={detail.data[dataModel.endpoints.detail].name}
                                    warehouseId={
                                        detail.data[dataModel.endpoints.detail].warehouseId
                                    }
                                />
                            ) : (
                                <ContentSpin />
                            )}
                        </StyledPageContent>
                    </>
                ) : (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

EditRole.displayName = 'EditRole';

export { EditRole };
