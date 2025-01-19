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
import { articlesRoutes } from 'modules/Articles/Static/articlesRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import {
    GetArticleLuByIdQuery,
    ModeEnum,
    Table,
    useGetArticleLuByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { EditArticleLogisticUnitForm } from '../Forms/EditArticleLogisticUnitForm';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditArticleLogisticUnitProps {
    id: string | any;
    router: NextRouter;
}

const EditArticleLogisticUnit: FC<IEditArticleLogisticUnitProps> = ({
    id,
    router
}: IEditArticleLogisticUnitProps) => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetArticleLuByIdQuery<GetArticleLuByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: id
        }
    );

    const articleDetailBreadCrumb = [
        ...articlesRoutes,
        {
            breadcrumbName: `${data?.articleLu?.article?.name}`,
            path: '/articles/' + data?.articleLu?.articleId
        }
    ];
    const breadsCrumb = [
        ...articleDetailBreadCrumb,
        {
            breadcrumbName: `${data?.articleLu?.name}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const title = data?.articleLu?.article?.name + ' / ' + data?.articleLu?.name;

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.ArticleLu);

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
                            title={`${t('actions:edit')} ${title}`}
                            routes={breadsCrumb}
                            onBack={() => router.push('/articles/lu/' + data?.articleLu?.id)}
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditArticleLogisticUnitForm details={data?.articleLu} />
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

EditArticleLogisticUnit.displayName = 'EditArticleLogisticUnit';

export { EditArticleLogisticUnit };
