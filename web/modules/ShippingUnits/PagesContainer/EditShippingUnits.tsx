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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, useDetail } from '@helpers';
import { useAppState } from 'context/AppContext';
import { shippingUnitsRoutes } from 'modules/ShippingUnits/Static/shippingUnitsRoutes';
import { EditShippingUnitsForm } from '../Forms/EditShippingUnitsForm';
import { HandlingUnitOutboundModelV2 as model } from 'models/HandlingUnitOutboundModelV2';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditShippingUnitsProps {
    id: string | any;
    router: NextRouter;
}

const EditShippingUnits: FC<EditShippingUnitsProps> = ({ id, router }: EditShippingUnitsProps) => {
    const { t } = useTranslation();

    // #region extract data from modelV2
    const detailFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );

    const { detail, reload: reloadData } = useDetail(id, model.endpoints.detail, detailFields);

    useEffect(() => {
        reloadData();
    }, []);

    console.log('detail', detail);

    const breadcrumb = [
        ...shippingUnitsRoutes,
        {
            breadcrumbName: `${detail.data?.handlingUnitOutbound?.name !== null ? detail.data?.handlingUnitOutbound?.name : id}`
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.HandlingUnitOutbound);

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
                            title={`${t('common:shipping-unit')} ${detail.data?.handlingUnitOutbound?.name}`}
                            routes={breadcrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {detail.data ? (
                                <EditShippingUnitsForm
                                    shippingUnitId={id}
                                    details={detail.data?.handlingUnitOutbound}
                                    reload={reloadData}
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

EditShippingUnits.displayName = 'EditShippingUnits';

export { EditShippingUnits };
