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
    GetEquipmentDetailByIdQuery,
    ModeEnum,
    Table,
    useGetEquipmentDetailByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { EditEquipmentDetailForm } from '../Forms/EditEquipmentDetailForm';
import { equipmentRoutes } from '../Static/equipmentRoutes';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditEquipmentDetailProps {
    id: string | any;
}

const EditEquipmentDetail: FC<IEditEquipmentDetailProps> = ({ id }: IEditEquipmentDetailProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetEquipmentDetailByIdQuery<
        GetEquipmentDetailByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    const equipmentDetailBreadCrumb = [
        ...equipmentRoutes,
        {
            breadcrumbName: `${data?.equipmentDetail?.equipment?.name}`,
            path: '/equipment/' + data?.equipmentDetail?.equipmentId
        }
    ];
    const breadCrumb = [
        ...equipmentDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.equipmentDetail?.handlingUnitModel?.name}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.EquipmentDetail);

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
                            title={`${t('actions:edit')} ${t('common:equipment')} ${
                                data?.equipmentDetail?.equipment?.name
                            } - ${data?.equipmentDetail?.handlingUnitModel?.name}`}
                            routes={breadCrumb}
                            onBack={() => router.push('/equipment/details/' + id)}
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditEquipmentDetailForm id={id} details={data?.equipmentDetail} />
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

EditEquipmentDetail.displayName = 'EditEquipmentDetail';

export { EditEquipmentDetail };
