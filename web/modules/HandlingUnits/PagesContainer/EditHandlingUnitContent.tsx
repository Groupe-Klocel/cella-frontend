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
import { Alert, Form, Layout } from 'antd';
import { useRouter } from 'next/router';
import { handlingUnitContentsSubRoutes as itemRoutes } from '../Static/handlingUnitContentsRoutes';
import { EditHandlingUnitContentForm } from '../Forms/EditHandlingUnitContentForm';
import {
    GetHandlingUnitContentByIdQuery,
    ModeEnum,
    Table,
    useGetHandlingUnitContentByIdQuery
} from 'generated/graphql';
import { getModesFromPermissions, showError } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface EditHandlingUnitProps {
    id: string | any;
}

const EditHandlingUnitContent: FC<EditHandlingUnitProps> = ({ id }: EditHandlingUnitProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.HandlingUnitContent);

    const { isLoading, data, error } = useGetHandlingUnitContentByIdQuery<
        GetHandlingUnitContentByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.handlingUnitContent?.handlingUnit.name} - ${data?.handlingUnitContent?.article.name} x ${data?.handlingUnitContent?.quantity}`
        }
    ];

    const pageTitle = `${t('common:handling-unit-content')} ${
        data?.handlingUnitContent?.handlingUnit.name
    } - ${data?.handlingUnitContent?.article.name} x ${data?.handlingUnitContent?.quantity}`;

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
                            title={pageTitle}
                            routes={breadCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            <EditHandlingUnitContentForm details={data?.handlingUnitContent} />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { EditHandlingUnitContent };
