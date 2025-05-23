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
import { LinkButton, ScreenSpin, DetailsList, Page } from '@components';
import { Layout, Space } from 'antd';
import { articlesSubRoutes } from 'modules/Articles/Static/articlesRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { GetArticleByIdQuery, useGetArticleByIdQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';

// const StyledPageContent = styled(Layout.Content)`
// 	margin: 15px 30px ;
// 	padding: 20px
// `

export interface ISingleArticleProps {
    aId: string | any;
    router: NextRouter;
}

const SingleArticle: FC<ISingleArticleProps> = ({ aId, router }: ISingleArticleProps) => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetArticleByIdQuery<GetArticleByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: aId
        }
    );

    return (
        <>
            <HeaderContent title={`${t('common:article')} ${aId}`} />
            <Page>
                {data?.article && !isLoading ? (
                    <DetailsList details={data?.article} />
                ) : (
                    <ScreenSpin />
                )}
            </Page>
        </>
    );
};

SingleArticle.displayName = 'SingleArticle';

export { SingleArticle };
