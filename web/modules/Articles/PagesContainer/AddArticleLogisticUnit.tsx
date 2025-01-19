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
import { Alert, Form, Layout } from 'antd';
import { useRouter } from 'next/router';
import { articlesRoutes } from '../Static/articlesRoutes';
import { AddArticleLogisticUnitForm } from '../Forms/AddArticleLogisticUnitForm';
import { ModeEnum, Table } from 'generated/graphql';
import { getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    articleId: string | any;
    articleName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
}

const AddArticleLogisticUnit = (props: ISingleItemProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();

    const articleDetailBreadCrumb = [
        ...articlesRoutes,
        {
            breadcrumbName: `${props.articleName}`,
            path: '/articles/' + props.articleId
        }
    ];
    const breadsCrumb = [
        ...articleDetailBreadCrumb,
        {
            breadcrumbName: t('associate', { name: t('common:logistic-unit') })
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.ArticleLu);

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
                            title={t('associate', { name: t('common:logistic-unit') })}
                            routes={breadsCrumb}
                            onBack={() => router.push('/articles/' + props?.articleId)}
                        />
                        <StyledPageContent>
                            <AddArticleLogisticUnitForm
                                articleId={props.articleId}
                                articleName={props.articleName}
                                stockOwnerId={props.stockOwnerId}
                                stockOwnerName={props.stockOwnerName}
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

export { AddArticleLogisticUnit };
