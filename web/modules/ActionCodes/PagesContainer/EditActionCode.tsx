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
    GetParameterByIdQuery,
    ModeEnum,
    Table,
    useGetParameterByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { EditActionCodeForm } from '../Forms/EditActionCodeForm';
import { useAppState } from 'context/AppContext';
import { actionCodeRoutes } from '../Static/ActionCodeRoutes';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditActionCodeProps {
    id: string | any;
    router: NextRouter;
}

const EditActionCode: FC<EditActionCodeProps> = ({ id, router }: EditActionCodeProps) => {
    const { t } = useTranslation();

    const { globalLocale } = useAppState();
    const searchedLanguage = globalLocale == 'en-US' ? 'en' : globalLocale;

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetParameterByIdQuery<GetParameterByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: id
        }
    );

    if (globalLocale && data && data.parameter) {
        data.parameter.value = data?.parameter?.translation[searchedLanguage];
    }

    const breadsCrumb = [
        ...actionCodeRoutes,
        {
            breadcrumbName: `${data?.parameter?.value}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Parameter);

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
                            title={`${t('menu:action-code')}: ${data?.parameter?.value}`}
                            routes={breadsCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditActionCodeForm actionCodeId={id} details={data?.parameter} />
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

EditActionCode.displayName = 'EditActionCode';

export { EditActionCode };
