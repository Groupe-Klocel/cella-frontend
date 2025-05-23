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
    GetArticleLuBarcodeByIdQuery,
    ModeEnum,
    Table,
    useGetArticleLuBarcodeByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { EditArticleBarcodeForm } from '../Forms/EditArticleBarcodeForm';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditArticleBarcodeProps {
    id: string | any;
    router: NextRouter;
}

const EditArticleBarcode: FC<IEditArticleBarcodeProps> = ({
    id,
    router
}: IEditArticleBarcodeProps) => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetArticleLuBarcodeByIdQuery<
        GetArticleLuBarcodeByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    const articleDetailBreadCrumb = [
        ...articlesRoutes,
        {
            breadcrumbName: `${data?.articleLuBarcode?.article.name}`,
            path: '/articles/' + data?.articleLuBarcode?.articleId
        }
    ];
    const breadsCrumb = [
        ...articleDetailBreadCrumb,
        {
            breadcrumbName: `${data?.articleLuBarcode?.barcode?.name}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const title =
        data?.articleLuBarcode?.article?.name + ' / ' + data?.articleLuBarcode?.barcode?.name;

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.ArticleLuBarcode);

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
                            onBack={() =>
                                router.push('/articles/barcode/' + data?.articleLuBarcode?.id)
                            }
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditArticleBarcodeForm
                                    barcodeId={data?.articleLuBarcode?.barcode?.id}
                                    articleId={data?.articleLuBarcode?.articleId}
                                    details={data?.articleLuBarcode?.barcode}
                                    articleLuBarcodeDetails={data?.articleLuBarcode}
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

EditArticleBarcode.displayName = 'EditArticleBarcode';

export { EditArticleBarcode };
